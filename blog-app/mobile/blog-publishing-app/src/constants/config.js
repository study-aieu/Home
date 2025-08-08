import Constants from 'expo-constants';

// Get API URL from app.json extra config or use default
const getApiUrl = () => {
  const apiUrl = Constants.expoConfig?.extra?.apiUrl;
  
  if (apiUrl) {
    return apiUrl;
  }
  
  // Fallback URLs for different environments
  if (__DEV__) {
    // For development, try to determine local IP
    return 'http://localhost:3000/api';
  }
  
  // Production URL (update this with your actual production API URL)
  return 'https://your-production-api.com/api';
};

export const API_CONFIG = {
  BASE_URL: getApiUrl(),
  TIMEOUT: 30000, // 30 seconds
};

export const ENDPOINTS = {
  // Auth endpoints
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  ME: '/auth/me',
  
  // WordPress endpoints
  CONNECT_SITE: '/wordpress/connect-site',
  GET_SITES: '/wordpress/sites',
  GET_POSTS: '/wordpress/posts',
  CREATE_POST: '/wordpress/posts',
  UPDATE_POST: '/wordpress/posts',
  DELETE_POST: '/wordpress/posts',
  UPLOAD_IMAGE: '/wordpress/upload-image',
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  DRAFTS: 'drafts',
  SELECTED_SITE: 'selected_site',
};

export const COLORS = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  secondary: '#ec4899',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  background: '#ffffff',
  surface: '#f8fafc',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  placeholder: '#9ca3af',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};