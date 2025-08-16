# 🚀 Universal Blog Publisher Backend Setup Guide

This guide will walk you through setting up the Universal Blog Publisher backend, which supports publishing to **67+ website builders and CMS platforms**.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **PostgreSQL** 12.0 or higher (or SQLite for development)
- **Git** for version control

## 🏗️ Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd universal-blog-publisher/backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/blog_publisher"
# For development, you can use SQLite:
# DATABASE_URL="file:./dev.db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Server Configuration
PORT=3001
NODE_ENV="development"

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"
ALLOWED_IMAGE_TYPES="image/jpeg,image/png,image/gif,image/webp"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN="http://localhost:3000,http://localhost:19006"
```

### 4. Database Setup

#### Option A: PostgreSQL (Recommended for Production)

1. Create a PostgreSQL database:
```sql
CREATE DATABASE blog_publisher;
CREATE USER blog_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE blog_publisher TO blog_user;
```

2. Update your `.env` file with the database credentials.

#### Option B: SQLite (Development Only)

For development, you can use SQLite by setting:
```bash
DATABASE_URL="file:./dev.db"
```

### 5. Database Migration

Generate and run the database migrations:

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the database with providers
npm run db:seed
```

### 6. Create Upload Directory

```bash
mkdir -p uploads/images
```

## 🧪 Testing the Setup

### 1. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server should start on `http://localhost:3001`

### 2. Health Check

Test the server is running:

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

### 3. Test API Endpoints

Use the provided Postman collection or test with curl:

```bash
# Get all providers
curl http://localhost:3001/api/providers

# Create a test user
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

## 🔌 Provider Configuration

The system comes pre-configured with 67+ providers. Each provider has specific authentication requirements:

### Authentication Types

- **API Key**: Simple API key authentication (WordPress, Shopify, etc.)
- **OAuth**: OAuth 2.0 flow (Medium, Notion, etc.)
- **FTP**: File transfer protocol (for static sites)
- **Custom**: Special authentication methods (Git-based platforms)

### Provider Categories

- **Website Builders**: Wix, Squarespace, Webflow, etc.
- **CMS Platforms**: WordPress, Ghost, Contentful, etc.
- **E-commerce**: Shopify, BigCommerce, WooCommerce, etc.
- **Static Generators**: Hugo, Jekyll, Gatsby, etc.
- **Other**: Notion, custom platforms, etc.

## 📱 Mobile App Integration

The backend is designed to work with the Universal Blog Publisher mobile app. Ensure your mobile app is configured with:

- **API Base URL**: `http://localhost:3001` (development)
- **Authentication**: JWT token-based
- **CORS**: Configured for mobile app origins

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with 12 salt rounds
- **Rate Limiting**: Configurable request limits
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Cross-origin request protection
- **Helmet**: Security headers middleware

## 📊 Database Schema

The system uses the following main entities:

- **Users**: Authentication and user management
- **Providers**: Platform integrations (67+ supported)
- **Connections**: User connections to platforms
- **Drafts**: Blog post drafts
- **Posts**: Published posts across platforms
- **Images**: Uploaded media management
- **PublishJobs**: Publishing workflow tracking

## 🚀 Production Deployment

### 1. Environment Variables

Update `.env` for production:

```bash
NODE_ENV="production"
JWT_SECRET="very-long-random-secret-key"
DATABASE_URL="postgresql://prod_user:prod_password@prod_host:5432/blog_publisher"
CORS_ORIGIN="https://yourdomain.com"
```

### 2. Process Management

Use PM2 or similar process manager:

```bash
npm install -g pm2
pm2 start server.js --name "blog-publisher"
pm2 startup
pm2 save
```

### 3. Reverse Proxy

Configure Nginx or Apache as a reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. SSL Certificate

Use Let's Encrypt or your preferred SSL provider:

```bash
sudo certbot --nginx -d yourdomain.com
```

## 🧪 Testing

### API Testing

Use the provided Postman collection:
1. Import `docs/Universal_Blog_Publisher_API.postman_collection.json`
2. Set the `baseUrl` variable to your server URL
3. Run the authentication flow first
4. Test all endpoints systematically

### Unit Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Integration Testing

```bash
# Test database operations
npm run db:test

# Test provider integrations
npm run test:providers
```

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL service is running
   - Verify database credentials in `.env`
   - Ensure database exists

2. **JWT Token Issues**
   - Verify `JWT_SECRET` is set
   - Check token expiration settings
   - Ensure proper Authorization header format

3. **CORS Errors**
   - Verify `CORS_ORIGIN` includes your frontend URL
   - Check browser console for specific CORS errors

4. **File Upload Issues**
   - Ensure `uploads` directory exists and is writable
   - Check file size limits in `.env`
   - Verify allowed file types

### Logs

Check server logs for detailed error information:

```bash
# Development logs
npm run dev

# Production logs
pm2 logs blog-publisher
```

## 📚 Additional Resources

- **API Documentation**: See the Postman collection for endpoint details
- **Provider Guides**: Each provider has specific setup requirements
- **Database Schema**: Check `prisma/schema.prisma` for detailed schema
- **Error Codes**: See `src/middleware/errorHandler.js` for error definitions

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for error details
3. Verify all environment variables are set correctly
4. Ensure database migrations have run successfully

## 🎉 Next Steps

Once the backend is running:

1. **Test the API endpoints** using the Postman collection
2. **Configure your mobile app** to connect to the backend
3. **Set up provider connections** for your target platforms
4. **Start publishing content** across multiple platforms!

---

**Happy Publishing!** 🚀