# 🖥️ Universal Blog Publisher - Backend

Node.js Express backend with Prisma ORM supporting 67+ CMS and website builder integrations.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Setup environment**:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/universal_blog_publisher"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
ENCRYPTION_KEY="your-32-character-encryption-key-change-this"
```

3. **Setup database**:
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio
npm run prisma:studio
```

4. **Start development server**:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/         # Route controllers
│   ├── middleware/         # Express middleware
│   │   └── auth.ts        # JWT authentication
│   ├── providers/         # CMS adapter system
│   │   ├── base.ts       # Base adapter class
│   │   ├── wordpress.ts  # WordPress adapter
│   │   ├── medium.ts     # Medium adapter
│   │   ├── ghost.ts      # Ghost adapter
│   │   └── index.ts      # Provider registry
│   ├── routes/           # API routes
│   │   ├── auth.ts      # Authentication routes
│   │   ├── connections.ts # Connection management
│   │   ├── drafts.ts    # Draft management
│   │   ├── providers.ts # Provider listing
│   │   └── publish.ts   # Publishing routes
│   ├── services/        # Business logic
│   │   ├── auth.ts     # Authentication service
│   │   └── connection.ts # Connection service
│   ├── types/          # TypeScript definitions
│   ├── utils/          # Utility functions
│   │   └── encryption.ts # Credential encryption
│   └── index.ts        # Main application
├── prisma/
│   └── schema.prisma   # Database schema
├── .env.example        # Environment template
└── package.json        # Dependencies
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `JWT_EXPIRES_IN` | JWT expiration time | No | `7d` |
| `ENCRYPTION_KEY` | 32-char encryption key | Yes | - |
| `PORT` | Server port | No | `3000` |
| `NODE_ENV` | Environment | No | `development` |
| `CORS_ORIGIN` | Allowed origins | No | `http://localhost:8081` |

### Database Configuration

The application uses PostgreSQL with Prisma ORM. The schema includes:

- **Users**: User accounts with authentication
- **Connections**: Provider connections with encrypted credentials
- **Drafts**: Blog post drafts
- **Posts**: Published posts with metadata
- **ApiKeys**: API key management

## 🔌 Provider System

The backend uses a flexible adapter pattern to support multiple CMS platforms:

### Base Adapter Interface

```typescript
interface CMSAdapter {
  id: string;
  name: string;
  description: string;
  website: string;
  
  verifyConnection(auth: ProviderCredentials): Promise<{ ok: boolean; details?: any; error?: string }>;
  listPosts(auth: ProviderCredentials, opts?: { page?: number; limit?: number }): Promise<ExternalPost[]>;
  createPost(auth: ProviderCredentials, input: PublishInput): Promise<PublishResult>;
  updatePost(auth: ProviderCredentials, postId: string, input: PublishInput): Promise<PublishResult>;
  deletePost(auth: ProviderCredentials, postId: string): Promise<{ ok: boolean; error?: string }>;
  
  uploadImage?(auth: ProviderCredentials, file: Buffer, filename: string): Promise<{ url: string; id?: string }>;
  
  supports: {
    images: boolean;
    tags: boolean;
    categories: boolean;
    scheduling: boolean;
    drafts: boolean;
    edit: boolean;
    delete: boolean;
    excerpt: boolean;
    featuredImage: boolean;
  };
  
  authFields: AuthField[];
}
```

### Implemented Providers

- **WordPress**: WordPress.com and self-hosted WordPress
- **Medium**: Medium publishing platform
- **Ghost**: Ghost CMS
- **Blogger**: Google Blogger
- **Tumblr**: Tumblr blogging platform
- **Contentful**: Headless CMS

### Adding New Providers

1. Create a new adapter file in `src/providers/`
2. Extend `BaseCMSAdapter`
3. Implement required methods
4. Add to provider registry in `src/providers/index.ts`

Example:
```typescript
export class NewProviderAdapter extends BaseCMSAdapter {
  id = 'newprovider';
  name = 'New Provider';
  // ... implementation
}
```

## 🔐 Security Features

### Authentication
- JWT tokens with configurable expiration
- bcrypt password hashing
- Secure token refresh mechanism

### Data Protection
- AES-256-GCM encryption for provider credentials
- Input validation and sanitization
- Rate limiting protection
- CORS configuration

### API Security
- Request validation with express-validator
- Helmet.js security headers
- Error handling without information leakage

## 📋 API Documentation

### Authentication Endpoints

#### POST /api/auth/signup
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "name": "..." },
    "token": "jwt_token_here"
  }
}
```

#### POST /api/auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Provider Endpoints

#### GET /api/providers
List all available CMS providers.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "wordpress",
      "name": "WordPress",
      "description": "...",
      "supports": { "images": true, "tags": true, ... },
      "authFields": [...]
    }
  ]
}
```

### Connection Endpoints

#### POST /api/connections
Create a new provider connection.

**Request Body:**
```json
{
  "providerId": "wordpress",
  "name": "My WordPress Site",
  "credentials": {
    "siteUrl": "https://mysite.wordpress.com",
    "username": "myusername",
    "password": "app_password"
  }
}
```

### Publishing Endpoints

#### POST /api/publish
Publish a draft to a single connection.

**Request Body:**
```json
{
  "draftId": "draft_id",
  "connectionId": "connection_id",
  "publishAt": "2024-01-01T12:00:00Z"
}
```

#### POST /api/publish/multi
Publish a draft to multiple connections.

**Request Body:**
```json
{
  "draftId": "draft_id",
  "connectionIds": ["conn1", "conn2", "conn3"],
  "publishAt": "2024-01-01T12:00:00Z"
}
```

## 🧪 Testing

### Running Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

### API Testing
Use the provided Postman collection or test manually:

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup
```bash
# Production environment
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your_production_secret
ENCRYPTION_KEY=your_production_key
```

## 📊 Monitoring

### Health Check
The application provides a health check endpoint:
```
GET /health
```

### Logging
- Development: Console logging with morgan
- Production: Structured logging recommended

### Error Handling
- Global error handler
- Graceful shutdown on SIGINT/SIGTERM
- Database connection management

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Update API documentation
4. Follow existing code patterns
5. Add JSDoc comments

### Code Style
- Use TypeScript strict mode
- Follow ESLint configuration
- Use Prettier for formatting
- Write descriptive commit messages

## 📄 License

MIT License - see LICENSE file for details.