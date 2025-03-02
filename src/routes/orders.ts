import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { orders, orderItems, products } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";
import { sendEmail, emailTemplates } from "../services/email";
import type { AuthUser } from "../middleware/auth";
import type { Context, Next } from "hono";

type Variables = {
  user: AuthUser;
  validatedBody: CreateOrderInput;
};

type JSONResponse = {
  items?: unknown[];
  order?: unknown;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  totalCount?: number;
};

interface CacheEntry {
  data: JSONResponse;
  timestamp: number;
}

const ordersRouter = new Hono<{ Variables: Variables }>();

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

type CreateOrderInput = z.infer<typeof createOrderSchema>;

// Protected routes
ordersRouter.use("/*", authMiddleware);

// Input validation middleware
const validateInput = async (c: Context<{ Variables: Variables }>, next: Next) => {
  try {
    if (c.req.method === "POST") {
      const body = await c.req.json();
      const validatedData = createOrderSchema.parse(body);
      c.set('validatedBody', validatedData);
    }
    return await next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { 
        message: `Invalid input data: ${error.errors[0].message}` 
      });
    }
    throw new HTTPException(400, { message: "Invalid input data" });
  }
};

ordersRouter.use("/*", validateInput);

// Cache middleware for GET requests
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 300000; // 5 minutes

const cacheMiddleware = async (c: Context<{ Variables: Variables }>, next: Next) => {
  if (c.req.method !== "GET") return await next();
  
  const key = `${c.req.url}-${c.get("user").id}`;
  const cached = cache.get(key);
  
  if (cached && cached.timestamp > Date.now() - CACHE_TTL) {
    return c.json(cached.data);
  }
  
  await next();

  if (c.res.status === 200) {
    const data = await c.res.json() as JSONResponse;
    cache.set(key, { 
      data, 
      timestamp: Date.now() 
    });
  }
};

ordersRouter.use("/*", cacheMiddleware);

ordersRouter.post("/", async (c) => {
  const user = c.get("user");
  
  try {
    const { items, shippingAddress } = c.get('validatedBody') as CreateOrderInput;

    // Start a database transaction
    return await db.transaction(async (tx) => {
      // Convert productIds to a proper SQL array
      const productIds = items.map(item => item.productId);
      
      const availableProducts = await tx.select()
        .from(products)
        .where(sql`${products.id} = ANY(ARRAY[${productIds.join(',')}]::int[])`);

      if (availableProducts.length !== productIds.length) {
        throw new HTTPException(400, { message: "One or more products not found" });
      }

      // Create a Map for O(1) product lookups
      const productMap = new Map(availableProducts.map(p => [p.id, p]));

      // Validate stock and calculate total in one pass
      let total = 0;
      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product || product.stock < item.quantity) {
          throw new HTTPException(400, { message: "Insufficient stock" });
        }
        total += Number(product.price) * item.quantity;
      }

      // Create order
      const [order] = await tx.insert(orders)
        .values([{
          userId: user.id,
          total: total.toString(),
          status: "pending",
          shippingAddress: shippingAddress,
        }])
        .returning();

      // Create order items and update stock in parallel
      await Promise.all([
        tx.insert(orderItems).values(
          items.map(item => ({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: productMap.get(item.productId)!.price.toString(),
          }))
        ),
        ...items.map(item =>
          tx.update(products)
            .set({ stock: sql`${products.stock} - ${item.quantity}` })
            .where(eq(products.id, item.productId))
        )
      ]);

      // Send order confirmation email
      await sendEmail({
        to: user.email,
        ...emailTemplates.orderConfirmation(order.id, total)
      });

      return c.json({ order }, 201);
    });
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('Order creation error:', error);
    throw new HTTPException(500, { message: "Failed to create order" });
  }
});

ordersRouter.get("/", async (c) => {
  const user = c.get("user");
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
  const user = c.get("user");
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

export { ordersRouter };
