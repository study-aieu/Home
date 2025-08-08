# Blog Publishing Mobile App

A complete mobile application for publishing blog posts to WordPress sites, built with React Native (Expo) and Node.js.

## 📱 Features

### Mobile App (React Native + Expo)
- **User Authentication**: JWT-based login and registration
- **WordPress Integration**: Connect multiple WordPress sites using Application Passwords
- **Post Management**: Create, edit, delete, and publish blog posts
- **Rich Content**: Support for text content and image uploads
- **Draft System**: Save posts locally as drafts for later editing
- **Image Upload**: Upload images to WordPress media library
- **Secure Storage**: Credentials stored securely on device
- **Cross-Platform**: Works on iOS, Android, and web (via Expo)

### Backend (Node.js + Express)
- **RESTful API**: Complete API for authentication and WordPress integration
- **JWT Authentication**: Secure user authentication with tokens
- **Database**: SQLite database with Sequelize ORM
- **WordPress API**: Full integration with WordPress REST API
- **Image Handling**: Multipart upload support for images
- **Security**: Helmet, CORS, and input validation
- **Error Handling**: Comprehensive error handling and logging

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g @expo/cli`
- **WordPress Site** with Application Passwords enabled

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd blog-app/backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Start the server**:
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`

### Mobile App Setup

1. **Navigate to mobile app directory**:
   ```bash
   cd blog-app/mobile/blog-publishing-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Update API URL** (if needed):
   - Edit `app.json` and update the `extra.apiUrl` field
   - For local development, use your machine's IP address instead of localhost

4. **Start the app**:
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**:
   - **iOS**: Press `i` or scan QR code with Camera app
   - **Android**: Press `a` or scan QR code with Expo Go app
   - **Web**: Press `w`

## 📖 Setup Instructions

### WordPress Configuration

1. **Enable Application Passwords**:
   - WordPress 5.6+ has this feature built-in
   - For older versions, install the "Application Passwords" plugin

2. **Create Application Password**:
   - Go to WordPress Admin → Users → Profile
   - Scroll to "Application Passwords" section
   - Enter name (e.g., "Mobile App")
   - Click "Add New Application Password"
   - Copy the generated password (save it securely!)

3. **WordPress Requirements**:
   - WordPress 5.6+ (recommended)
   - REST API enabled (default)
   - HTTPS recommended for production

### Development Environment

1. **Local WordPress Setup** (Optional):
   ```bash
   # Using Local by Flywheel, XAMPP, or Docker
   # Example with Docker:
   docker run -d -p 8080:80 --name wordpress wordpress:latest
   ```

2. **Environment Variables**:
   ```env
   # Backend (.env)
   DATABASE_URL=./database.sqlite
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   PORT=3000
   NODE_ENV=development
   ALLOWED_ORIGINS=http://localhost:3000,exp://192.168.1.100:8081
   ```

3. **Network Configuration**:
   - Replace `192.168.1.100` with your machine's IP address
   - Ensure your mobile device can reach the backend server
   - Use `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find your IP

## 🏗️ Project Structure

```
blog-app/
├── backend/                 # Node.js Backend
│   ├── config/             # Database configuration
│   ├── middleware/         # Express middleware
│   ├── models/            # Sequelize models
│   ├── routes/            # API routes
│   ├── utils/             # Utility functions
│   ├── .env               # Environment variables
│   ├── .env.example       # Environment template
│   ├── package.json       # Dependencies
│   └── server.js          # Main server file
│
├── mobile/                 # React Native Mobile App
│   └── blog-publishing-app/
│       ├── src/
│       │   ├── components/ # Reusable components
│       │   ├── constants/  # App constants
│       │   ├── context/    # React contexts
│       │   ├── navigation/ # Navigation setup
│       │   ├── screens/    # App screens
│       │   ├── services/   # API & storage services
│       │   └── utils/      # Utility functions
│       ├── app.json        # Expo configuration
│       ├── App.js          # Main app component
│       └── package.json    # Dependencies
│
└── README.md              # This file
```

## 🔧 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### WordPress Endpoints

