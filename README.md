# Blog Publishing Mobile App

A complete full-stack mobile application that allows users to write and publish blog posts directly to their WordPress websites from their mobile devices.

## 🚀 Features

### Mobile App (React Native + Expo)
- **User Authentication**: Secure JWT-based login and registration
- **WordPress Integration**: Connect multiple WordPress sites using application passwords
- **Post Creation**: Rich text editor with image upload support
- **Draft Management**: Save drafts locally with AsyncStorage
- **Media Management**: Upload images directly to WordPress media library
- **Post Management**: View, edit, and delete existing WordPress posts
- **Offline Support**: Write drafts offline and publish when connected

### Backend API (Node.js + Express)
- **RESTful API**: Complete REST API for all mobile app functionality
- **Authentication**: JWT-based user authentication and authorization
- **WordPress Integration**: Full WordPress REST API integration
- **Database**: SQLite database for user and site management
- **File Upload**: Secure image upload to WordPress media library
- **Error Handling**: Comprehensive error handling and validation

## 📁 Project Structure

```
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Custom middleware (auth, etc.)
│   │   ├── models/          # Database models (User, BlogSite)
│   │   ├── routes/          # API routes
│   │   └── utils/           # Utility functions
│   ├── uploads/             # Temporary file storage
│   ├── .env                 # Environment variables
│   └── package.json
├── mobile/                  # React Native Expo app
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # React contexts (Auth)
│   │   ├── screens/         # App screens
│   │   ├── services/        # API and storage services
│   │   └── types/           # TypeScript type definitions
│   ├── app.config.js        # Expo configuration
│   └── package.json
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- A WordPress website with REST API enabled

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Update the JWT secret with a strong random string
   ```bash
   cp .env.example .env
   ```

4. **Build and start the server:**
   ```bash
   npm run build
   npm start
   ```
   
   For development:
   ```bash
   npm run dev
   ```

5. **Verify backend is running:**
   - Visit `http://localhost:3000/health`
   - Should return: `{"status":"OK","timestamp":"..."}`

### Mobile App Setup

1. **Navigate to mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Update API configuration:**
   - Open `src/services/api.ts`
   - Update `API_BASE_URL` to point to your backend server
   ```typescript
   const API_BASE_URL = 'http://your-backend-url:3000/api';
   ```

4. **Start the Expo development server:**
   ```bash
   npx expo start
   ```

5. **Run on device/emulator:**
   - **iOS**: Press `i` to open iOS simulator
   - **Android**: Press `a` to open Android emulator
   - **Physical device**: Scan QR code with Expo Go app

## 🔧 WordPress Setup

To connect your WordPress site to the app:

1. **Enable REST API** (usually enabled by default in modern WordPress)

2. **Create Application Password:**
   - Go to WordPress Admin → Users → Your Profile
   - Scroll to "Application Passwords" section
   - Create a new application password
   - Copy the generated password (you won't see it again!)

3. **Connect in the app:**
   - Open the mobile app
   - Go to "Sites" tab
   - Tap "+" to add a new site
   - Enter your WordPress details:
     - Site Name: Any descriptive name
     - Site URL: Your WordPress site URL (e.g., `https://yourblog.com`)
     - Username: Your WordPress username
     - Application Password: The password you just created

## 📱 Usage

### Getting Started
1. **Create an account** or login with existing credentials
2. **Connect your WordPress site** using the application password method
3. **Start writing** by tapping the "+" button on the Posts screen
4. **Save drafts** locally or publish directly to your WordPress site

### Creating Posts
- Write your post title and content
- Add images from your device gallery
- Save as draft for later editing
- Publish directly to your WordPress site
- Choose between draft or published status

### Managing Content
- View all posts from your connected WordPress sites
- Edit existing posts
- Delete posts
- Manage drafts locally on your device

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: User passwords are hashed using bcrypt
- **Application Passwords**: WordPress credentials are stored securely
- **Input Validation**: All user inputs are validated on both client and server
- **CORS Protection**: Configurable CORS policies
- **SQL Injection Protection**: Using Sequelize ORM with parameterized queries

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Site Management
- `POST /api/site/connect` - Connect WordPress site
- `GET /api/site/sites` - Get connected sites
- `POST /api/site/test/:siteId` - Test site connection
- `DELETE /api/site/sites/:siteId` - Disconnect site

### Post Management
- `POST /api/posts` - Create new post
- `GET /api/posts/:siteId` - Get posts from site
- `GET /api/posts/:siteId/:postId` - Get single post
- `PUT /api/posts/:siteId/:postId` - Update post
- `DELETE /api/posts/:siteId/:postId` - Delete post

### Media Upload
- `POST /api/upload/:siteId` - Upload image to WordPress
- `GET /api/upload/:siteId/media` - Get media library
- `DELETE /api/upload/:siteId/media/:mediaId` - Delete media

## 🚀 Building for Production

### Backend Deployment
1. **Set production environment variables**
2. **Use a production database** (PostgreSQL recommended)
3. **Configure proper CORS settings**
4. **Use HTTPS**
5. **Deploy to your preferred hosting service** (Heroku, DigitalOcean, AWS, etc.)

### Mobile App
1. **Build for iOS:**
   ```bash
   npx expo build:ios
   ```

2. **Build for Android:**
   ```bash
   npx expo build:android
   ```

3. **Deploy to app stores** using Expo's guided process

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Mobile App Testing
- Test on multiple devices using Expo Go
- Use iOS Simulator and Android Emulator
- Test offline functionality
- Validate WordPress integration

## 🔧 Troubleshooting

### Common Issues

1. **"Connection failed" when connecting WordPress site:**
   - Verify WordPress REST API is enabled
   - Check application password is correct
   - Ensure site URL is correct (include http/https)

2. **Backend not connecting to mobile app:**
   - Check API_BASE_URL in mobile app
   - Verify backend is running on correct port
   - Check network connectivity

3. **Image upload failures:**
   - Check file size limits
   - Verify WordPress media upload permissions
   - Check internet connection

### Debug Mode
- Enable debug mode in mobile app by checking console logs
- Backend logs are available in terminal when running `npm run dev`

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review the API documentation

## 🎯 Future Enhancements

- Rich text formatting (bold, italic, links)
- Scheduled post publishing
- Multiple image uploads per post
- Post categories and tags
- Push notifications
- Dark mode support
- Offline post synchronization
- Multiple WordPress user support per site

---

**Built with ❤️ using React Native, Expo, Node.js, and WordPress REST API**
