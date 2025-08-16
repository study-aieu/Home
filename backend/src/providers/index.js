/**
 * Universal Blog Publisher - Provider Adapters
 * 
 * This file exports all available CMS adapters and provides
 * a factory function to get adapters by provider name.
 */

// Import all provider adapters
const WordPressAdapter = require('./wordpress');
const MediumAdapter = require('./medium');
const GhostAdapter = require('./ghost');
const ContentfulAdapter = require('./contentful');
const SanityAdapter = require('./sanity');
const StrapiAdapter = require('./strapi');
const PrismicAdapter = require('./prismic');
const DirectusAdapter = require('./directus');
const PayloadCMSAdapter = require('./payload-cms');
const NetlifyCMSAdapter = require('./netlify-cms');
const ForestryAdapter = require('./forestry');
const DatoCMSAdapter = require('./dato-cms');
const HygraphAdapter = require('./hygraph');
const WixAdapter = require('./wix');
const SquarespaceAdapter = require('./squarespace');
const WeeblyAdapter = require('./weebly');
const WebflowAdapter = require('./webflow');
const ShopifyAdapter = require('./shopify');
const BigCommerceAdapter = require('./bigcommerce');
const WooCommerceAdapter = require('./woocommerce');
const BloggerAdapter = require('./blogger');
const TumblrAdapter = require('./tumblr');
const SubstackAdapter = require('./substack');
const HashnodeAdapter = require('./hashnode');
const DevToAdapter = require('./devto');
const LinkedInAdapter = require('./linkedin');
const NotionAdapter = require('./notion');
const CarrdAdapter = require('./carrd');
const TildaAdapter = require('./tilda');
const UcraftAdapter = require('./ucraft');
const VoogAdapter = require('./voog');
const WebnodeAdapter = require('./webnode');
const MozelloAdapter = require('./mozello');
const DudaAdapter = require('./duda');
const OneComAdapter = require('./one-com');
const OdooAdapter = require('./odoo');
const NationBuilderAdapter = require('./nationbuilder');
const ButterCMSAdapter = require('./butter-cms');
const GravAdapter = require('./grav');
const HugoAdapter = require('./hugo');
const JekyllAdapter = require('./jekyll');
const GatsbyAdapter = require('./gatsby');
const NextJSAdapter = require('./nextjs');
const GitHubPagesAdapter = require('./github-pages');
const GitLabPagesAdapter = require('./gitlab-pages');
const VercelAdapter = require('./vercel');
const NetlifyAdapter = require('./netlify');
const KirbyAdapter = require('./kirby');
const AnchorCMSAdapter = require('./anchor-cms');
const TypechoAdapter = require('./typecho');
const SerendipityAdapter = require('./serendipity');
const ZyroAdapter = require('./zyro');
const SITE123Adapter = require('./site123');
const JimdoAdapter = require('./jimdo');
const StrikinglyAdapter = require('./strikingly');
const BookmarkAdapter = require('./bookmark');
const PagecloudAdapter = require('./pagecloud');
const SimvolyAdapter = require('./simvoly');
const EcwidAdapter = require('./ecwid');
const VolusionAdapter = require('./volusion');
const Shift4ShopAdapter = require('./shift4shop');
const SquareOnlineAdapter = require('./square-online');
const WordPressComAdapter = require('./wordpress-com');
const MagentoAdapter = require('./magento');
const PrestaShopAdapter = require('./prestashop');
const OpenCartAdapter = require('./opencart');
const BigCartelAdapter = require('./big-cartel');
const ThreeDCartAdapter = require('./3dcart');
const AdobePortfolioAdapter = require('./adobe-portfolio');
const GoogleSitesAdapter = require('./google-sites');

