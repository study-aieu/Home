import { BaseCMSAdapter } from './base';
import { ProviderCredentials, PublishInput, PublishResult, ExternalPost, AuthField } from '../types';
import { AxiosRequestConfig } from 'axios';

/**
 * WordPress adapter supporting both WordPress.com and self-hosted WordPress sites
 */
export class WordPressAdapter extends BaseCMSAdapter {
  id = 'wordpress';
  name = 'WordPress';
  description = 'Publish to WordPress.com or self-hosted WordPress sites using REST API';
  website = 'https://wordpress.com';

  authFields: AuthField[] = [
    {
      key: 'siteUrl',
      label: 'Site URL',
      type: 'url',
      required: true,
      placeholder: 'https://yoursite.wordpress.com or https://yoursite.com',
      description: 'Your WordPress site URL'
    },
    {
      key: 'username',
      label: 'Username',
      type: 'text',
      required: true,
      placeholder: 'your-username',
      description: 'WordPress username'
    },
    {
      key: 'password',
      label: 'Application Password',
      type: 'password',
      required: true,
      placeholder: 'xxxx xxxx xxxx xxxx xxxx xxxx',
      description: 'WordPress Application Password (not your login password)'
    }
  ];

  supports = {
    images: true,
    tags: true,
    categories: true,
    scheduling: true,
    drafts: true,
    edit: true,
    delete: true,
    excerpt: true,
    featuredImage: true,
  };

  protected addAuthHeaders(config: AxiosRequestConfig, auth: ProviderCredentials): AxiosRequestConfig {
    const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
    config.headers = {
      ...config.headers,
      'Authorization': `Basic ${credentials}`,
    };
    return config;
  }

