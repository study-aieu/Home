# Blog Publisher Mobile App

A complete mobile application built with React Native (Expo) and Node.js backend that allows users to write and publish blog posts to their WordPress websites directly from their phone.

## 🌟 Features

### Mobile App (React Native + Expo)
- **User Authentication**: JWT-based login and registration
- **WordPress Integration**: Connect to multiple WordPress sites using Application Passwords
- **Rich Post Creation**: Create and edit blog posts with title, content, and excerpts
- **Local Draft Storage**: Save drafts locally using AsyncStorage for offline access
- **Image Upload**: Upload images from camera or gallery to WordPress Media Library
- **Post Management**: View, edit, and delete existing posts
- **Modern UI**: Clean, responsive design using React Native Paper
- **Cross-Platform**: Compatible with iOS, Android, and Expo Go

### Backend (Node.js + Express)
- **RESTful API**: Well-structured API endpoints for all operations
- **User Management**: Secure user registration and authentication
- **WordPress REST API Integration**: Full integration with WordPress sites
- **Database**: SQLite database for user data and site connections
- **Security**: Rate limiting, CORS protection, input validation
- **Error Handling**: Comprehensive error handling and logging

## 📱 Screenshots

The app features a modern, intuitive interface with:
- Beautiful authentication screens
- Dashboard with quick actions and recent posts
- Rich text editor for creating posts
- Site management for multiple WordPress connections
- Local drafts management

## 🏗️ Architecture

```
blog-app/
├── backend/          # Node.js Express API
│   ├── config/       # Database and configuration
│   ├── controllers/  # API route controllers
│   ├── middleware/   # Authentication and validation
│   ├── routes/       # API route definitions
│   └── server.js     # Main server file
└── mobile/           # React Native Expo app
    ├── src/
    │   ├── components/  # Reusable UI components
    │   ├── context/     # React context providers
    │   ├── hooks/       # Custom React hooks
    │   ├── navigation/  # App navigation structure
    │   ├── screens/     # App screen components
    │   └── config/      # App configuration
    ├── App.js          # Main app component
    └── package.json    # Dependencies
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- A WordPress website with Application Passwords enabled

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd blog-app/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file:
   ```env
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   DATABASE_PATH=./database/blog_app.db
   FRONTEND_URL=exp://192.168.1.100:8081
   ```

4. **Start the backend server:**
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:3000`

### Mobile App Setup

1. **Navigate to mobile directory:**
   ```bash
   cd blog-app/mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Update API URL (if needed):**
   
   Edit `app.json` to match your backend IP:
   ```json
   {
     "expo": {
       "extra": {
         "apiUrl": "http://YOUR_IP:3000/api"
       }
     }
   }
   ```

4. **Start the mobile app:**
   ```bash
   npm start
   ```

5. **Run on device/simulator:**
   - Scan QR code with Expo Go app (iOS/Android)
   - Press `i` for iOS simulator
   - Press `a` for Android emulator

## 🔧 WordPress Setup

### Enable Application Passwords

1. Go to your WordPress admin panel
2. Navigate to **Users → Your Profile**
3. Scroll down to **Application Passwords** section
4. Enter application name (e.g., "Blog Publisher App")
5. Click **Add New Application Password**
6. Copy the generated password (you won't see it again!)

### Required WordPress Settings

- WordPress 5.6+ or WordPress.com site
- Application Passwords enabled
- REST API accessible (usually enabled by default)

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### WordPress Integration

- `POST /api/wordpress/connect-site` - Connect WordPress site
- `GET /api/wordpress/sites` - Get connected sites
- `POST /api/wordpress/sites/:siteId/posts` - Create new post
- `GET /api/wordpress/sites/:siteId/posts` - Get posts
- `PUT /api/wordpress/sites/:siteId/posts/:postId` - Update post
- `DELETE /api/wordpress/sites/:siteId/posts/:postId` - Delete post

### File Upload

- `POST /api/upload/local` - Upload image locally
- `POST /api/upload/wordpress/:siteId` - Upload to WordPress
- `GET /api/upload/wordpress/:siteId/media` - Get media library

### Drafts

- `POST /api/drafts` - Save draft
- `GET /api/drafts` - Get user drafts
- `PUT /api/drafts/:draftId` - Update draft
- `DELETE /api/drafts/:draftId` - Delete draft

## 🛠️ Development

### Backend Development

```bash
cd blog-app/backend
npm run dev    # Start with nodemon for auto-reload
npm test       # Run tests
```

### Mobile Development

```bash
cd blog-app/mobile
npm start              # Start Expo development server
npm run android       # Run on Android
npm run ios           # Run on iOS
npm run web           # Run on web
```

## 📦 Building for Production

### Backend Deployment

1. Set production environment variables
2. Use a production-ready database (PostgreSQL recommended)
3. Deploy to your preferred platform (Heroku, DigitalOcean, etc.)

### Mobile App Deployment

```bash
# Build for Android
npx expo build:android

# Build for iOS (requires macOS)
npx expo build:ios

# Or use EAS Build (recommended)
npx eas build --platform all
```

## 🔒 Security Features

- JWT-based authentication with secure token storage
- Input validation using Joi
- Rate limiting to prevent abuse
- Secure password storage with bcrypt
- CORS protection
- SQL injection prevention with parameterized queries

## 🐛 Troubleshooting

### Common Issues

1. **Backend not starting:**
   - Check if port 3000 is available
   - Verify environment variables are set
   - Check Node.js version compatibility

2. **Mobile app can't connect to backend:**
   - Ensure backend is running
   - Check IP address in configuration
   - Verify firewall settings

3. **WordPress connection failed:**
   - Verify Application Password is correct
   - Check WordPress site URL format
   - Ensure WordPress REST API is accessible

### Debug Tips

- Check backend logs for API errors
- Use Expo development tools for mobile debugging
- Test WordPress connection with tools like Postman
- Verify network connectivity between devices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React Native Paper for beautiful UI components
- Expo for streamlined React Native development
- WordPress REST API for seamless integration
- All the open-source libraries that made this project possible

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the API documentation
3. Check existing issues in the repository
4. Create a new issue with detailed information

---

**Built with ❤️ using React Native, Node.js, and WordPress**