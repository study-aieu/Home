import { CMSAdapter, ProviderRegistry } from '../types';
import { WordPressAdapter } from './wordpress';
import { MediumAdapter } from './medium';
import { GhostAdapter } from './ghost';
import { BloggerAdapter } from './blogger';
import { TumblrAdapter } from './tumblr';
import { ContentfulAdapter } from './contentful';

/**
 * Registry of all available CMS adapters
 * Each provider must implement the CMSAdapter interface
 */
export const providerRegistry: ProviderRegistry = {
  wordpress: new WordPressAdapter(),
  medium: new MediumAdapter(),
  ghost: new GhostAdapter(),
  blogger: new BloggerAdapter(),
  tumblr: new TumblrAdapter(),
  contentful: new ContentfulAdapter(),
};

/**
 * Get all available providers
 */
export function getAllProviders(): CMSAdapter[] {
  return Object.values(providerRegistry);
}

/**
 * Get a specific provider by ID
 */
export function getProvider(providerId: string): CMSAdapter | undefined {
  return providerRegistry[providerId];
}

/**
 * Check if a provider exists
 */
export function hasProvider(providerId: string): boolean {
  return providerId in providerRegistry;
}

/**
 * Get providers that support specific features
 */
export function getProvidersByFeature(feature: keyof CMSAdapter['supports']): CMSAdapter[] {
  return getAllProviders().filter(provider => provider.supports[feature]);
}

/**
 * Get provider summary information for the mobile app
 */
export function getProviderSummaries() {
  return getAllProviders().map(provider => ({
    id: provider.id,
    name: provider.name,
    description: provider.description,
    website: provider.website,
    supports: provider.supports,
    authFields: provider.authFields
  }));
}

// Export individual adapters for direct use
export { WordPressAdapter } from './wordpress';
export { MediumAdapter } from './medium';
export { GhostAdapter } from './ghost';
export { BloggerAdapter } from './blogger';
export { TumblrAdapter } from './tumblr';
export { ContentfulAdapter } from './contentful';
export { BaseCMSAdapter } from './base';