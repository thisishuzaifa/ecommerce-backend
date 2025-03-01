import { db } from "./index";
import { products, users } from "./schema";
import bcrypt from "bcrypt";

async function seed() {
  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const adminUser = await db.insert(users).values({
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
      role: "admin",
    }).returning();
    console.log("Admin user created:", adminUser);

    // Create some test products
    const testProducts = await db.insert(products).values([
      {
        name: "Gaming Laptop",
        description: "High-performance gaming laptop with RTX 3080",
        price: "1299.99",
        stock: 10,
        category: "Electronics",
        image: "https://example.com/gaming-laptop.jpg",
        isActive: true,
      },
      {
        name: "Wireless Headphones",
        description: "Noise-cancelling Bluetooth headphones",
        price: "199.99",
        stock: 20,
        category: "Electronics",
        image: "https://example.com/headphones.jpg",
        isActive: true,
      },
      {
        name: "Mechanical Keyboard",
        description: "RGB mechanical gaming keyboard",
        price: "129.99",
        stock: 15,
        category: "Electronics",
        image: "https://example.com/keyboard.jpg",
        isActive: true,
      }
    ]).returning();
    console.log("Test products created:", testProducts);

    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    process.exit(0);
  }
}

seed();
