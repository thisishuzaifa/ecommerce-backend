import { Hono } from "hono";
import { sign } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { z } from "zod";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, emailTemplates } from "../services/email";
import { HTTPException } from "hono/http-exception";

const auth = new Hono();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

auth.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = registerSchema.parse(body);

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new HTTPException(400, { message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [user] = await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
    }).returning();

    // Send welcome email
    await sendEmail({
      to: email,
      ...emailTemplates.welcomeEmail(name),
    });

    // Generate JWT
    const token = sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return c.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { message: error.errors[0].message });
    }
    throw error;
  }
});

auth.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = loginSchema.parse(body);

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw new HTTPException(401, { message: "Invalid credentials" });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new HTTPException(401, { message: "Invalid credentials" });
    }

    // Generate JWT
    const token = sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return c.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HTTPException(400, { message: error.errors[0].message });
    }
    throw error;
  }
});

export default auth;
