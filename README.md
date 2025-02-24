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


## License

ISC

## Frontend Integration Guide

### Setting Up Frontend with React

1. Create your React project in a separate directory:
   ```bash
   npx create-react-app ecommerce-frontend
   cd ecommerce-frontend
   ```

2. Configure API Base URL in your React app:
   ```javascript
   // src/config.js
   export const API_BASE_URL = process.env.NODE_ENV === 'production' 
     ? 'http://your-domain.com/api' 
     : 'http://localhost:3000/api';
   ```

3. Example API service setup:
   ```javascript
   // src/services/api.js
   import { API_BASE_URL } from '../config';

   export const api = {
     async get(endpoint) {
       const response = await fetch(`${API_BASE_URL}${endpoint}`, {
         headers: {
           'Authorization': `Bearer ${localStorage.getItem('token')}`,
         },
       });
       return response.json();
     },

     async post(endpoint, data) {
       const response = await fetch(`${API_BASE_URL}${endpoint}`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${localStorage.getItem('token')}`,
         },
         body: JSON.stringify(data),
       });
       return response.json();
     },
     // Add other methods (PUT, DELETE) as needed
   };
   ```

### Production Deployment (Linux VPS)

1. Build your React frontend:
   ```bash
   cd ecommerce-frontend
   npm run build
   ```

2. Install Nginx if not already installed:
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

3. Create Nginx configuration:
   ```bash
   sudo nano /etc/nginx/sites-available/ecommerce
   ```

   Add this configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       # Frontend
       location / {
           root /var/www/ecommerce-frontend/build;
           try_files $uri $uri/ /index.html;
       }

       # Backend API
       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/ecommerce /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. Deploy frontend build:
   ```bash
   sudo mkdir -p /var/www/ecommerce-frontend
   sudo cp -r build/* /var/www/ecommerce-frontend/
   ```

6. Set up PM2 for backend (keeps Node.js running):
   ```bash
   sudo npm install -g pm2
   cd /path/to/backend
   pm2 start npm --name "ecommerce-backend" -- run start
   pm2 startup
   pm2 save
   ```

### Example Frontend Usage

```javascript
// Example: Fetching products
import { api } from '../services/api';

const ProductList = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await api.get('/products');
        setProducts(data);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    };
    fetchProducts();
  }, []);

  return (
    // Your JSX here
  );
};
```

### Common Issues & Solutions

1. **CORS Errors**: If you see CORS errors during development, ensure your backend has CORS enabled for your frontend domain.

2. **API 404 Errors**: Check if your API_BASE_URL is correctly configured and Nginx location blocks are properly set up.

3. **Authentication Issues**: Ensure your JWT token is being properly stored and sent in the Authorization header.

4. **Build not Updating**: Clear your browser cache or add a version query parameter to your assets.

### Development Tips

- Use environment variables for different API URLs in development and production
- Implement a loading state while waiting for API responses
- Add error handling for failed API requests
- Use React Query or SWR for efficient data fetching and caching
