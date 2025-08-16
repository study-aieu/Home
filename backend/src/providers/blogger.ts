import { BaseCMSAdapter } from './base';
import { ProviderCredentials, PublishInput, PublishResult, ExternalPost, AuthField } from '../types';
import { AxiosRequestConfig } from 'axios';

/**
 * Blogger adapter for Google's Blogger platform
 */
export class BloggerAdapter extends BaseCMSAdapter {
  id = 'blogger';
  name = 'Blogger';
  description = 'Publish to Google Blogger platform';
  website = 'https://blogger.com';

  authFields: AuthField[] = [
    {
      key: 'blogId',
      label: 'Blog ID',
      type: 'text',
      required: true,
      placeholder: 'Your Blogger blog ID',
      description: 'Find this in your Blogger dashboard URL'
    },
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Your Google API key',
      description: 'Get this from Google Cloud Console'
    }
  ];

  supports = {
    images: false,
    tags: true,
    categories: false,
    scheduling: false,
    drafts: true,
    edit: true,
    delete: true,
    excerpt: false,
    featuredImage: false,
  };

  protected addAuthHeaders(config: AxiosRequestConfig, auth: ProviderCredentials): AxiosRequestConfig {
    config.params = {
      ...config.params,
      key: auth.apiKey
    };
    return config;
  }

  async verifyConnection(auth: ProviderCredentials): Promise<{ ok: boolean; details?: any; error?: string }> {
    try {
      this.validateAuth(auth, ['blogId', 'apiKey']);
      
      const client = this.createHttpClient(auth, 'https://www.googleapis.com/blogger/v3');
      const response = await client.get(`/blogs/${auth.blogId}`);
      
      return {
        ok: true,
        details: {
          name: response.data.name,
          description: response.data.description,
          url: response.data.url,
          posts: response.data.posts?.totalItems || 0
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
      this.validateAuth(auth, ['blogId', 'apiKey']);
      
      const client = this.createHttpClient(auth, 'https://www.googleapis.com/blogger/v3');
      
      const params: any = {
        maxResults: Math.min(opts?.limit || 10, 50),
        fetchBodies: true
      };
      
      if (opts?.page && opts.page > 1) {
        // Blogger uses pageToken for pagination, this is simplified
        params.startIndex = ((opts.page - 1) * (opts.limit || 10)) + 1;
      }
      
      const response = await client.get(`/blogs/${auth.blogId}/posts`, { params });
      
      return (response.data.items || []).map((post: any) => this.mapBloggerPost(post));
    } catch (error) {
      this.handleError(error, 'list posts');
    }
  }

  async createPost(auth: ProviderCredentials, input: PublishInput): Promise<PublishResult> {
    try {
      this.validateAuth(auth, ['blogId', 'apiKey']);
      
      const client = this.createHttpClient(auth, 'https://www.googleapis.com/blogger/v3');
      
      const postData: any = {
        title: input.title,
        content: input.content,
        labels: input.tags || []
      };
      
      const response = await client.post(`/blogs/${auth.blogId}/posts`, postData);
      
      return {
        success: true,
        externalId: response.data.id,
        url: response.data.url,
        metadata: {
          status: response.data.status,
          published: response.data.published
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
    try {
      this.validateAuth(auth, ['blogId', 'apiKey']);
      
      const client = this.createHttpClient(auth, 'https://www.googleapis.com/blogger/v3');
      
      const postData: any = {
        title: input.title,
        content: input.content,
        labels: input.tags || []
      };
      
      const response = await client.put(`/blogs/${auth.blogId}/posts/${postId}`, postData);
      
      return {
        success: true,
        externalId: response.data.id,
        url: response.data.url,
        metadata: {
          status: response.data.status,
          updated: response.data.updated
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deletePost(auth: ProviderCredentials, postId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      this.validateAuth(auth, ['blogId', 'apiKey']);
      
      const client = this.createHttpClient(auth, 'https://www.googleapis.com/blogger/v3');
      await client.delete(`/blogs/${auth.blogId}/posts/${postId}`);
      
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }

  private mapBloggerPost(post: any): ExternalPost {
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      tags: post.labels || [],
      publishedAt: post.published ? new Date(post.published) : undefined,
      status: post.status,
      url: post.url,
      metadata: {
        updated: post.updated,
        authorId: post.author?.id
      }
    };
  }
}