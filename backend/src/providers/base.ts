import { CMSAdapter, ProviderCredentials, PublishInput, PublishResult, ExternalPost, AuthField } from '../types';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Base class for CMS adapters providing common functionality
 */
export abstract class BaseCMSAdapter implements CMSAdapter {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract website: string;
  abstract authFields: AuthField[];
  abstract supports: {
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

  protected createHttpClient(auth: ProviderCredentials, baseURL?: string): AxiosInstance {
    const config: AxiosRequestConfig = {
      timeout: 30000,
      headers: {
        'User-Agent': 'Universal Blog Publisher/1.0',
        'Content-Type': 'application/json',
      },
    };

    if (baseURL) {
      config.baseURL = baseURL;
    }

    const client = axios.create(config);

    // Add authentication interceptor
    client.interceptors.request.use((config) => {
      return this.addAuthHeaders(config, auth);
    });

    // Add response interceptor for error handling
    client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.message || error.message || 'Unknown error';
        const status = error.response?.status || 500;
        
        throw new Error(`HTTP ${status}: ${message}`);
      }
    );

    return client;
  }

  protected abstract addAuthHeaders(config: AxiosRequestConfig, auth: ProviderCredentials): AxiosRequestConfig;

  protected validateAuth(auth: ProviderCredentials, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!auth[field]) {
        throw new Error(`Missing required authentication field: ${field}`);
      }
    }
  }

  protected formatContent(content: string, format: 'html' | 'markdown' = 'html'): string {
    if (format === 'markdown') {
      // Convert basic HTML to Markdown if needed
      return content
        .replace(/<h([1-6])>/g, (match, level) => '#'.repeat(parseInt(level)) + ' ')
        .replace(/<\/h[1-6]>/g, '\n\n')
        .replace(/<p>/g, '')
        .replace(/<\/p>/g, '\n\n')
        .replace(/<strong>/g, '**')
        .replace(/<\/strong>/g, '**')
        .replace(/<em>/g, '*')
        .replace(/<\/em>/g, '*')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<a href="([^"]*)"[^>]*>/g, '[')
        .replace(/<\/a>/g, ']($1)')
        .trim();
    }
    return content;
  }

  protected parseDate(dateString?: string | Date): Date | undefined {
    if (!dateString) return undefined;
    
    if (dateString instanceof Date) return dateString;
    
    try {
      return new Date(dateString);
    } catch {
      return undefined;
    }
  }

  protected handleError(error: any, operation: string): never {
    console.error(`${this.name} ${operation} error:`, error);
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error('Authentication failed. Please check your credentials.');
    }
    
    if (error.response?.status === 404) {
      throw new Error('Resource not found. The post or endpoint may not exist.');
    }
    
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    
    throw new Error(error.message || `${operation} failed`);
  }

  // Abstract methods that must be implemented by each provider
  abstract verifyConnection(auth: ProviderCredentials): Promise<{ ok: boolean; details?: any; error?: string }>;
  abstract listPosts(auth: ProviderCredentials, opts?: { page?: number; limit?: number }): Promise<ExternalPost[]>;
  abstract createPost(auth: ProviderCredentials, input: PublishInput): Promise<PublishResult>;
  abstract updatePost(auth: ProviderCredentials, postId: string, input: PublishInput): Promise<PublishResult>;
  abstract deletePost(auth: ProviderCredentials, postId: string): Promise<{ ok: boolean; error?: string }>;
}