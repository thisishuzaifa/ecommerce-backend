import { Context } from "hono";
import { verify } from "jsonwebtoken";
import { HTTPException } from "hono/http-exception";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthUser {
  id: number;
  email: string;
  role: string;
}

export async function authMiddleware(c: Context, next: () => Promise<void>) {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      throw new HTTPException(401, { message: "No token provided" });
    }

    const decoded = verify(token, JWT_SECRET) as AuthUser;
    c.set("user", decoded);
    
    await next();
  } catch (error) {
    throw new HTTPException(401, { message: "Invalid or expired token" });
  }
}

export async function adminMiddleware(c: Context, next: () => Promise<void>) {
  const user = c.get("user") as AuthUser;
  
  if (user.role !== "admin") {
    throw new HTTPException(403, { message: "Admin access required" });
  }
  
  await next();
}
