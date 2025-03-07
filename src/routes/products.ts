import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { products } from "../db/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";
import { deleteImage } from "../services/storage";

const productsRouter = new Hono();

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive().transform(val => val.toFixed(2)),
  stock: z.number().int().min(0),
  category: z.string().min(1),
  images: z.array(z.string().url()).optional(),
});

// Public routes
productsRouter.get("/", async (c) => {
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 10;
  const sortField = c.req.query("sort") || "created_at";
  const order = c.req.query("order") || "desc";
  const category = c.req.query("category");
  const search = c.req.query("search");

  const offset = (page - 1) * limit;

  const conditions = sql.join([
    eq(products.isActive, true),
    category ? eq(products.category, category) : undefined,
    search ? sql`${products.name} ILIKE ${`%${search}%`}` : undefined,
  ].filter(Boolean), sql` AND `);

  const orderBy = sql`${sql.identifier(sortField)} ${sql.raw(order.toUpperCase())}`;

  const [totalCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(conditions);

  const items = await db
    .select()
    .from(products)
    .where(conditions)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return c.json({
    items,
    page,
    limit,
    totalPages: Math.ceil(totalCount.count / limit),
    totalCount: totalCount.count,
  });
});

productsRouter.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  
  const product = await db.query.products.findFirst({
    where: and(
      eq(products.id, id),
      eq(products.isActive, true)
    ),
  });

  if (!product) {
    throw new HTTPException(404, { message: "Product not found" });
  }

  return c.json(product);
});

// Protected admin routes
productsRouter.use("/admin/*", authMiddleware, adminMiddleware);

productsRouter.post("/admin", async (c) => {
  try {
    const body = await c.req.json();
    const productData = productSchema.parse(body);

    const [product] = await db.insert(products)
      .values({
        ...productData,
        isActive: true,
      })
      .returning();

    return c.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { message: error.errors[0].message });
    }
    throw error;
  }
});

productsRouter.put("/admin/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    const productData = productSchema.partial().parse(body);

    // Get the existing product to handle image updates
    const existingProduct = await db.query.products.findFirst({
      where: eq(products.id, id),
    });

    if (!existingProduct) {
      throw new HTTPException(404, { message: "Product not found" });
    }

    // Handle image deletion for removed images
    if (productData.images && existingProduct.images) {
      const oldImages = existingProduct.images as string[];
      const newImages = productData.images as string[];
      
      // Find images that were removed
      const removedImages = oldImages.filter(img => !newImages.includes(img));
      
      // Delete removed images from storage
      for (const imageUrl of removedImages) {
        try {
          await deleteImage(imageUrl);
        } catch (error) {
          console.error(`Failed to delete image ${imageUrl}:`, error);
          // Continue with the update even if image deletion fails
        }
      }
    }

    const [product] = await db.update(products)
      .set({ 
        ...productData,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    return c.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { message: error.errors[0].message });
    }
    throw error;
  }
});

productsRouter.delete("/admin/:id", async (c) => {
  const id = Number(c.req.param("id"));

  // Get the product to delete its images
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
  });

  if (!product) {
    throw new HTTPException(404, { message: "Product not found" });
  }

  // Delete all product images from storage
  if (product.images && Array.isArray(product.images)) {
    for (const imageUrl of product.images) {
      try {
        await deleteImage(imageUrl);
      } catch (error) {
        console.error(`Failed to delete image ${imageUrl}:`, error);
        // Continue with the deletion even if image deletion fails
      }
    }
  }

  // Soft delete the product
  const [deletedProduct] = await db.update(products)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();

  return c.json({ message: "Product deleted successfully" });
});

export default productsRouter;
