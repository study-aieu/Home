import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { AuthResponse, User, BlogSite, Post, MediaItem, ApiError } from '../types';

const API_BASE_URL = 'http://localhost:3000/api'; // Change this to your actual backend URL

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(async (config) => {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await this.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
    });
    
    if (response.data.token) {
      await SecureStore.setItemAsync('authToken', response.data.token);
    }
    
    return response.data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    
    if (response.data.token) {
      await SecureStore.setItemAsync('authToken', response.data.token);
    }
    
    return response.data;
  }

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('authToken');
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await SecureStore.getItemAsync('authToken');
    return !!token;
  }

  // Site methods
  async connectSite(
    name: string,
    url: string,
    username: string,
    applicationPassword: string
  ): Promise<{ message: string; site: BlogSite }> {
    const response = await this.api.post('/site/connect', {
      name,
      url,
      username,
      applicationPassword,
    });
    return response.data;
  }

  async getSites(): Promise<{ sites: BlogSite[] }> {
    const response = await this.api.get('/site/sites');
    return response.data;
  }

  async testSiteConnection(siteId: number): Promise<{ connected: boolean; message: string }> {
    const response = await this.api.post(`/site/test/${siteId}`);
    return response.data;
  }

  async disconnectSite(siteId: number): Promise<{ message: string }> {
    const response = await this.api.delete(`/site/sites/${siteId}`);
    return response.data;
  }

  // Post methods
  async createPost(
    siteId: number,
    title: string,
    content: string,
    status: 'draft' | 'publish' = 'draft',
    excerpt?: string,
    featuredMedia?: number
  ): Promise<{ message: string; post: Post }> {
    const response = await this.api.post('/posts', {
      siteId,
      title,
      content,
      status,
      excerpt,
      featuredMedia,
    });
    return response.data;
  }

  async getPosts(
    siteId: number,
    page: number = 1,
    perPage: number = 10,
    status: string = 'any'
  ): Promise<{ posts: Post[]; totalPages: number; total: number }> {
    const response = await this.api.get(`/posts/${siteId}`, {
      params: { page, perPage, status },
    });
    return response.data;
  }

  async getPost(siteId: number, postId: number): Promise<{ post: Post }> {
    const response = await this.api.get(`/posts/${siteId}/${postId}`);
    return response.data;
  }

  async updatePost(
    siteId: number,
    postId: number,
    updates: {
      title?: string;
      content?: string;
      status?: 'draft' | 'publish' | 'private';
      excerpt?: string;
      featuredMedia?: number;
    }
  ): Promise<{ message: string; post: Post }> {
    const response = await this.api.put(`/posts/${siteId}/${postId}`, updates);
    return response.data;
  }

  async deletePost(
    siteId: number,
    postId: number,
    force: boolean = false
  ): Promise<{ message: string; post: Post }> {
    const response = await this.api.delete(`/posts/${siteId}/${postId}`, {
      params: { force },
    });
    return response.data;
  }

  // Media methods
  async uploadImage(
    siteId: number,
    imageUri: string,
    altText?: string,
    caption?: string,
    description?: string
  ): Promise<{ message: string; media: MediaItem }> {
    const formData = new FormData();
    
    // Get file info
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpg';
    
    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    if (altText) formData.append('alt_text', altText);
    if (caption) formData.append('caption', caption);
    if (description) formData.append('description', description);

    const response = await this.api.post(`/upload/${siteId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getMedia(
    siteId: number,
    page: number = 1,
    perPage: number = 20,
    mediaType: string = 'image'
  ): Promise<{ media: MediaItem[]; totalPages: number; total: number }> {
    const response = await this.api.get(`/upload/${siteId}/media`, {
      params: { page, perPage, mediaType },
    });
    return response.data;
  }

  async deleteMedia(siteId: number, mediaId: number): Promise<{ message: string }> {
    const response = await this.api.delete(`/upload/${siteId}/media/${mediaId}`);
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;