  async verifyConnection(auth: ProviderCredentials): Promise<{ ok: boolean; details?: any; error?: string }> {
    try {
      this.validateAuth(auth, ['siteUrl', 'username', 'password']);
      
      const baseURL = this.getApiUrl(auth.siteUrl);
      const client = this.createHttpClient(auth, baseURL);
      
      const response = await client.get('/wp/v2/users/me');
      
      return {
        ok: true,
        details: {
          user: response.data.name,
          id: response.data.id,
          capabilities: response.data.capabilities
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
      this.validateAuth(auth, ['siteUrl', 'username', 'password']);
      
      const baseURL = this.getApiUrl(auth.siteUrl);
      const client = this.createHttpClient(auth, baseURL);
      
      const params = {
        page: opts?.page || 1,
        per_page: Math.min(opts?.limit || 10, 100),
        status: 'publish,draft',
        _embed: true
      };
      
      const response = await client.get('/wp/v2/posts', { params });
      
      return response.data.map((post: any) => this.mapWordPressPost(post));
    } catch (error) {
      this.handleError(error, 'list posts');
    }
  }

  async createPost(auth: ProviderCredentials, input: PublishInput): Promise<PublishResult> {
    try {
      this.validateAuth(auth, ['siteUrl', 'username', 'password']);
      
      const baseURL = this.getApiUrl(auth.siteUrl);
      const client = this.createHttpClient(auth, baseURL);
      
      // Handle categories and tags
      let categoryIds: number[] = [];
      let tagIds: number[] = [];
      
      if (input.categories?.length) {
        categoryIds = await this.getOrCreateCategories(client, input.categories);
      }
      
      if (input.tags?.length) {
        tagIds = await this.getOrCreateTags(client, input.tags);
      }
      
      const postData: any = {
        title: input.title,
        content: input.content,
        excerpt: input.excerpt || '',
        status: input.publishedAt ? 'publish' : 'draft',
        categories: categoryIds,
        tags: tagIds,
      };
      
      if (input.publishedAt) {
        postData.date = input.publishedAt.toISOString();
      }
      
      if (input.featuredImage) {
        // If featured image is provided, we need to upload it first
        // This is a simplified version - in reality, you'd handle file uploads
        postData.featured_media = await this.uploadFeaturedImage(client, input.featuredImage);
      }
      
      const response = await client.post('/wp/v2/posts', postData);
      
      return {
        success: true,
        externalId: response.data.id.toString(),
        url: response.data.link,
        metadata: {
          status: response.data.status,
          slug: response.data.slug
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
      this.validateAuth(auth, ['siteUrl', 'username', 'password']);
      
      const baseURL = this.getApiUrl(auth.siteUrl);
      const client = this.createHttpClient(auth, baseURL);
      
      // Handle categories and tags
      let categoryIds: number[] = [];
      let tagIds: number[] = [];
      
      if (input.categories?.length) {
        categoryIds = await this.getOrCreateCategories(client, input.categories);
      }
      
      if (input.tags?.length) {
        tagIds = await this.getOrCreateTags(client, input.tags);
      }
      
      const postData: any = {
        title: input.title,
        content: input.content,
        excerpt: input.excerpt || '',
        categories: categoryIds,
        tags: tagIds,
      };
      
      if (input.publishedAt) {
        postData.date = input.publishedAt.toISOString();
        postData.status = 'publish';
      }
      
      const response = await client.put(`/wp/v2/posts/${postId}`, postData);
      
      return {
        success: true,
        externalId: response.data.id.toString(),
        url: response.data.link,
        metadata: {
          status: response.data.status,
          slug: response.data.slug
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
      this.validateAuth(auth, ['siteUrl', 'username', 'password']);
      
      const baseURL = this.getApiUrl(auth.siteUrl);
      const client = this.createHttpClient(auth, baseURL);
      
      await client.delete(`/wp/v2/posts/${postId}`, {
        params: { force: true } // Permanently delete
      });
      
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }

  async uploadImage(auth: ProviderCredentials, file: Buffer, filename: string): Promise<{ url: string; id?: string }> {
    try {
      this.validateAuth(auth, ['siteUrl', 'username', 'password']);
      
      const baseURL = this.getApiUrl(auth.siteUrl);
      const client = this.createHttpClient(auth, baseURL);
      
      const formData = new FormData();
      formData.append('file', new Blob([file]), filename);
      
      const response = await client.post('/wp/v2/media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return {
        url: response.data.source_url,
        id: response.data.id.toString()
      };
    } catch (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  private getApiUrl(siteUrl: string): string {
    const url = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
    
    // For WordPress.com sites
    if (url.includes('.wordpress.com')) {
      return `${url}/wp-json`;
    }
    
    // For self-hosted WordPress sites
    return `${url}/wp-json`;
  }

  private mapWordPressPost(post: any): ExternalPost {
    return {
      id: post.id.toString(),
      title: post.title.rendered,
      content: post.content.rendered,
      excerpt: post.excerpt?.rendered,
      tags: post._embedded?.['wp:term']?.[1]?.map((tag: any) => tag.name) || [],
      categories: post._embedded?.['wp:term']?.[0]?.map((cat: any) => cat.name) || [],
      featuredImage: post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
      publishedAt: new Date(post.date),
      status: post.status,
      url: post.link,
      metadata: {
        slug: post.slug,
        modified: post.modified
      }
    };
  }

  private async getOrCreateCategories(client: any, categories: string[]): Promise<number[]> {
    const categoryIds: number[] = [];
    
    for (const categoryName of categories) {
      try {
        // First, try to find existing category
        const searchResponse = await client.get('/wp/v2/categories', {
          params: { search: categoryName }
        });
        
        let categoryId: number;
        
        if (searchResponse.data.length > 0) {
          categoryId = searchResponse.data[0].id;
        } else {
          // Create new category
          const createResponse = await client.post('/wp/v2/categories', {
            name: categoryName
          });
          categoryId = createResponse.data.id;
        }
        
        categoryIds.push(categoryId);
      } catch (error) {
        console.warn(`Failed to handle category "${categoryName}":`, error.message);
      }
    }
    
    return categoryIds;
  }

  private async getOrCreateTags(client: any, tags: string[]): Promise<number[]> {
    const tagIds: number[] = [];
    
    for (const tagName of tags) {
      try {
        // First, try to find existing tag
        const searchResponse = await client.get('/wp/v2/tags', {
          params: { search: tagName }
        });
        
        let tagId: number;
        
        if (searchResponse.data.length > 0) {
          tagId = searchResponse.data[0].id;
        } else {
          // Create new tag
          const createResponse = await client.post('/wp/v2/tags', {
            name: tagName
          });
          tagId = createResponse.data.id;
        }
        
        tagIds.push(tagId);
      } catch (error) {
        console.warn(`Failed to handle tag "${tagName}":`, error.message);
      }
    }
    
    return tagIds;
  }

  private async uploadFeaturedImage(client: any, imageUrl: string): Promise<number | undefined> {
    try {
      // This is a simplified version - in a real implementation,
      // you'd fetch the image and upload it properly
      const response = await client.post('/wp/v2/media', {
        source_url: imageUrl
      });
      
      return response.data.id;
    } catch (error) {
      console.warn('Failed to set featured image:', error.message);
      return undefined;
    }
  }
}