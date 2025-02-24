import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { orders, orderItems, products } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";
import { sendEmail, emailTemplates } from "../services/email";
import type { AuthUser } from "../middleware/auth";

const ordersRouter = new Hono();

const shippingAddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string(),
});

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema),
  shippingAddress: shippingAddressSchema,
});

// Protected routes
ordersRouter.use("/*", authMiddleware);

ordersRouter.post("/", async (c) => {
  const user = c.get("user") as AuthUser;
  
  try {
    const body = await c.req.json();
    const { items, shippingAddress } = createOrderSchema.parse(body);

    // Validate products and calculate total
    let total = 0;
    const productIds = items.map(item => item.productId);
    
    const availableProducts = await db.select()
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          sql`${products.id} IN (${productIds.join(',')})`
        )
      );

    if (availableProducts.length !== items.length) {
      throw new HTTPException(400, { message: "One or more products are unavailable" });
    }

    // Check stock and calculate total
    const productMap = new Map(availableProducts.map(p => [p.id, p]));
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      if (product.stock < item.quantity) {
        throw new HTTPException(400, { message: `Insufficient stock for product: ${product.name}` });
      }

      total += Number(product.price) * item.quantity;
    }

    // Create order and order items
    const [order] = await db.insert(orders)
      .values({
        userId: user.id,
        total: total.toFixed(2),
        shippingAddress,
      })
      .returning();

    // Create order items and update stock
    for (const item of items) {
      const product = productMap.get(item.productId)!;
      
      await Promise.all([
        // Create order item
        db.insert(orderItems)
          .values({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: product.price,
          }),
        
        // Update product stock
        db.update(products)
          .set({ 
            stock: sql`${products.stock} - ${item.quantity}`,
            updatedAt: new Date()
          })
          .where(eq(products.id, item.productId))
      ]);
    }

    // Send order confirmation email
    await sendEmail({
      to: user.email,
      ...emailTemplates.orderConfirmation(order.id, total)
    });

    return c.json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { message: error.errors[0].message });
    }
    throw error;
  }
});

ordersRouter.get("/", async (c) => {
  const user = c.get("user") as AuthUser;
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 10;
  const offset = (page - 1) * limit;

  const [totalCount] = await db
    .select({ count: sql<number>`count(${orders.id})` })
    .from(orders)
    .where(eq(orders.userId, user.id));

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    items: userOrders,
    page,
    limit,
    totalPages: Math.ceil(totalCount.count / limit),
    totalCount: totalCount.count,
  });
});

ordersRouter.get("/:id", async (c) => {
  const user = c.get("user") as AuthUser;
  const orderId = c.req.param("id");

  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, orderId),
      eq(orders.userId, user.id)
    ),
    with: {
      items: {
        with: {
          product: true
        }
      }
    }
  });

  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }

  return c.json(order);
});

export default ordersRouter;
