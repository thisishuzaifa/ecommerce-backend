import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { cart, products, type Product } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";
import type { AuthUser } from "../middleware/auth";

type Variables = {
  user: AuthUser;
};

const cartRouter = new Hono<{ Variables: Variables }>();

const cartItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

// Protected routes
cartRouter.use("/*", authMiddleware);

cartRouter.post("/", async (c) => {
  const user = c.get("user") as AuthUser;
  
  try {
    const body = await c.req.json();
    const { productId, quantity } = cartItemSchema.parse(body);

    // Check if product exists and is active
    const product = await db.query.products.findFirst({
      where: and(
        eq(products.id, productId),
        eq(products.isActive, true)
      ),
    });

    if (!product) {
      throw new HTTPException(404, { message: "Product not found" });
    }

    // Check if product has enough stock
    if (product.stock < quantity) {
      throw new HTTPException(400, { message: "Insufficient stock" });
    }

    // Check if item already exists in cart
    const existingItem = await db.query.cart.findFirst({
      where: and(
        eq(cart.userId, user.id),
        eq(cart.productId, productId)
      ),
    });

    if (existingItem) {
      // Update quantity if item exists
      const [updatedItem] = await db.update(cart)
        .set({ 
          quantity,
          updatedAt: new Date()
        })
        .where(and(
          eq(cart.userId, user.id),
          eq(cart.productId, productId)
        ))
        .returning();
      
      return c.json(updatedItem);
    }

    // Create new cart item
    const [newItem] = await db.insert(cart)
      .values({
        userId: user.id,
        productId,
        quantity,
      })
      .returning();

    return c.json(newItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { message: error.errors[0].message });
    }
    throw error;
  }
});

type CartWithProduct = typeof cart.$inferSelect & {
  product: typeof products.$inferSelect;
};

cartRouter.get("/", async (c) => {
  const user = c.get("user") as AuthUser;

  const cartItems = await db.query.cart.findMany({
    where: eq(cart.userId, user.id),
    with: {
      product: true
    }
  }) as CartWithProduct[];

  const total = cartItems.reduce((sum, item) => {
    return sum + (Number(item.product.price) * item.quantity);
  }, 0);

  return c.json({
    items: cartItems,
    total: total.toFixed(2)
  });
});

cartRouter.put("/:productId", async (c) => {
  const user = c.get("user") as AuthUser;
  const productId = Number(c.req.param("productId"));
  
  try {
    const body = await c.req.json();
    const { quantity } = cartItemSchema.parse({ ...body, productId });

    // Check if product has enough stock
    const product = await db.query.products.findFirst({
      where: and(
        eq(products.id, productId),
        eq(products.isActive, true)
      ),
    });

    if (!product) {
      throw new HTTPException(404, { message: "Product not found" });
    }

    if (product.stock < quantity) {
      throw new HTTPException(400, { message: "Insufficient stock" });
    }

    const [updatedItem] = await db.update(cart)
      .set({ 
        quantity,
        updatedAt: new Date()
      })
      .where(and(
        eq(cart.userId, user.id),
        eq(cart.productId, productId)
      ))
      .returning();

    if (!updatedItem) {
      throw new HTTPException(404, { message: "Cart item not found" });
    }

    return c.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { message: error.errors[0].message });
    }
    throw error;
  }
});

cartRouter.delete("/:productId", async (c) => {
  const user = c.get("user") as AuthUser;
  const productId = Number(c.req.param("productId"));

  const result = await db.delete(cart)
    .where(and(
      eq(cart.userId, user.id),
      eq(cart.productId, productId)
    ))
    .returning();

  if (!result.length) {
    throw new HTTPException(404, { message: "Cart item not found" });
  }

  return c.json({ message: "Item removed from cart" });
});

cartRouter.delete("/", async (c) => {
  const user = c.get("user") as AuthUser;

  await db.delete(cart)
    .where(eq(cart.userId, user.id));

  return c.json({ message: "Cart cleared" });
});

export default cartRouter;
