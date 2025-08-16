const { PrismaClient } = require('@prisma/client');
const { getProviderAdapter } = require('../providers');

const prisma = new PrismaClient();

/**
 * Verify a connection with a specific provider
 * @param {string} providerName - The name of the provider
 * @param {object} credentials - The credentials to verify
 * @returns {Promise<{ok: boolean, details?: any}>}
 */
async function verifyProviderConnection(providerName, credentials) {
  try {
    // Get the provider adapter
    const adapter = getProviderAdapter(providerName);
    
    if (!adapter) {
      return {
        ok: false,
        details: `Provider '${providerName}' not supported`
      };
    }

    // Verify the connection using the adapter
    const result = await adapter.verifyConnection(credentials);
    
    return result;
  } catch (error) {
    console.error(`Connection verification failed for ${providerName}:`, error);
    return {
      ok: false,
      details: error.message
    };
  }
}

/**
 * Get posts from a specific provider
 * @param {string} providerName - The name of the provider
 * @param {object} credentials - The credentials for the provider
 * @param {object} options - Options for fetching posts
 * @returns {Promise<Array>}
 */
async function getProviderPosts(providerName, credentials, options = {}) {
  try {
    const adapter = getProviderAdapter(providerName);
    
    if (!adapter) {
      throw new Error(`Provider '${providerName}' not supported`);
    }

    const posts = await adapter.listPosts(credentials, options);
    return posts;
  } catch (error) {
    console.error(`Failed to get posts from ${providerName}:`, error);
    throw error;
  }
}

/**
 * Create a post on a specific provider
 * @param {string} providerName - The name of the provider
 * @param {object} credentials - The credentials for the provider
 * @param {object} postData - The post data to create
 * @returns {Promise<object>}
 */
async function createProviderPost(providerName, credentials, postData) {
  try {
    const adapter = getProviderAdapter(providerName);
    
    if (!adapter) {
      throw new Error(`Provider '${providerName}' not supported`);
    }

    const result = await adapter.createPost(credentials, postData);
    return result;
  } catch (error) {
    console.error(`Failed to create post on ${providerName}:`, error);
    throw error;
  }
}

/**
 * Update a post on a specific provider
 * @param {string} providerName - The name of the provider
 * @param {object} credentials - The credentials for the provider
 * @param {string} postId - The ID of the post to update
 * @param {object} postData - The updated post data
 * @returns {Promise<object>}
 */
async function updateProviderPost(providerName, credentials, postId, postData) {
  try {
    const adapter = getProviderAdapter(providerName);
    
    if (!adapter) {
      throw new Error(`Provider '${providerName}' not supported`);
    }

    const result = await adapter.updatePost(credentials, postId, postData);
    return result;
  } catch (error) {
    console.error(`Failed to update post on ${providerName}:`, error);
    throw error;
  }
}

/**
 * Delete a post on a specific provider
 * @param {string} providerName - The name of the provider
 * @param {object} credentials - The credentials for the provider
 * @param {string} postId - The ID of the post to delete
 * @returns {Promise<object>}
 */
async function deleteProviderPost(providerName, credentials, postId) {
  try {
    const adapter = getProviderAdapter(providerName);
    
    if (!adapter) {
      throw new Error(`Provider '${providerName}' not supported`);
    }

    const result = await adapter.deletePost(credentials, postId);
    return result;
  } catch (error) {
    console.error(`Failed to delete post on ${providerName}:`, error);
    throw error;
  }
}

/**
 * Upload an image to a specific provider
 * @param {string} providerName - The name of the provider
 * @param {object} credentials - The credentials for the provider
 * @param {Buffer} fileBuffer - The image file buffer
 * @param {string} filename - The filename
 * @returns {Promise<object>}
 */
async function uploadProviderImage(providerName, credentials, fileBuffer, filename) {
  try {
    const adapter = getProviderAdapter(providerName);
    
    if (!adapter) {
      throw new Error(`Provider '${providerName}' not supported`);
    }

    if (!adapter.uploadImage) {
      throw new Error(`Provider '${providerName}' does not support image uploads`);
    }

    const result = await adapter.uploadImage(credentials, fileBuffer, filename);
    return result;
  } catch (error) {
    console.error(`Failed to upload image to ${providerName}:`, error);
    throw error;
  }
}

/**
 * Get provider capabilities
 * @param {string} providerName - The name of the provider
 * @returns {Promise<object|null>}
 */
async function getProviderCapabilities(providerName) {
  try {
    const adapter = getProviderAdapter(providerName);
    
    if (!adapter) {
      return null;
    }

    return adapter.supports;
  } catch (error) {
    console.error(`Failed to get capabilities for ${providerName}:`, error);
    return null;
  }
}

/**
 * Check if a provider supports a specific feature
 * @param {string} providerName - The name of the provider
 * @param {string} feature - The feature to check
 * @returns {Promise<boolean>}
 */
async function providerSupportsFeature(providerName, feature) {
  try {
    const capabilities = await getProviderCapabilities(providerName);
    
    if (!capabilities) {
      return false;
    }

    return capabilities[feature] === true;
  } catch (error) {
    console.error(`Failed to check feature support for ${providerName}:`, error);
    return false;
  }
}

/**
 * Get all active providers from database
 * @returns {Promise<Array>}
 */
async function getAllProviders() {
  try {
    const providers = await prisma.provider.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' }
      ]
    });

    return providers;
  } catch (error) {
    console.error('Failed to get providers:', error);
    throw error;
  }
}

/**
 * Get provider by name
 * @param {string} name - The provider name
 * @returns {Promise<object|null>}
 */
async function getProviderByName(name) {
  try {
    const provider = await prisma.provider.findUnique({
      where: { name, isActive: true }
    });

    return provider;
  } catch (error) {
    console.error(`Failed to get provider ${name}:`, error);
    throw error;
  }
}

/**
 * Get providers by category
 * @param {string} category - The provider category
 * @returns {Promise<Array>}
 */
async function getProvidersByCategory(category) {
  try {
    const providers = await prisma.provider.findMany({
      where: { 
        category,
        isActive: true 
      },
      orderBy: { displayName: 'asc' }
    });

    return providers;
  } catch (error) {
    console.error(`Failed to get providers for category ${category}:`, error);
    throw error;
  }
}

module.exports = {
  verifyProviderConnection,
  getProviderPosts,
  createProviderPost,
  updateProviderPost,
  deleteProviderPost,
  uploadProviderImage,
  getProviderCapabilities,
  providerSupportsFeature,
  getAllProviders,
  getProviderByName,
  getProvidersByCategory
};