import { PrismaClient } from '@prisma/client';
import { Connection, ProviderCredentials } from '../types';
import { encrypt, decrypt } from '../utils/encryption';
import { getProvider } from '../providers';

const prisma = new PrismaClient();

export class ConnectionService {
  /**
   * Create a new provider connection
   */
  async createConnection(
    userId: string,
    providerId: string,
    name: string,
    credentials: ProviderCredentials
  ): Promise<Connection> {
    // Verify the provider exists
    const provider = getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }

    // Verify the connection works
    const verification = await provider.verifyConnection(credentials);
    if (!verification.ok) {
      throw new Error(`Connection verification failed: ${verification.error}`);
    }

    // Encrypt credentials
    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    // Create connection in database
    const connection = await prisma.connection.create({
      data: {
        userId,
        providerId,
        name,
        credentials: encryptedCredentials,
        isActive: true,
        lastSync: new Date()
      }
    });

    return {
      ...connection,
      credentials: credentials // Return decrypted credentials
    };
  }

  /**
   * Get all connections for a user
   */
  async getUserConnections(userId: string): Promise<Connection[]> {
    const connections = await prisma.connection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return connections.map(connection => ({
      ...connection,
      credentials: this.decryptCredentials(connection.credentials)
    }));
  }

  /**
   * Get a specific connection by ID
   */
  async getConnection(userId: string, connectionId: string): Promise<Connection | null> {
    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        userId
      }
    });

    if (!connection) {
      return null;
    }

    return {
      ...connection,
      credentials: this.decryptCredentials(connection.credentials)
    };
  }

  /**
   * Update a connection
   */
  async updateConnection(
    userId: string,
    connectionId: string,
    updates: {
      name?: string;
      credentials?: ProviderCredentials;
      isActive?: boolean;
    }
  ): Promise<Connection> {
    const connection = await this.getConnection(userId, connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const updateData: any = {};

    if (updates.name) {
      updateData.name = updates.name;
    }

    if (updates.isActive !== undefined) {
      updateData.isActive = updates.isActive;
    }

    if (updates.credentials) {
      // Verify the new credentials work
      const provider = getProvider(connection.providerId);
      if (provider) {
        const verification = await provider.verifyConnection(updates.credentials);
        if (!verification.ok) {
          throw new Error(`Connection verification failed: ${verification.error}`);
        }
      }

      updateData.credentials = encrypt(JSON.stringify(updates.credentials));
      updateData.lastSync = new Date();
    }

    const updatedConnection = await prisma.connection.update({
      where: { id: connectionId },
      data: updateData
    });

    return {
      ...updatedConnection,
      credentials: updates.credentials || connection.credentials
    };
  }

  /**
   * Delete a connection
   */
  async deleteConnection(userId: string, connectionId: string): Promise<void> {
    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        userId
      }
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    await prisma.connection.delete({
      where: { id: connectionId }
    });
  }

  /**
   * Verify a connection is still working
   */
  async verifyConnection(userId: string, connectionId: string): Promise<{ ok: boolean; details?: any; error?: string }> {
    const connection = await this.getConnection(userId, connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const provider = getProvider(connection.providerId);
    if (!provider) {
      throw new Error(`Provider '${connection.providerId}' not found`);
    }

    try {
      const result = await provider.verifyConnection(connection.credentials);

      // Update last sync time if verification succeeds
      if (result.ok) {
        await prisma.connection.update({
          where: { id: connectionId },
          data: { lastSync: new Date() }
        });
      }

      return result;
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }

  /**
   * Get connections for a specific provider
   */
  async getConnectionsByProvider(userId: string, providerId: string): Promise<Connection[]> {
    const connections = await prisma.connection.findMany({
      where: {
        userId,
        providerId,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return connections.map(connection => ({
      ...connection,
      credentials: this.decryptCredentials(connection.credentials)
    }));
  }

  /**
   * Test connection and get sample data
   */
  async testConnection(
    userId: string,
    connectionId: string
  ): Promise<{ posts: any[]; details: any }> {
    const connection = await this.getConnection(userId, connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const provider = getProvider(connection.providerId);
    if (!provider) {
      throw new Error(`Provider '${connection.providerId}' not found`);
    }

    try {
      // Get verification details
      const verification = await provider.verifyConnection(connection.credentials);
      if (!verification.ok) {
        throw new Error(`Connection failed: ${verification.error}`);
      }

      // Get sample posts
      const posts = await provider.listPosts(connection.credentials, { limit: 5 });

      return {
        details: verification.details,
        posts
      };
    } catch (error) {
      throw new Error(`Test failed: ${error.message}`);
    }
  }

  /**
   * Sync posts from a connection
   */
  async syncPosts(userId: string, connectionId: string): Promise<{ synced: number; errors: string[] }> {
    const connection = await this.getConnection(userId, connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const provider = getProvider(connection.providerId);
    if (!provider) {
      throw new Error(`Provider '${connection.providerId}' not found`);
    }

    try {
      const externalPosts = await provider.listPosts(connection.credentials, { limit: 50 });
      const errors: string[] = [];
      let synced = 0;

      for (const externalPost of externalPosts) {
        try {
          // Check if post already exists
          const existingPost = await prisma.post.findFirst({
            where: {
              connectionId,
              externalId: externalPost.id
            }
          });

          if (existingPost) {
            // Update existing post
            await prisma.post.update({
              where: { id: existingPost.id },
              data: {
                title: externalPost.title,
                content: externalPost.content,
                excerpt: externalPost.excerpt,
                tags: externalPost.tags || [],
                categories: externalPost.categories || [],
                featuredImage: externalPost.featuredImage,
                status: this.mapStatus(externalPost.status),
                publishedAt: externalPost.publishedAt,
                metadata: externalPost.metadata || {}
              }
            });
          } else {
            // Create new post
            await prisma.post.create({
              data: {
                userId,
                connectionId,
                externalId: externalPost.id,
                title: externalPost.title,
                content: externalPost.content,
                excerpt: externalPost.excerpt,
                tags: externalPost.tags || [],
                categories: externalPost.categories || [],
                featuredImage: externalPost.featuredImage,
                status: this.mapStatus(externalPost.status),
                publishedAt: externalPost.publishedAt,
                metadata: externalPost.metadata || {}
              }
            });
          }

          synced++;
        } catch (error) {
          errors.push(`Failed to sync post "${externalPost.title}": ${error.message}`);
        }
      }

      // Update last sync time
      await prisma.connection.update({
        where: { id: connectionId },
        data: { lastSync: new Date() }
      });

      return { synced, errors };
    } catch (error) {
      throw new Error(`Sync failed: ${error.message}`);
    }
  }

  /**
   * Decrypt credentials from database
   */
  private decryptCredentials(encryptedCredentials: any): ProviderCredentials {
    try {
      if (typeof encryptedCredentials === 'string') {
        const decrypted = decrypt(encryptedCredentials);
        return JSON.parse(decrypted);
      }
      return encryptedCredentials;
    } catch (error) {
      throw new Error('Failed to decrypt credentials');
    }
  }

  /**
   * Map external post status to internal status
   */
  private mapStatus(externalStatus?: string): 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'FAILED' {
    if (!externalStatus) return 'DRAFT';

    const status = externalStatus.toLowerCase();
    
    if (status.includes('publish') || status === 'public') return 'PUBLISHED';
    if (status.includes('draft')) return 'DRAFT';
    if (status.includes('schedule')) return 'SCHEDULED';
    
    return 'PUBLISHED'; // Default to published for unknown statuses
  }
}