# 🧠 Universal Blog Publisher

A complete mobile app and backend system that allows users to publish blog posts to **67 different website builders, CMS platforms, and custom sites**.

## 🚀 Features

### Mobile App (React Native + Expo)
- **Authentication**: Secure JWT-based login/signup
- **Multi-Platform Support**: Connect to 67+ website builders and CMS platforms
- **Rich Blog Editor**: Title, rich text/markdown, images, tags, categories, scheduling
- **Draft Management**: Save locally and sync with backend
- **Multi-Publish**: Push one draft to multiple connected providers
- **Post Management**: View, edit, and delete existing posts

### Backend (Node.js + Express + Prisma)
- **Secure Authentication**: JWT tokens, bcrypt password hashing
- **Database**: PostgreSQL with SQLite fallback
- **Provider Adapter System**: Modular architecture for easy platform integration
- **RESTful API**: Complete CRUD operations for posts and connections

## 🏗️ Architecture

```
├── mobile/                 # React Native Expo app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── screens/        # App screens
│   │   ├── services/       # API calls and business logic
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Helper functions
│   └── App.tsx            # Main app component
├── backend/                # Node.js Express backend
│   ├── src/
│   │   ├── providers/      # CMS platform adapters
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Authentication & validation
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helper functions
│   ├── prisma/             # Database schema and migrations
│   └── server.js           # Express server entry point
└── docs/                   # Documentation and testing
```

## 🎯 Supported Platforms

### Website Builders
- **Wix, Squarespace, Weebly, Webflow**
- **Zyro, SITE123, Jimdo, Strikingly**
- **Bookmark, Pagecloud, Simvoly**
- **Shopify, BigCommerce, Ecwid, Volusion**
- **Square Online, WooCommerce**

### CMS Platforms
- **WordPress.com, Blogger, Tumblr, Medium**
- **Ghost, Joomla, Drupal, Magento**
- **Contentful, Sanity, Strapi, Prismic**
- **Directus, Payload CMS, Netlify CMS**
- **Forestry.io, DatoCMS, Hygraph (GraphCMS)**

### Static Site Generators
- **Hugo, Jekyll, Gatsby, Next.js**
- **GitHub Pages, GitLab Pages, Vercel, Netlify**

### Custom & Other
- **Notion, Carrd, Tilda, Ucraft**
- **Voog, Webnode, Mozello, Duda**
- **One.com, Odoo Website Builder, NationBuilder**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- React Native development environment
- PostgreSQL (or SQLite for development)
- Expo CLI

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure your database and JWT secret
npm run db:generate
npm run db:migrate
npm run dev
```

### Mobile App Setup
```bash
cd mobile
npm install
npx expo start
```

### Environment Variables
```bash
# Backend (.env)
DATABASE_URL="postgresql://user:password@localhost:5432/blog_publisher"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3001

# Mobile (.env)
API_BASE_URL="http://localhost:3001"
```

## 📱 Mobile App Features

### Authentication
- Secure login/signup with JWT tokens
- Password reset functionality
- Biometric authentication support

### Website Connections
- Browse and select from 67+ supported platforms
- Secure credential storage
- Connection testing and validation

### Blog Editor
- Rich text editor with markdown support
- Image upload and management
- Tag and category management
- Post scheduling
- Draft saving and syncing

### Publishing
- Single post publishing
- Multi-platform publishing
- Post management (view, edit, delete)
- Publishing history and analytics

## 🔌 Provider Adapter System

Each supported platform implements a standard interface:

```typescript
export interface CMSAdapter {
  id: string;
  name: string;
  verifyConnection(auth: any): Promise<{ ok: boolean; details?: any }>;
  listPosts(auth: any, opts?: { page?: number }): Promise<any[]>;
  createPost(auth: any, input: PublishInput): Promise<PublishResult>;
  updatePost(auth: any, postId: string, input: PublishInput): Promise<PublishResult>;
  deletePost(auth: any, postId: string): Promise<{ ok: boolean }>;
  uploadImage?(auth: any, file: Buffer, filename: string): Promise<{ url: string; id?: string }>;
  supports: {
    images: boolean;
    tags: boolean;
    scheduling: boolean;
    edit: boolean;
    delete: boolean;
  };
}
```

## 🗄️ Database Schema

### Core Tables
- **users**: User accounts and authentication
- **connections**: Website platform connections
- **drafts**: Blog post drafts
- **posts**: Published posts across platforms
- **images**: Uploaded images and media

### Relationships
- Users can have multiple connections
- Drafts can be published to multiple platforms
- Posts are linked to connections and users
- Images are associated with posts and users

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Cross-origin request protection
- **Environment Variables**: Secure configuration management

## 🧪 Testing

### API Testing
- Postman collection included
- Comprehensive endpoint testing
- Authentication flow testing
- Provider adapter testing

### Mobile App Testing
- Component testing with React Native Testing Library
- Integration testing for API calls
- End-to-end testing with Detox

## 📚 API Documentation

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User authentication
- `POST /auth/refresh` - Token refresh

### Connections
- `GET /providers` - List supported platforms
- `POST /connections` - Create new connection
- `GET /connections` - List user connections
- `GET /connections/:id/verify` - Test connection
- `DELETE /connections/:id` - Remove connection

### Content Management
- `POST /drafts` - Create new draft
- `GET /drafts` - List user drafts
- `PUT /drafts/:id` - Update draft
- `DELETE /drafts/:id` - Delete draft

### Publishing
- `POST /publish` - Publish draft to platforms
- `GET /posts` - List published posts
- `PUT /posts/:id` - Update published post
- `DELETE /posts/:id` - Delete published post

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests for new functionality
5. Submit a pull request

### Adding New Providers

1. Create a new adapter in `backend/src/providers/`
2. Implement the `CMSAdapter` interface
3. Add provider metadata to the providers list
4. Include comprehensive tests
5. Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: GitHub Issues for bug reports and feature requests
- **Discussions**: GitHub Discussions for questions and help
- **Documentation**: Comprehensive guides and examples
- **Examples**: Sample implementations for each provider

## 🎉 Acknowledgments

- Built with React Native, Expo, Node.js, Express, and Prisma
- Inspired by the need for unified content publishing across platforms
- Special thanks to the open-source community for amazing tools and libraries

---

**Ready to publish everywhere?** 🚀 Start building your universal blog publishing empire today!
