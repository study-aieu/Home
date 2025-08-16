const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class HashnodeAdapter {
  constructor() {
    this.name = 'Hashnode';
    this.slug = 'hashnode';
    this.description = 'Hashnode developer blogging platform';
    this.category = 'developer-platform';
    this.authType = 'api-key';
    this.features = {
      images: true,
      tags: true,
      scheduling: true,
      edit: true,
      delete: true,
      categories: false, // Hashnode uses tags instead
      excerpts: true,
      featuredImages: true,
      customFields: true
    };
    this.website = 'https://hashnode.com';
    this.apiDocs = 'https://api.hashnode.com';
  }

  async verifyConnection(connection) {
    try {
      const { apiKey, publicationId } = connection.credentials;
      
      if (!apiKey || !publicationId) {
        throw new Error('Missing required credentials: apiKey and publicationId');
      }

      // Test the connection by fetching publication info
      const response = await fetch('https://api.hashnode.com/', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            query {
              publication(id: "${publicationId}") {
                id
                title
                domain
                isTeam
              }
            }
          `
        })
      });

      if (!response.ok) {
        throw new Error(`Hashnode API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      return {
        valid: true,
        publicationInfo: data.data.publication,
        message: 'Connection verified successfully'
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async listPosts(connection, options = {}) {
    try {
      const { apiKey, publicationId } = connection.credentials;
      const { limit = 20, offset = 0 } = options;

      const response = await fetch('https://api.hashnode.com/', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            query {
              publication(id: "${publicationId}") {
                posts(page: ${Math.floor(offset / limit) + 1}, limit: ${limit}) {
                  _id
                  title
                  brief
                  slug
                  dateAdded
                  dateUpdated
                  isPublished
                  tags {
                    name
                  }
                  coverImage
                  totalReactions
                  responseCount
                }
              }
            }
          `
        })
      });

      if (!response.ok) {
        throw new Error(`Hashnode API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      const posts = data.data.publication.posts.map(post => this._transformPost(post));

      return {
        posts,
        total: posts.length,
        hasMore: posts.length === limit
      };
    } catch (error) {
      throw new Error(`Failed to list Hashnode posts: ${error.message}`);
    }
  }

  async createPost(connection, postData) {
    try {
      const { apiKey, publicationId } = connection.credentials;
      const { title, content, excerpt, tags = [], state = 'draft', publishOn, featuredImage, isRepublished, originalArticleURL } = postData;

      // Prepare the post data for Hashnode
      const hashnodePost = {
        title: title,
        contentMarkdown: content,
        brief: excerpt || '',
        tags: tags.map(tag => ({ name: tag })),
        isPublished: state === 'published',
        coverImageOptions: featuredImage ? { coverImageURL: featuredImage } : undefined,
        isRepublished: isRepublished || false,
        originalArticleURL: originalArticleURL || undefined
      };

      // Add scheduling if specified
      if (publishOn && state === 'scheduled') {
        hashnodePost.publishAt = new Date(publishOn).toISOString();
      }

      const response = await fetch('https://api.hashnode.com/', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            mutation createStory($input: CreateStoryInput!) {
              createStory(input: $input) {
                code
                success
                message
                post {
                  _id
                  slug
                  publication {
                    domain
                  }
                }
              }
            }
          `,
          variables: {
            input: {
              ...hashnodePost,
              publicationId: publicationId
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Hashnode API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      if (!data.data.createStory.success) {
        throw new Error(`Failed to create post: ${data.data.createStory.message}`);
      }

      const post = data.data.createStory.post;
      return {
        id: post._id,
        url: `https://${post.publication.domain}/${post.slug}`,
        message: 'Post created successfully on Hashnode'
      };
    } catch (error) {
      throw new Error(`Failed to create Hashnode post: ${error.message}`);
    }
  }

  async updatePost(connection, postId, postData) {
    try {
      const { apiKey } = connection.credentials;
      const { title, content, excerpt, tags = [], state = 'published', publishOn, featuredImage } = postData;

      // Prepare the update data
      const updateData = {
        title: title,
        contentMarkdown: content,
        brief: excerpt || '',
        tags: tags.map(tag => ({ name: tag })),
        isPublished: state === 'published'
      };

      // Add featured image if provided
      if (featuredImage) {
        updateData.coverImageOptions = { coverImageURL: featuredImage };
      }

      const response = await fetch('https://api.hashnode.com/', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            mutation updateStory($input: UpdateStoryInput!) {
              updateStory(input: $input) {
                code
                success
                message
              }
            }
          `,
          variables: {
            input: {
              ...updateData,
              id: postId
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Hashnode API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      if (!data.data.updateStory.success) {
        throw new Error(`Failed to update post: ${data.data.updateStory.message}`);
      }

      return {
        id: postId,
        message: 'Post updated successfully on Hashnode'
      };
    } catch (error) {
      throw new Error(`Failed to update Hashnode post: ${error.message}`);
    }
  }

  async deletePost(connection, postId) {
    try {
      const { apiKey } = connection.credentials;

      const response = await fetch('https://api.hashnode.com/', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            mutation deleteStory($id: String!) {
              deleteStory(id: $id) {
                code
                success
                message
              }
            }
          `,
          variables: {
            id: postId
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Hashnode API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      if (!data.data.deleteStory.success) {
        throw new Error(`Failed to delete post: ${data.data.deleteStory.message}`);
      }

      return {
        id: postId,
        message: 'Post deleted successfully from Hashnode'
      };
    } catch (error) {
      throw new Error(`Failed to delete Hashnode post: ${error.message}`);
    }
  }

  async uploadImage(connection, imageBuffer, filename) {
    try {
      const { apiKey } = connection.credentials;
      
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      
      const response = await fetch('https://api.hashnode.com/', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            mutation uploadImage($input: UploadImageInput!) {
              uploadImage(input: $input) {
                code
                success
                message
                url
              }
            }
          `,
          variables: {
            input: {
              image: base64Image,
              filename: filename
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Hashnode API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      if (!data.data.uploadImage.success) {
        throw new Error(`Failed to upload image: ${data.data.uploadImage.message}`);
      }

      return {
        id: Date.now().toString(), // Hashnode doesn't return an ID for uploads
        url: data.data.uploadImage.url,
        imageUrl: data.data.uploadImage.url,
        message: 'Image uploaded successfully to Hashnode'
      };
    } catch (error) {
      throw new Error(`Failed to upload image to Hashnode: ${error.message}`);
    }
  }

  // Helper method to transform Hashnode post data to our standard format
  _transformPost(hashnodePost) {
    return {
      id: hashnodePost._id,
      title: hashnodePost.title || 'Untitled',
      content: hashnodePost.contentMarkdown || '',
      excerpt: hashnodePost.brief || '',
      tags: hashnodePost.tags?.map(tag => tag.name) || [],
      url: `https://hashnode.com/${hashnodePost.slug}`,
      state: hashnodePost.isPublished ? 'published' : 'draft',
      publishedAt: hashnodePost.dateAdded ? new Date(hashnodePost.dateAdded) : null,
      createdAt: hashnodePost.dateAdded ? new Date(hashnodePost.dateAdded) : null,
      updatedAt: hashnodePost.dateUpdated ? new Date(hashnodePost.dateUpdated) : null,
      featuredImage: hashnodePost.coverImage || null,
      customFields: {
        slug: hashnodePost.slug,
        totalReactions: hashnodePost.totalReactions,
        responseCount: hashnodePost.responseCount,
        isPublished: hashnodePost.isPublished
      }
    };
  }

  // Helper method to generate a slug from title
  _generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Helper method to get available tags
  async getTags(connection) {
    try {
      const { apiKey } = connection.credentials;

      const response = await fetch('https://api.hashnode.com/', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            query {
              tags(first: 100) {
                edges {
                  node {
                    name
                    slug
                    tagline
                    followersCount
                  }
                }
              }
            }
          `
        })
      });

      if (!response.ok) {
        throw new Error(`Hashnode API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      return data.data.tags.edges.map(edge => edge.node);
    } catch (error) {
      throw new Error(`Failed to get Hashnode tags: ${error.message}`);
    }
  }
}

module.exports = HashnodeAdapter;