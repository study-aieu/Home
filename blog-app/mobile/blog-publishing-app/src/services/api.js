import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, ENDPOINTS, STORAGE_KEYS } from '../constants/config';

// Create axios instance
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }
    
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
        // You might want to navigate to login screen here
        // NavigationService.navigate('Login');
      } catch (clearError) {
        console.error('Failed to clear auth data:', clearError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  register: async (userData) => {
    const response = await api.post(ENDPOINTS.REGISTER, userData);
    return response.data;
  },
  
  login: async (credentials) => {
    const response = await api.post(ENDPOINTS.LOGIN, credentials);
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get(ENDPOINTS.ME);
    return response.data;
  },
};

// WordPress API functions
export const wordpressAPI = {
  connectSite: async (siteData) => {
    const response = await api.post(ENDPOINTS.CONNECT_SITE, siteData);
    return response.data;
  },
  
  getSites: async () => {
    const response = await api.get(ENDPOINTS.GET_SITES);
    return response.data;
  },
  
  getPosts: async (siteId, page = 1, perPage = 10) => {
    const response = await api.get(`${ENDPOINTS.GET_POSTS}/${siteId}`, {
      params: { page, perPage },
    });
    return response.data;
  },
  
  createPost: async (siteId, postData) => {
    const response = await api.post(`${ENDPOINTS.CREATE_POST}/${siteId}`, postData);
    return response.data;
  },
  
  updatePost: async (siteId, postId, postData) => {
    const response = await api.put(`${ENDPOINTS.UPDATE_POST}/${siteId}/${postId}`, postData);
    return response.data;
  },
  
  deletePost: async (siteId, postId) => {
    const response = await api.delete(`${ENDPOINTS.DELETE_POST}/${siteId}/${postId}`);
    return response.data;
  },
  
  uploadImage: async (siteId, imageUri, filename) => {
    const formData = new FormData();
    
    // Create file object for React Native
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg', // You might want to detect this dynamically
      name: filename || 'image.jpg',
    });
    
    const response = await api.post(`${ENDPOINTS.UPLOAD_IMAGE}/${siteId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Generic API function for custom requests
export const apiRequest = async (method, url, data = null, config = {}) => {
  try {
    const response = await api.request({
      method,
      url,
      data,
      ...config,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;