# E-commerce Backend API

A modern e-commerce backend built with HonoJS, DrizzleORM, and PostgreSQL. Features include user authentication, product management, shopping cart, and order processing with email notifications.

## Tech Stack

- **Framework**: [HonoJS](https://hono.dev/) - Fast, Lightweight, Web Standards
- **Database**: PostgreSQL with [DrizzleORM](https://orm.drizzle.team/)
- **Authentication**: JWT (JSON Web Tokens)
- **Email Service**: SendGrid
- **Validation**: Zod
- **TypeScript**: For type safety and better developer experience

## Features

- 🔐 User Authentication (Register/Login)
- 📦 Product Management
- 🛒 Shopping Cart
- 📋 Order Processing
- 📧 Email Notifications
- 👮‍♂️ Role-based Access Control (Admin/Customer)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- SendGrid account for email notifications

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ecommerce-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   DATABASE_URL=postgres://user:password@localhost:5432/ecommerce
   JWT_SECRET=your_jwt_secret_here
   SENDGRID_API_KEY=your_sendgrid_api_key
   SMTP_FROM_EMAIL=your_verified_sender_email
   PORT=3000
   NODE_ENV=development
   ```

4. Set up the database:
   ```bash
   # Generate migration
   npm run generate
   
   # Apply migration
   npm run migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Products
- `GET /api/products` - List products (with pagination, sorting, and filtering)
- `GET /api/products/:id` - Get product details
- `POST /api/products/admin` - Create product (Admin only)
- `PUT /api/products/admin/:id` - Update product (Admin only)
- `DELETE /api/products/admin/:id` - Delete product (Admin only)

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:productId` - Update cart item quantity
- `DELETE /api/cart/:productId` - Remove item from cart
- `DELETE /api/cart` - Clear cart

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - List user's orders
- `GET /api/orders/:id` - Get order details

## Error Handling

The API uses standard HTTP status codes and returns errors in the following format:
```json
{
  "message": "Error message here",
  "status": 400
}
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run generate` - Generate database migrations
- `npm run migrate` - Apply database migrations
- `npm run format` - Format code with Prettier

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC
