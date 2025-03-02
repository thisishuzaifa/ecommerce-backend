import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import request from 'supertest';
import { ordersRouter } from '../routes/orders';
import { getAuthHeader } from './helpers';

describe('Orders API', () => {
  let app: Hono;
  let server: any;
  let pool: Pool;

  beforeAll(async () => {
    // Initialize your test database connection
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL
    });
    
    // Create a new Hono app instance for testing
    app = new Hono();
    app.route('/api/orders', ordersRouter);
    
    // Create test server
    const listener = serve({ fetch: app.fetch, port: 0 });
    server = app.fetch;
  });

  afterAll(async () => {
    // Close connections after tests
    await pool.end();
  });

  // Test GET /api/orders
  it('should return 401 without authentication', async () => {
    const response = await request(server)
      .get('/api/orders');
    expect(response.status).toBe(401);
  });

  it('should get orders with authentication', async () => {
    const response = await request(server)
      .get('/api/orders')
      .set(getAuthHeader());

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('items');
    expect(Array.isArray(response.body.items)).toBe(true);
  });

  // Test POST /api/orders
  it('should return 401 when creating order without authentication', async () => {
    const orderData = {
      items: [
        { productId: 1, quantity: 2 }
      ],
      shippingAddress: {
        street: "123 Test St",
        city: "Test City",
        state: "Test State",
        zipCode: "12345",
        country: "Test Country"
      }
    };

    const response = await request(server)
      .post('/api/orders')
      .send(orderData);

    expect(response.status).toBe(401);
  });

  it('should validate order input with authentication', async () => {
    const invalidOrderData = {
      items: [
        { productId: -1, quantity: 0 }  // Invalid productId and quantity
      ],
      shippingAddress: {
        // Missing required fields
        street: "123 Test St"
      }
    };

    const response = await request(server)
      .post('/api/orders')
      .set(getAuthHeader())
      .send(invalidOrderData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });

  it('should handle non-existent products with authentication', async () => {
    const orderData = {
      items: [
        { productId: 99999, quantity: 1 }  // Non-existent product
      ],
      shippingAddress: {
        street: "123 Test St",
        city: "Test City",
        state: "Test State",
        zipCode: "12345",
        country: "Test Country"
      }
    };

    const response = await request(server)
      .post('/api/orders')
      .set(getAuthHeader())
      .send(orderData);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("One or more products not found");
  });
});
