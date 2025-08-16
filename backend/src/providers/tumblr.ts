import { BaseCMSAdapter } from './base';
import { ProviderCredentials, PublishInput, PublishResult, ExternalPost, AuthField } from '../types';
import { AxiosRequestConfig } from 'axios';

/**
 * Tumblr adapter for Tumblr platform
 */
export class TumblrAdapter extends BaseCMSAdapter {
  id = 'tumblr';
  name = 'Tumblr';
  description = 'Publish to Tumblr blog';
  website = 'https://tumblr.com';

  authFields: AuthField[] = [
    {
      key: 'blogName',
      label: 'Blog Name',
      type: 'text',
      required: true,
      placeholder: 'yourblog.tumblr.com',
      description: 'Your Tumblr blog name'
    },
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Your Tumblr API key',
      description: 'Get this from Tumblr app settings'
    }
  ];

  supports = {
    images: true,
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
      api_key: auth.apiKey
    };
    return config;
  }

  async verifyConnection(auth: ProviderCredentials): Promise<{ ok: boolean; details?: any; error?: string }> {
    try {
      this.validateAuth(auth, ['blogName', 'apiKey']);
      
      const client = this.createHttpClient(auth, 'https://api.tumblr.com/v2');
      const blogIdentifier = this.getBlogIdentifier(auth.blogName);
      const response = await client.get(`/blog/${blogIdentifier}/info`);
      
      return {
        ok: true,
        details: {
          title: response.data.response.blog.title,
          description: response.data.response.blog.description,
          url: response.data.response.blog.url,
          posts: response.data.response.blog.posts
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
      this.validateAuth(auth, ['blogName', 'apiKey']);
      
      const client = this.createHttpClient(auth, 'https://api.tumblr.com/v2');
      const blogIdentifier = this.getBlogIdentifier(auth.blogName);
      
      const params = {
        limit: Math.min(opts?.limit || 10, 50),
        offset: opts?.page ? (opts.page - 1) * (opts.limit || 10) : 0,
        type: 'text'
      };
      
      const response = await client.get(`/blog/${blogIdentifier}/posts`, { params });
      
      return response.data.response.posts.map((post: any) => this.mapTumblrPost(post));
    } catch (error) {
      this.handleError(error, 'list posts');
    }
  }

  async createPost(auth: ProviderCredentials, input: PublishInput): Promise<PublishResult> {
    try {
      this.validateAuth(auth, ['blogName', 'apiKey']);
      
      const client = this.createHttpClient(auth, 'https://api.tumblr.com/v2');
      const blogIdentifier = this.getBlogIdentifier(auth.blogName);
      
      const postData: any = {
        type: 'text',
        title: input.title,
        body: input.content,
        tags: input.tags?.join(',') || '',
        state: input.publishedAt ? 'published' : 'draft'
      };
      
      const response = await client.post(`/blog/${blogIdentifier}/post`, postData);
      
      return {
        success: true,
        externalId: response.data.response.id?.toString(),
        url: `https://${blogIdentifier}/post/${response.data.response.id}`,
        metadata: {
          state: postData.state
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
      this.validateAuth(auth, ['blogName', 'apiKey']);
      
      const client = this.createHttpClient(auth, 'https://api.tumblr.com/v2');
      const blogIdentifier = this.getBlogIdentifier(auth.blogName);
      
      const postData: any = {
        type: 'text',
        title: input.title,
        body: input.content,
        tags: input.tags?.join(',') || '',
        state: input.publishedAt ? 'published' : 'draft'
      };
      
      const response = await client.post(`/blog/${blogIdentifier}/post/edit`, {
        ...postData,
        id: postId
      });
      
      return {
        success: true,
        externalId: postId,
        url: `https://${blogIdentifier}/post/${postId}`,
        metadata: {
          state: postData.state
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
      this.validateAuth(auth, ['blogName', 'apiKey']);
      
      const client = this.createHttpClient(auth, 'https://api.tumblr.com/v2');
      const blogIdentifier = this.getBlogIdentifier(auth.blogName);
      
      await client.post(`/blog/${blogIdentifier}/post/delete`, {
        id: postId
      });
      
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }

  private getBlogIdentifier(blogName: string): string {
    // Handle both "blogname" and "blogname.tumblr.com" formats
    if (blogName.includes('.tumblr.com')) {
      return blogName;
    }
    return `${blogName}.tumblr.com`;
  }

  private mapTumblrPost(post: any): ExternalPost {
    return {
      id: post.id?.toString(),
      title: post.title || post.summary || '',
      content: post.body || '',
      tags: post.tags || [],
      publishedAt: post.date ? new Date(post.date) : undefined,
      status: post.state,
      url: post.post_url,
      metadata: {
        type: post.type,
        noteCount: post.note_count
      }
    };
  }
}