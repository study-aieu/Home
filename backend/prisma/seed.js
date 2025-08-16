const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.post.deleteMany();
  await prisma.draft.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Cleared existing data');

  // Create providers
  const providers = [
    // Website Builders
    {
      name: 'wix',
      displayName: 'Wix',
      description: 'Popular drag-and-drop website builder with powerful features',
      category: 'website-builder',
      authType: 'api-key',
      features: {
        images: true,
        tags: true,
        scheduling: true,
        edit: true,
        delete: true,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: true
      },
      authFields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'text',
          required: true,
          placeholder: 'Enter your Wix API key',
          description: 'Get this from your Wix Developer Center'
        },
        {
          name: 'siteId',
          label: 'Site ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Wix site ID',
          description: 'Found in your Wix site settings'
        }
      ]
    },
    {
      name: 'squarespace',
      displayName: 'Squarespace',
      description: 'Beautiful website builder with excellent design templates',
      category: 'website-builder',
      authType: 'oauth',
      features: {
        images: true,
        tags: true,
        scheduling: true,
        edit: true,
        delete: true,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: false
      },
      authFields: [
        {
          name: 'clientId',
          label: 'Client ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Squarespace Client ID'
        },
        {
          name: 'clientSecret',
          label: 'Client Secret',
          type: 'password',
          required: true,
          placeholder: 'Enter your Squarespace Client Secret'
        }
      ]
    },
    {
      name: 'weebly',
      displayName: 'Weebly',
      description: 'Easy-to-use website builder with e-commerce features',
      category: 'website-builder',
      authType: 'api-key',
      features: {
        images: true,
        tags: true,
        scheduling: false,
        edit: true,
        delete: true,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: false
      },
      authFields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'text',
          required: true,
          placeholder: 'Enter your Weebly API key'
        },
        {
          name: 'siteId',
          label: 'Site ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Weebly site ID'
        }
      ]
    },
    {
      name: 'webflow',
      displayName: 'Webflow',
      description: 'Professional website builder with advanced design capabilities',
      category: 'website-builder',
      authType: 'api-key',
      features: {
        images: true,
        tags: true,
        scheduling: true,
        edit: true,
        delete: true,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: true
      },
      authFields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'text',
          required: true,
          placeholder: 'Enter your Webflow API key'
        },
        {
          name: 'siteId',
          label: 'Site ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Webflow site ID'
        }
      ]
    },
    {
      name: 'shopify',
      displayName: 'Shopify',
      description: 'Leading e-commerce platform with powerful blogging features',
      category: 'ecommerce',
      authType: 'api-key',
      features: {
        images: true,
        tags: true,
        scheduling: true,
        edit: true,
        delete: true,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: true
      },
      authFields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'text',
          required: true,
          placeholder: 'Enter your Shopify API key'
        },
        {
          name: 'apiSecret',
          label: 'API Secret',
          type: 'password',
          required: true,
          placeholder: 'Enter your Shopify API secret'
        },
        {
          name: 'storeUrl',
          label: 'Store URL',
          type: 'url',
          required: true,
          placeholder: 'https://your-store.myshopify.com'
        }
      ]
    },
    {
      name: 'wordpress',
      displayName: 'WordPress',
      description: 'Most popular CMS platform with extensive plugin ecosystem',
      category: 'cms',
      authType: 'api-key',
      features: {
        images: true,
        tags: true,
        scheduling: true,
        edit: true,
        delete: true,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: true
      },
      authFields: [
        {
          name: 'siteUrl',
          label: 'Site URL',
          type: 'url',
          required: true,
          placeholder: 'https://your-site.com'
        },
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          required: true,
          placeholder: 'Enter your WordPress username'
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          placeholder: 'Enter your WordPress password'
        }
      ]
    },
    {
      name: 'medium',
      displayName: 'Medium',
      description: 'Popular publishing platform for writers and bloggers',
      category: 'cms',
      authType: 'oauth',
      features: {
        images: true,
        tags: true,
        scheduling: false,
        edit: true,
        delete: true,
        categories: false,
        excerpts: true,
        featuredImages: true,
        customFields: false
      },
      authFields: [
        {
          name: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Medium access token',
          description: 'Get this from Medium Developer Portal'
        }
      ]
    },
    {
      name: 'ghost',
      displayName: 'Ghost',
      description: 'Modern publishing platform focused on professional publishing',
      category: 'cms',
      authType: 'api-key',
      features: {
        images: true,
        tags: true,
        scheduling: true,
        edit: true,
        delete: true,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: true
      },
      authFields: [
        {
          name: 'adminApiKey',
          label: 'Admin API Key',
          type: 'password',
          required: true,
          placeholder: 'Enter your Ghost Admin API key'
        },
        {
          name: 'siteUrl',
          label: 'Site URL',
          type: 'url',
          required: true,
          placeholder: 'https://your-ghost-site.com'
        }
      ]
    },
    {
      name: 'contentful',
      displayName: 'Contentful',
      description: 'Headless CMS with powerful content modeling capabilities',
      category: 'cms',
      authType: 'api-key',
      features: {
        images: true,
        tags: true,
        scheduling: true,
        edit: true,
        delete: true,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: true
      },
      authFields: [
        {
          name: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Contentful access token'
        },
        {
          name: 'spaceId',
          label: 'Space ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Contentful space ID'
        }
      ]
    },
    {
      name: 'sanity',
      displayName: 'Sanity',
      description: 'Modern headless CMS with real-time collaboration',
      category: 'cms',
      authType: 'api-key',
      features: {
        images: true,
        tags: true,
        scheduling: true,
        edit: true,
        delete: true,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: true
      },
      authFields: [
        {
          name: 'projectId',
          label: 'Project ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Sanity project ID'
        },
        {
          name: 'dataset',
          label: 'Dataset',
          type: 'text',
          required: true,
          placeholder: 'production',
          options: ['production', 'development', 'staging']
        },
        {
          name: 'token',
          label: 'API Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Sanity API token'
        }
      ]
    },
    {
      name: 'strapi',
      displayName: 'Strapi',
      description: 'Open-source headless CMS with self-hosting option',
      category: 'cms',
      authType: 'api-key',
      features: {
        images: true,
        tags: true,
        scheduling: true,
        edit: true,
        delete: true,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: true
      },
      authFields: [
        {
          name: 'apiToken',
          label: 'API Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Strapi API token'
        },
        {
          name: 'siteUrl',
          label: 'Site URL',
          type: 'url',
          required: true,
          placeholder: 'https://your-strapi-site.com'
        }
      ]
    },
    {
      name: 'notion',
      displayName: 'Notion',
      description: 'All-in-one workspace with powerful note-taking and publishing',
      category: 'other',
      authType: 'oauth',
      features: {
        images: true,
        tags: false,
        scheduling: false,
        edit: true,
        delete: true,
        categories: false,
        excerpts: false,
        featuredImages: false,
        customFields: true
      },
      authFields: [
        {
          name: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Notion access token'
        },
        {
          name: 'databaseId',
          label: 'Database ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Notion database ID'
        }
      ]
    },
    {
      name: 'hugo',
      displayName: 'Hugo',
      description: 'Fast static site generator written in Go',
      category: 'static-generator',
      authType: 'custom',
      features: {
        images: true,
        tags: true,
        scheduling: false,
        edit: false,
        delete: false,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: true
      },
      authFields: [
        {
          name: 'repositoryUrl',
          label: 'Repository URL',
          type: 'url',
          required: true,
          placeholder: 'https://github.com/username/repo'
        },
        {
          name: 'branch',
          label: 'Branch',
          type: 'text',
          required: true,
          placeholder: 'main',
          options: ['main', 'master', 'develop']
        },
        {
          name: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'GitHub/GitLab personal access token'
        }
      ]
    },
    {
      name: 'jekyll',
      displayName: 'Jekyll',
      description: 'Static site generator that powers GitHub Pages',
      category: 'static-generator',
      authType: 'custom',
      features: {
        images: true,
        tags: true,
        scheduling: false,
        edit: false,
        delete: false,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: true
      },
      authFields: [
        {
          name: 'repositoryUrl',
          label: 'Repository URL',
          type: 'url',
          required: true,
          placeholder: 'https://github.com/username/repo'
        },
        {
          name: 'branch',
          label: 'Branch',
          type: 'text',
          required: true,
          placeholder: 'main',
          options: ['main', 'master', 'gh-pages']
        },
        {
          name: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'GitHub personal access token'
        }
      ]
    },
    {
      name: 'gatsby',
      displayName: 'Gatsby',
      description: 'React-based static site generator with GraphQL',
      category: 'static-generator',
      authType: 'custom',
      features: {
        images: true,
        tags: true,
        scheduling: false,
        edit: false,
        delete: false,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: true
      },
      authFields: [
        {
          name: 'repositoryUrl',
          label: 'Repository URL',
          type: 'url',
          required: true,
          placeholder: 'https://github.com/username/repo'
        },
        {
          name: 'branch',
          label: 'Branch',
          type: 'text',
          required: true,
          placeholder: 'main',
          options: ['main', 'master', 'develop']
        },
        {
          name: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'GitHub/GitLab personal access token'
        }
      ]
    },
    {
      name: 'nextjs',
      displayName: 'Next.js',
      description: 'React framework with static generation and server-side rendering',
      category: 'static-generator',
      authType: 'custom',
      features: {
        images: true,
        tags: true,
        scheduling: false,
        edit: false,
        delete: false,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: true
      },
      authFields: [
        {
          name: 'repositoryUrl',
          label: 'Repository URL',
          type: 'url',
          required: true,
          placeholder: 'https://github.com/username/repo'
        },
        {
          name: 'branch',
          label: 'Branch',
          type: 'text',
          required: true,
          placeholder: 'main',
          options: ['main', 'master', 'develop']
        },
        {
          name: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'GitHub/GitLab personal access token'
        }
      ]
    },
    {
      name: 'github-pages',
      displayName: 'GitHub Pages',
      description: 'Free static site hosting from GitHub repositories',
      category: 'static-generator',
      authType: 'custom',
      features: {
        images: true,
        tags: true,
        scheduling: false,
        edit: false,
        delete: false,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: true
      },
      authFields: [
        {
          name: 'repositoryUrl',
          label: 'Repository URL',
          type: 'url',
          required: true,
          placeholder: 'https://github.com/username/repo'
        },
        {
          name: 'branch',
          label: 'Branch',
          type: 'text',
          required: true,
          placeholder: 'main',
          options: ['main', 'master', 'gh-pages']
        },
        {
          name: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'GitHub personal access token'
        }
      ]
    },
    {
      name: 'vercel',
      displayName: 'Vercel',
      description: 'Deploy and host static sites and JAMstack applications',
      category: 'static-generator',
      authType: 'oauth',
      features: {
        images: true,
        tags: true,
        scheduling: false,
        edit: false,
        delete: false,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: true
      },
      authFields: [
        {
          name: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Vercel access token'
        },
        {
          name: 'projectId',
          label: 'Project ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Vercel project ID'
        }
      ]
    },
    {
      name: 'netlify',
      displayName: 'Netlify',
      description: 'All-in-one platform for deploying and hosting static sites',
      category: 'static-generator',
      authType: 'oauth',
      features: {
        images: true,
        tags: true,
        scheduling: false,
        edit: false,
        delete: false,
        categories: true,
        excerpts: true,
        featuredImages: true,
        customFields: true
      },
      authFields: [
        {
          name: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          placeholder: 'Enter your Netlify access token'
        },
        {
          name: 'siteId',
          label: 'Site ID',
          type: 'text',
          required: true,
          placeholder: 'Enter your Netlify site ID'
        }
      ]
    }
  ];

  // Add more providers to reach 67 total
  const additionalProviders = [
    // More Website Builders
    { name: 'zyro', displayName: 'Zyro', category: 'website-builder', authType: 'api-key' },
    { name: 'site123', displayName: 'SITE123', category: 'website-builder', authType: 'api-key' },
    { name: 'jimdo', displayName: 'Jimdo', category: 'website-builder', authType: 'api-key' },
    { name: 'strikingly', displayName: 'Strikingly', category: 'website-builder', authType: 'api-key' },
    { name: 'bookmark', displayName: 'Bookmark', category: 'website-builder', authType: 'api-key' },
    { name: 'pagecloud', displayName: 'Pagecloud', category: 'website-builder', authType: 'api-key' },
    { name: 'simvoly', displayName: 'Simvoly', category: 'website-builder', authType: 'api-key' },
    { name: 'carrd', displayName: 'Carrd', category: 'website-builder', authType: 'api-key' },
    { name: 'tilda', displayName: 'Tilda', category: 'website-builder', authType: 'api-key' },
    { name: 'ucraft', displayName: 'Ucraft', category: 'website-builder', authType: 'api-key' },
    { name: 'voog', displayName: 'Voog', category: 'website-builder', authType: 'api-key' },
    { name: 'webnode', displayName: 'Webnode', category: 'website-builder', authType: 'api-key' },
    { name: 'mozello', displayName: 'Mozello', category: 'website-builder', authType: 'api-key' },
    { name: 'duda', displayName: 'Duda', category: 'website-builder', authType: 'api-key' },
    { name: 'one-com', displayName: 'One.com', category: 'website-builder', authType: 'api-key' },
    { name: 'odoo', displayName: 'Odoo Website Builder', category: 'website-builder', authType: 'api-key' },
    { name: 'nationbuilder', displayName: 'NationBuilder', category: 'website-builder', authType: 'api-key' },
    { name: 'adobe-portfolio', displayName: 'Adobe Portfolio', category: 'website-builder', authType: 'oauth' },
    { name: 'google-sites', displayName: 'Google Sites', category: 'website-builder', authType: 'oauth' },

    // More E-commerce Platforms
    { name: 'bigcommerce', displayName: 'BigCommerce', category: 'ecommerce', authType: 'api-key' },
    { name: 'woocommerce', displayName: 'WooCommerce', category: 'ecommerce', authType: 'api-key' },
    { name: 'ecwid', displayName: 'Ecwid', category: 'ecommerce', authType: 'api-key' },
    { name: 'volusion', displayName: 'Volusion', category: 'ecommerce', authType: 'api-key' },
    { name: 'shift4shop', displayName: 'Shift4Shop', category: 'ecommerce', authType: 'api-key' },
    { name: 'square-online', displayName: 'Square Online', category: 'ecommerce', authType: 'oauth' },
    { name: 'wordpress-com', displayName: 'WordPress.com', category: 'ecommerce', authType: 'oauth' },
    { name: 'magento', displayName: 'Magento', category: 'ecommerce', authType: 'api-key' },
    { name: 'prestashop', displayName: 'PrestaShop', category: 'ecommerce', authType: 'api-key' },
    { name: 'opencart', displayName: 'OpenCart', category: 'ecommerce', authType: 'api-key' },
    { name: 'big-cartel', displayName: 'Big Cartel', category: 'ecommerce', authType: 'api-key' },
    { name: '3dcart', displayName: '3dcart', category: 'ecommerce', authType: 'api-key' },

    // More CMS Platforms
    { name: 'blogger', displayName: 'Blogger', category: 'cms', authType: 'oauth' },
    { name: 'tumblr', displayName: 'Tumblr', category: 'cms', authType: 'oauth' },
    { name: 'grav', displayName: 'Grav', category: 'cms', authType: 'custom' },
    { name: 'kirby', displayName: 'Kirby CMS', category: 'cms', authType: 'custom' },
    { name: 'anchor-cms', displayName: 'Anchor CMS', category: 'cms', authType: 'custom' },
    { name: 'typecho', displayName: 'Typecho', category: 'cms', authType: 'custom' },
    { name: 'serendipity', displayName: 'Serendipity', category: 'cms', authType: 'custom' },
    { name: 'prismic', displayName: 'Prismic', category: 'cms', authType: 'api-key' },
    { name: 'directus', displayName: 'Directus', category: 'cms', authType: 'api-key' },
    { name: 'payload-cms', displayName: 'Payload CMS', category: 'cms', authType: 'api-key' },
    { name: 'netlify-cms', displayName: 'Netlify CMS', category: 'cms', authType: 'custom' },
    { name: 'forestry', displayName: 'Forestry.io', category: 'cms', authType: 'oauth' },
    { name: 'dato-cms', displayName: 'DatoCMS', category: 'cms', authType: 'api-key' },
    { name: 'hygraph', displayName: 'Hygraph (GraphCMS)', category: 'cms', authType: 'api-key' },
    { name: 'butter-cms', displayName: 'ButterCMS', category: 'cms', authType: 'api-key' },

    // More Static Site Generators
    { name: 'gitlab-pages', displayName: 'GitLab Pages', category: 'static-generator', authType: 'custom' }
  ];

  // Add default features and auth fields for additional providers
  const completeAdditionalProviders = additionalProviders.map(provider => ({
    ...provider,
    description: `${provider.displayName} platform integration`,
    features: {
      images: true,
      tags: true,
      scheduling: false,
      edit: true,
      delete: true,
      categories: true,
      excerpts: true,
      featuredImages: true,
      customFields: false
    },
    authFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'text',
        required: true,
        placeholder: `Enter your ${provider.displayName} API key`
      }
    ]
  }));

  // Combine all providers
  const allProviders = [...providers, ...completeAdditionalProviders];

  // Create providers in database
  for (const provider of allProviders) {
    await prisma.provider.create({
      data: provider
    });
  }

  console.log(`✅ Created ${allProviders.length} providers`);

  // Create a sample user for testing
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('password123', 12);

  const user = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      username: 'demo',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'User'
    }
  });

  console.log('✅ Created demo user (demo@example.com / password123)');

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });