import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey().autoIncrement(),
  email: text("email").unique().notNull(),
  password: text("password"),  // Make nullable for social login
  name: text("name").notNull(),
  role: text("role").default("customer"), // can be 'admin' or 'customer'
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
  provider: text("provider").default("email"),
  providerId: text("provider_id"),
  createdAt: integer("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

type CategoriesTable = typeof categories;
export const categories: CategoriesTable = sqliteTable("categories", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  parentId: integer("parent_id").references(() => categories.id),
});

export const productCategories = sqliteTable("product_categories", {
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("pending"),
  totalAmount: real("total_amount").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  billingAddress: text("billing_address").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  priceAtTime: real("price_at_time").notNull(),
});
