import { BaseCMSAdapter } from './base';
import { ProviderCredentials, PublishInput, PublishResult, ExternalPost, AuthField } from '../types';
import { AxiosRequestConfig } from 'axios';

/**
 * Contentful adapter for headless CMS
 */
export class ContentfulAdapter extends BaseCMSAdapter {
  id = 'contentful';
  name = 'Contentful';
  description = 'Publish to Contentful headless CMS';
  website = 'https://contentful.com';

  authFields: AuthField[] = [
    {
      key: 'spaceId',
      label: 'Space ID',
      type: 'text',
      required: true,
      placeholder: 'Your Contentful space ID',
      description: 'Find this in your Contentful space settings'
    },
    {
      key: 'accessToken',
      label: 'Management API Token',
      type: 'password',
      required: true,
      placeholder: 'Your Contentful management token',
      description: 'Create this in your Contentful space settings'
    },
    {
      key: 'contentTypeId',
      label: 'Content Type ID',
      type: 'text',
      required: true,
      placeholder: 'blogPost',
      description: 'The content type ID for blog posts'
    }
  ];

  supports = {
    images: true,
    tags: true,
    categories: true,
    scheduling: false,
    drafts: true,
    edit: true,
    delete: true,
    excerpt: true,
    featuredImage: true,
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
      this.validateAuth(auth, ['spaceId', 'accessToken', 'contentTypeId']);
      
      const client = this.createHttpClient(auth, `https://api.contentful.com/spaces/${auth.spaceId}`);
      const response = await client.get('');
      
      // Also verify the content type exists
      const contentTypeResponse = await client.get(`/content_types/${auth.contentTypeId}`);
      
      return {
        ok: true,
        details: {
          spaceName: response.data.name,
          defaultLocale: response.data.defaultLocale,
          contentType: contentTypeResponse.data.name
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
      this.validateAuth(auth, ['spaceId', 'accessToken', 'contentTypeId']);
      
      const client = this.createHttpClient(auth, `https://api.contentful.com/spaces/${auth.spaceId}`);
      
      const params = {
        content_type: auth.contentTypeId,
        limit: Math.min(opts?.limit || 10, 100),
        skip: opts?.page ? (opts.page - 1) * (opts.limit || 10) : 0,
        order: '-sys.createdAt'
      };
      
      const response = await client.get('/entries', { params });
      
      return response.data.items.map((entry: any) => this.mapContentfulEntry(entry));
    } catch (error) {
      this.handleError(error, 'list posts');
    }
  }

  async createPost(auth: ProviderCredentials, input: PublishInput): Promise<PublishResult> {
    try {
      this.validateAuth(auth, ['spaceId', 'accessToken', 'contentTypeId']);
      
      const client = this.createHttpClient(auth, `https://api.contentful.com/spaces/${auth.spaceId}`);
      
      const entryData = {
        fields: {
          title: {
            'en-US': input.title
          },
          content: {
            'en-US': input.content
          },
          excerpt: {
            'en-US': input.excerpt || ''
          },
          tags: {
            'en-US': input.tags || []
          },
          categories: {
            'en-US': input.categories || []
          }
        }
      };
      
      if (input.featuredImage) {
        // In a real implementation, you'd upload the image first
        entryData.fields['featuredImage'] = {
          'en-US': {
            sys: {
              type: 'Link',
              linkType: 'Asset',
              id: 'featured-image-asset-id' // This would be the uploaded asset ID
            }
          }
        };
      }
      
      const response = await client.post(`/entries`, entryData, {
        headers: {
          'X-Contentful-Content-Type': auth.contentTypeId
        }
      });
      
      const entryId = response.data.sys.id;
      
      // Publish the entry if publishedAt is provided
      if (input.publishedAt) {
        await client.put(`/entries/${entryId}/published`, {}, {
          headers: {
            'X-Contentful-Version': response.data.sys.version
          }
        });
      }
      
      return {
        success: true,
        externalId: entryId,
        url: `https://app.contentful.com/spaces/${auth.spaceId}/entries/${entryId}`,
        metadata: {
          version: response.data.sys.version,
          published: !!input.publishedAt
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
      this.validateAuth(auth, ['spaceId', 'accessToken', 'contentTypeId']);
      
      const client = this.createHttpClient(auth, `https://api.contentful.com/spaces/${auth.spaceId}`);
      
      // Get current entry to get version
      const currentEntry = await client.get(`/entries/${postId}`);
      
      const entryData = {
        fields: {
          title: {
            'en-US': input.title
          },
          content: {
            'en-US': input.content
          },
          excerpt: {
            'en-US': input.excerpt || ''
          },
          tags: {
            'en-US': input.tags || []
          },
          categories: {
            'en-US': input.categories || []
          }
        }
      };
      
      const response = await client.put(`/entries/${postId}`, entryData, {
        headers: {
          'X-Contentful-Version': currentEntry.data.sys.version
        }
      });
      
      // Publish if needed
      if (input.publishedAt) {
        await client.put(`/entries/${postId}/published`, {}, {
          headers: {
            'X-Contentful-Version': response.data.sys.version
          }
        });
      }
      
      return {
        success: true,
        externalId: postId,
        url: `https://app.contentful.com/spaces/${auth.spaceId}/entries/${postId}`,
        metadata: {
          version: response.data.sys.version,
          published: !!input.publishedAt
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
      this.validateAuth(auth, ['spaceId', 'accessToken', 'contentTypeId']);
      
      const client = this.createHttpClient(auth, `https://api.contentful.com/spaces/${auth.spaceId}`);
      
      // Unpublish first if published
      try {
        await client.delete(`/entries/${postId}/published`);
      } catch {
        // Entry might not be published, continue
      }
      
      // Delete the entry
      await client.delete(`/entries/${postId}`);
      
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
      this.validateAuth(auth, ['spaceId', 'accessToken']);
      
      const client = this.createHttpClient(auth, `https://upload.contentful.com/spaces/${auth.spaceId}`);
      
      // Upload the file
      const uploadResponse = await client.post('/assets', file, {
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });
      
      const assetId = uploadResponse.data.sys.id;
      
      // Create asset metadata
      const assetData = {
        fields: {
          title: {
            'en-US': filename
          },
          file: {
            'en-US': {
              fileName: filename,
              contentType: 'image/jpeg', // You'd detect this properly
              uploadFrom: uploadResponse.data
            }
          }
        }
      };
      
      const assetResponse = await client.put(`/assets/${assetId}`, assetData, {
        headers: {
          'X-Contentful-Version': 1
        }
      });
      
      // Process the asset
      await client.put(`/assets/${assetId}/files/en-US/process`, {}, {
        headers: {
          'X-Contentful-Version': assetResponse.data.sys.version
        }
      });
      
      return {
        url: `https:${assetResponse.data.fields.file['en-US'].url}`,
        id: assetId
      };
    } catch (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  private mapContentfulEntry(entry: any): ExternalPost {
    const fields = entry.fields;
    
    return {
      id: entry.sys.id,
      title: fields.title?.['en-US'] || '',
      content: fields.content?.['en-US'] || '',
      excerpt: fields.excerpt?.['en-US'],
      tags: fields.tags?.['en-US'] || [],
      categories: fields.categories?.['en-US'] || [],
      featuredImage: fields.featuredImage?.['en-US']?.fields?.file?.['en-US']?.url,
      publishedAt: entry.sys.publishedAt ? new Date(entry.sys.publishedAt) : undefined,
      status: entry.sys.publishedAt ? 'published' : 'draft',
      url: `https://app.contentful.com/spaces/${entry.sys.space.sys.id}/entries/${entry.sys.id}`,
      metadata: {
        version: entry.sys.version,
        updatedAt: entry.sys.updatedAt,
        contentType: entry.sys.contentType.sys.id
      }
    };
  }
}