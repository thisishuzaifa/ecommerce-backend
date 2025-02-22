import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { auth } from './utils/auth';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

// Health check route
app.get('/', (c) => c.json({ status: 'ok' }));

app.onError((err, c) => {
  console.error(`${err.message}`, err)
  return c.json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message
  }, 500)
})

// Start server
const port = process.env.PORT || 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port: Number(port),
});
