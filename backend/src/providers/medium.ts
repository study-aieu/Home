import { BaseCMSAdapter } from './base';
import { ProviderCredentials, PublishInput, PublishResult, ExternalPost, AuthField } from '../types';
import { AxiosRequestConfig } from 'axios';

/**
 * Medium adapter for publishing to Medium platform
 */
export class MediumAdapter extends BaseCMSAdapter {
  id = 'medium';
  name = 'Medium';
  description = 'Publish articles to Medium platform';
  website = 'https://medium.com';

  authFields: AuthField[] = [
    {
      key: 'accessToken',
      label: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'Your Medium access token',
      description: 'Get your access token from https://medium.com/me/settings'
    }
  ];

  supports = {
    images: false, // Medium handles images via URLs in content
    tags: true,
    categories: false,
    scheduling: false,
    drafts: true,
    edit: false, // Medium API doesn't support editing
    delete: false, // Medium API doesn't support deletion
    excerpt: false,
    featuredImage: false,
  };

  protected addAuthHeaders(config: AxiosRequestConfig, auth: ProviderCredentials): AxiosRequestConfig {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${auth.accessToken}`,
    };
    return config;
  }

  async verifyConnection(auth: ProviderCredentials): Promise<{ ok: boolean; details?: any; error?: string }> {
    try {
      this.validateAuth(auth, ['accessToken']);
      
      const client = this.createHttpClient(auth, 'https://api.medium.com/v1');
      const response = await client.get('/me');
      
      return {
        ok: true,
        details: {
          user: response.data.data.name,
          username: response.data.data.username,
          id: response.data.data.id
        }
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }

  async listPosts(auth: ProviderCredentials, opts?: { page?: number; limit?: number }): Promise<ExternalPost[]> {
    try {
      this.validateAuth(auth, ['accessToken']);
      
      const client = this.createHttpClient(auth, 'https://api.medium.com/v1');
      
      // Get user info first
      const userResponse = await client.get('/me');
      const userId = userResponse.data.data.id;
      
      // Get user's publications and posts
      const postsResponse = await client.get(`/users/${userId}/posts`);
      
      return postsResponse.data.data.map((post: any) => this.mapMediumPost(post));
    } catch (error) {
      this.handleError(error, 'list posts');
    }
  }

  async createPost(auth: ProviderCredentials, input: PublishInput): Promise<PublishResult> {
    try {
      this.validateAuth(auth, ['accessToken']);
      
      const client = this.createHttpClient(auth, 'https://api.medium.com/v1');
      
      // Get user info first
      const userResponse = await client.get('/me');
      const userId = userResponse.data.data.id;
      
      const postData = {
        title: input.title,
        contentFormat: 'html',
        content: input.content,
        tags: input.tags || [],
        publishStatus: input.publishedAt ? 'public' : 'draft',
        notifyFollowers: true
      };
      
      const response = await client.post(`/users/${userId}/posts`, postData);
      
      return {
        success: true,
        externalId: response.data.data.id,
        url: response.data.data.url,
        metadata: {
          publishStatus: response.data.data.publishStatus,
          publishedAt: response.data.data.publishedAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updatePost(auth: ProviderCredentials, postId: string, input: PublishInput): Promise<PublishResult> {
    // Medium API doesn't support updating posts
    return {
      success: false,
      error: 'Medium does not support editing published posts'
    };
  }

  async deletePost(auth: ProviderCredentials, postId: string): Promise<{ ok: boolean; error?: string }> {
    // Medium API doesn't support deleting posts
    return {
      ok: false,
      error: 'Medium does not support deleting published posts'
    };
  }

  private mapMediumPost(post: any): ExternalPost {
    return {
      id: post.id,
      title: post.title,
      content: '', // Medium API doesn't return full content
      tags: post.tags || [],
      publishedAt: post.publishedAt ? new Date(post.publishedAt) : undefined,
      status: post.publishStatus,
      url: post.url,
      metadata: {
        license: post.license,
        licenseUrl: post.licenseUrl
      }
    };
  }
}