- `POST /api/wordpress/connect-site` - Connect WordPress site
- `GET /api/wordpress/sites` - Get connected sites
- `GET /api/wordpress/posts/:siteId` - Get posts from site
- `POST /api/wordpress/posts/:siteId` - Create new post
- `PUT /api/wordpress/posts/:siteId/:postId` - Update post
- `DELETE /api/wordpress/posts/:siteId/:postId` - Delete post
- `POST /api/wordpress/upload-image/:siteId` - Upload image

### Example Requests

```javascript
// Register user
POST /api/auth/register
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123"
}

// Connect WordPress site
POST /api/wordpress/connect-site
{
  "name": "My Blog",
  "url": "https://myblog.com",
  "username": "myusername",
  "applicationPassword": "xxxx xxxx xxxx xxxx"
}

// Create blog post
POST /api/wordpress/posts/1
{
  "title": "My First Post",
  "content": "<p>Hello world!</p>",
  "status": "publish",
  "excerpt": "This is my first post"
}
```

## 📱 Mobile App Features

### Core Screens

1. **Authentication**:
   - Login screen with email/password
   - Registration with form validation
   - JWT token management

2. **Dashboard (Home)**:
   - Welcome message with user info
   - Connected WordPress sites
   - Quick action buttons
   - Draft count and statistics

3. **Site Management**:
   - Connect new WordPress sites
   - Site selection and management
   - Connection testing

4. **Post Management** (Coming Soon):
   - Rich text editor
   - Image upload from camera/gallery
   - Draft saving and loading
   - Publish to WordPress

5. **Settings**:
   - User profile display
   - Logout functionality
   - App preferences

### Storage & Security

- **Secure Storage**: Auth tokens stored in Expo SecureStore
- **Local Storage**: Drafts and preferences in AsyncStorage
- **Network Security**: HTTPS recommended, JWT tokens for API auth

## 🔒 Security Considerations

### Production Deployment

1. **Environment Variables**:
   ```env
   NODE_ENV=production
   JWT_SECRET=use-a-strong-random-secret-here
   DATABASE_URL=postgresql://user:pass@host:port/dbname
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

2. **Database**:
   - Use PostgreSQL for production instead of SQLite
   - Enable SSL connections
   - Regular backups

3. **HTTPS**:
   - Always use HTTPS in production
   - Update API_CONFIG.BASE_URL in mobile app

4. **WordPress Security**:
   - Use Application Passwords (never regular passwords)
   - Enable 2FA on WordPress admin accounts
   - Keep WordPress updated

### Best Practices

- Never commit `.env` files to version control
- Regularly rotate Application Passwords
- Use strong JWT secrets (32+ characters)
- Implement rate limiting for production
- Monitor API usage and errors

## 🚀 Deployment

### Backend Deployment

**Heroku Example**:
```bash
# Add heroku remote
heroku create your-blog-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret-key
heroku config:set DATABASE_URL=postgresql://...

# Deploy
git push heroku main
```

**DigitalOcean/AWS/VPS**:
```bash
# Install PM2 for process management
npm install -g pm2

# Start application
pm2 start server.js --name blog-api

# Setup nginx reverse proxy
# Configure SSL with Let's Encrypt
```

### Mobile App Deployment

**Expo Build**:
```bash
# Build for Android
npx expo build:android

# Build for iOS (requires Apple Developer account)
npx expo build:ios

# Or use EAS Build (new build service)
npx eas build --platform all
```

**Update API URL for Production**:
```json
// app.json
{
  "expo": {
    "extra": {
      "apiUrl": "https://your-api-domain.com/api"
    }
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Troubleshooting

### Common Issues

1. **"Network Error" on mobile app**:
   - Check if backend server is running
   - Verify API URL in app.json matches your server
   - Ensure mobile device can reach the server IP

2. **"Token is not valid" errors**:
   - Check JWT_SECRET is consistent
   - Verify token hasn't expired
   - Clear app data and login again

3. **WordPress connection fails**:
   - Verify Application Password is correct
   - Check WordPress site URL is accessible
   - Ensure WordPress REST API is enabled

4. **Database errors on startup**:
   - Check DATABASE_URL in .env file
   - Ensure database file permissions
   - Delete database.sqlite to reset (development only)

### Getting Help

- Check the GitHub Issues page
- Review API logs in backend console
- Use React Native Debugger for mobile app issues
- Test API endpoints with Postman/curl

---

Built with ❤️ using React Native, Expo, Node.js, and WordPress REST API.