// Map of provider names to their adapters
const providerAdapters = {
  // CMS Platforms
  'wordpress': WordPressAdapter,
  'medium': MediumAdapter,
  'ghost': GhostAdapter,
  'contentful': ContentfulAdapter,
  'sanity': SanityAdapter,
  'strapi': StrapiAdapter,
  'prismic': PrismicAdapter,
  'directus': DirectusAdapter,
  'payload-cms': PayloadCMSAdapter,
  'netlify-cms': NetlifyCMSAdapter,
  'forestry': ForestryAdapter,
  'dato-cms': DatoCMSAdapter,
  'hygraph': HygraphAdapter,
  'blogger': BloggerAdapter,
  'tumblr': TumblrAdapter,
  'substack': SubstackAdapter,
  'hashnode': HashnodeAdapter,
  'devto': DevToAdapter,
  'linkedin': LinkedInAdapter,
  'notion': NotionAdapter,
  'grav': GravAdapter,
  'kirby': KirbyAdapter,
  'anchor-cms': AnchorCMSAdapter,
  'typecho': TypechoAdapter,
  'serendipity': SerendipityAdapter,

  // Website Builders
  'wix': WixAdapter,
  'squarespace': SquarespaceAdapter,
  'weebly': WeeblyAdapter,
  'webflow': WebflowAdapter,
  'zyro': ZyroAdapter,
  'site123': SITE123Adapter,
  'jimdo': JimdoAdapter,
  'strikingly': StrikinglyAdapter,
  'bookmark': BookmarkAdapter,
  'pagecloud': PagecloudAdapter,
  'simvoly': SimvolyAdapter,
  'carrd': CarrdAdapter,
  'tilda': TildaAdapter,
  'ucraft': UcraftAdapter,
  'voog': VoogAdapter,
  'webnode': WebnodeAdapter,
  'mozello': MozelloAdapter,
  'duda': DudaAdapter,
  'one-com': OneComAdapter,
  'odoo': OdooAdapter,
  'nationbuilder': NationBuilderAdapter,
  'butter-cms': ButterCMSAdapter,
  'adobe-portfolio': AdobePortfolioAdapter,
  'google-sites': GoogleSitesAdapter,

  // E-commerce Platforms
  'shopify': ShopifyAdapter,
  'bigcommerce': BigCommerceAdapter,
  'woocommerce': WooCommerceAdapter,
  'ecwid': EcwidAdapter,
  'volusion': VolusionAdapter,
  'shift4shop': Shift4ShopAdapter,
  'square-online': SquareOnlineAdapter,
  'wordpress-com': WordPressComAdapter,
  'magento': MagentoAdapter,
  'prestashop': PrestaShopAdapter,
  'opencart': OpenCartAdapter,
  'big-cartel': BigCartelAdapter,
  '3dcart': ThreeDCartAdapter,

  // Static Site Generators
  'hugo': HugoAdapter,
  'jekyll': JekyllAdapter,
  'gatsby': GatsbyAdapter,
  'nextjs': NextJSAdapter,
  'github-pages': GitHubPagesAdapter,
  'gitlab-pages': GitLabPagesAdapter,
  'vercel': VercelAdapter,
  'netlify': NetlifyAdapter
};

/**
 * Get a provider adapter by name
 * @param {string} providerName - The name of the provider
 * @returns {Object|null} The provider adapter or null if not found
 */
function getProviderAdapter(providerName) {
  const adapter = providerAdapters[providerName.toLowerCase()];
  
  if (!adapter) {
    console.warn(`Provider adapter not found for: ${providerName}`);
    return null;
  }

  return adapter;
}

/**
 * Get all available provider names
 * @returns {Array<string>} Array of provider names
 */
function getAvailableProviders() {
  return Object.keys(providerAdapters);
}

/**
 * Get provider adapter information
 * @param {string} providerName - The name of the provider
 * @returns {Object|null} Provider information or null if not found
 */
function getProviderInfo(providerName) {
  const adapter = getProviderAdapter(providerName);
  
  if (!adapter) {
    return null;
  }

  return {
    id: adapter.id,
    name: adapter.name,
    supports: adapter.supports
  };
}

/**
 * Check if a provider is supported
 * @param {string} providerName - The name of the provider
 * @returns {boolean} True if provider is supported
 */
function isProviderSupported(providerName) {
  return providerName.toLowerCase() in providerAdapters;
}

/**
 * Get providers by category
 * @param {string} category - The category to filter by
 * @returns {Array<string>} Array of provider names in the category
 */
function getProvidersByCategory(category) {
  const providers = [];
  
  for (const [name, adapter] of Object.entries(providerAdapters)) {
    if (adapter.category === category) {
      providers.push(name);
    }
  }
  
  return providers;
}

/**
 * Get providers that support a specific feature
 * @param {string} feature - The feature to check
 * @returns {Array<string>} Array of provider names that support the feature
 */
function getProvidersByFeature(feature) {
  const providers = [];
  
  for (const [name, adapter] of Object.entries(providerAdapters)) {
    if (adapter.supports && adapter.supports[feature]) {
      providers.push(name);
    }
  }
  
  return providers;
}

module.exports = {
  getProviderAdapter,
  getAvailableProviders,
  getProviderInfo,
  isProviderSupported,
  getProvidersByCategory,
  getProvidersByFeature,
  providerAdapters
};