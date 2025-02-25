import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { HTTPException } from "hono/http-exception";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orders";
import cartRoutes from "./routes/cart";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use("*", cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));

// Security headers middleware
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.header("Content-Security-Policy", "default-src 'self'");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
});

// Rate limiting middleware
const rateLimiter = new Map<string, number[]>();
app.use("*", async (c, next) => {
  const ip = c.req.header("x-forwarded-for") || "unknown";
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  const requestTimestamps = rateLimiter.get(ip) || [];
  const recentRequests = requestTimestamps.filter((timestamp: number) => timestamp > windowStart);
  
  if (recentRequests.length >= 100) { // 100 requests per minute
    return c.json({ error: "Too many requests" }, 429);
  }
  
  recentRequests.push(now);
  rateLimiter.set(ip, recentRequests);
  
  return await next();
});

// Error handling
app.onError((err, c) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  
  if (err instanceof HTTPException) {
    return c.json({
      message: err.message,
      status: err.status,
    }, err.status);
  }

  return c.json({
    message: "Internal Server Error",
    status: 500,
  }, 500);
});

// Health check
app.get("/", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Routes
app.route("/api/auth", authRoutes);
app.route("/api/products", productRoutes);
app.route("/api/orders", orderRoutes);
app.route("/api/cart", cartRoutes);

// Start server
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
console.log(`Server is starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});
