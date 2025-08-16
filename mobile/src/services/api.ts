import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiResponse,
  PaginatedResponse,
  User,
  LoginCredentials,
  SignupCredentials,
  Provider,
  Connection,
  Draft,
  Post,
  DraftForm,
  ConnectionForm,
  MultiPublishResult,
} from '../types';

// Configure base URL - you can change this to your backend URL
const BASE_URL = __DEV__ ? 'http://localhost:3000/api' : 'https://your-backend-url.com/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('user');
          // You might want to redirect to login here
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication Methods
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = 
      await this.api.post('/auth/login', credentials);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Login failed');
    }
    
    return response.data.data!;
  }

  async signup(credentials: SignupCredentials): Promise<{ user: User; token: string }> {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = 
      await this.api.post('/auth/signup', credentials);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Signup failed');
    }
    
    return response.data.data!;
  }

  async refreshToken(): Promise<{ user: User; token: string }> {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = 
      await this.api.post('/auth/refresh');
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Token refresh failed');
    }
    
    return response.data.data!;
  }

  async getProfile(): Promise<User> {
    const response: AxiosResponse<ApiResponse<{ user: User }>> = 
      await this.api.get('/auth/me');
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get profile');
    }
    
    return response.data.data!.user;
  }

  async updateProfile(updates: { name?: string; email?: string }): Promise<User> {
    const response: AxiosResponse<ApiResponse<{ user: User }>> = 
      await this.api.put('/auth/profile', updates);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update profile');
    }
    
    return response.data.data!.user;
  }

  // Provider Methods
  async getProviders(): Promise<Provider[]> {
    const response: AxiosResponse<ApiResponse<Provider[]>> = 
      await this.api.get('/providers');
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get providers');
    }
    
    return response.data.data!;
  }

  async getProvider(providerId: string): Promise<Provider> {
    const response: AxiosResponse<ApiResponse<Provider>> = 
      await this.api.get(`/providers/${providerId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get provider');
    }
    
    return response.data.data!;
  }

  // Connection Methods
  async getConnections(): Promise<Connection[]> {
    const response: AxiosResponse<ApiResponse<Connection[]>> = 
      await this.api.get('/connections');
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get connections');
    }
    
    return response.data.data!;
  }

  async createConnection(
    providerId: string,
    name: string,
    credentials: Record<string, string>
  ): Promise<Connection> {
    const response: AxiosResponse<ApiResponse<Connection>> = 
      await this.api.post('/connections', {
        providerId,
        name,
        credentials,
      });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create connection');
    }
    
    return response.data.data!;
  }

  async updateConnection(
    connectionId: string,
    updates: Partial<ConnectionForm> & { isActive?: boolean }
  ): Promise<Connection> {
    const response: AxiosResponse<ApiResponse<Connection>> = 
      await this.api.put(`/connections/${connectionId}`, updates);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update connection');
    }
    
    return response.data.data!;
  }

  async deleteConnection(connectionId: string): Promise<void> {
    const response: AxiosResponse<ApiResponse> = 
      await this.api.delete(`/connections/${connectionId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete connection');
    }
  }

  async verifyConnection(connectionId: string): Promise<{ ok: boolean; details?: any; error?: string }> {
    const response: AxiosResponse<ApiResponse<{ ok: boolean; details?: any; error?: string }>> = 
      await this.api.get(`/connections/${connectionId}/verify`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to verify connection');
    }
    
    return response.data.data!;
  }

  async testConnection(connectionId: string): Promise<{ posts: any[]; details: any }> {
    const response: AxiosResponse<ApiResponse<{ posts: any[]; details: any }>> = 
      await this.api.get(`/connections/${connectionId}/test`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to test connection');
    }
    
    return response.data.data!;
  }

  // Draft Methods
  async getDrafts(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Draft>> {
    const response: AxiosResponse<PaginatedResponse<Draft>> = 
      await this.api.get('/drafts', { params: { page, limit } });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get drafts');
    }
    
    return response.data;
  }

  async getDraft(draftId: string): Promise<Draft> {
    const response: AxiosResponse<ApiResponse<Draft>> = 
      await this.api.get(`/drafts/${draftId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get draft');
    }
    
    return response.data.data!;
  }

  async createDraft(draft: DraftForm): Promise<Draft> {
    const response: AxiosResponse<ApiResponse<Draft>> = 
      await this.api.post('/drafts', draft);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create draft');
    }
    
    return response.data.data!;
  }

  async updateDraft(draftId: string, updates: Partial<DraftForm>): Promise<Draft> {
    const response: AxiosResponse<ApiResponse<Draft>> = 
      await this.api.put(`/drafts/${draftId}`, updates);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update draft');
    }
    
    return response.data.data!;
  }

  async deleteDraft(draftId: string): Promise<void> {
    const response: AxiosResponse<ApiResponse> = 
      await this.api.delete(`/drafts/${draftId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete draft');
    }
  }

  async duplicateDraft(draftId: string): Promise<Draft> {
    const response: AxiosResponse<ApiResponse<Draft>> = 
      await this.api.post(`/drafts/${draftId}/duplicate`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to duplicate draft');
    }
    
    return response.data.data!;
  }

  // Publishing Methods
  async publishDraft(
    draftId: string,
    connectionId: string,
    publishAt?: Date
  ): Promise<{ post: Post; publishResult: any }> {
    const response: AxiosResponse<ApiResponse<{ post: Post; publishResult: any }>> = 
      await this.api.post('/publish', {
        draftId,
        connectionId,
        publishAt: publishAt?.toISOString(),
      });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to publish draft');
    }
    
    return response.data.data!;
  }

  async multiPublish(
    draftId: string,
    connectionIds: string[],
    publishAt?: Date
  ): Promise<MultiPublishResult> {
    const response: AxiosResponse<ApiResponse<MultiPublishResult>> = 
      await this.api.post('/publish/multi', {
        draftId,
        connectionIds,
        publishAt: publishAt?.toISOString(),
      });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to multi-publish');
    }
    
    return response.data.data!;
  }

  async updatePost(postId: string, updates: Partial<DraftForm>): Promise<{ post: Post; updateResult: any }> {
    const response: AxiosResponse<ApiResponse<{ post: Post; updateResult: any }>> = 
      await this.api.put(`/publish/${postId}`, updates);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update post');
    }
    
    return response.data.data!;
  }

  async deletePost(postId: string): Promise<void> {
    const response: AxiosResponse<ApiResponse> = 
      await this.api.delete(`/publish/${postId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete post');
    }
  }

  // Post Methods
  async getPosts(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Post>> {
    const response: AxiosResponse<PaginatedResponse<Post>> = 
      await this.api.get('/publish/posts', { params: { page, limit } });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get posts');
    }
    
    return response.data;
  }

  async getConnectionPosts(connectionId: string, page: number = 1, limit: number = 10): Promise<any[]> {
    const response: AxiosResponse<ApiResponse<any[]>> = 
      await this.api.get(`/connections/${connectionId}/posts`, { params: { page, limit } });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get connection posts');
    }
    
    return response.data.data!;
  }

  async syncConnectionPosts(connectionId: string): Promise<{ synced: number; errors: string[] }> {
    const response: AxiosResponse<ApiResponse<{ synced: number; errors: string[] }>> = 
      await this.api.post(`/connections/${connectionId}/sync`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to sync posts');
    }
    
    return response.data.data!;
  }
}

export const apiService = new ApiService();
export default apiService;