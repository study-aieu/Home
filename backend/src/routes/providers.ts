import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { getProviderSummaries, getAllProviders, getProvider } from '../providers';

const router = Router();

/**
 * GET /providers
 * Get all available CMS providers
 */
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const providers = getProviderSummaries();

    res.json({
      success: true,
      data: providers,
      message: 'Providers retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /providers/:providerId
 * Get details for a specific provider
 */
router.get('/:providerId', (req: AuthRequest, res: Response) => {
  try {
    const { providerId } = req.params;
    const provider = getProvider(providerId);

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    const providerInfo = {
      id: provider.id,
      name: provider.name,
      description: provider.description,
      website: provider.website,
      supports: provider.supports,
      authFields: provider.authFields
    };

    res.json({
      success: true,
      data: providerInfo,
      message: 'Provider details retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /providers/category/:feature
 * Get providers that support a specific feature
 */
router.get('/category/:feature', (req: AuthRequest, res: Response) => {
  try {
    const { feature } = req.params;
    const allProviders = getAllProviders();
    
    const supportedProviders = allProviders.filter(provider => {
      return provider.supports[feature as keyof typeof provider.supports];
    });

    const providerSummaries = supportedProviders.map(provider => ({
      id: provider.id,
      name: provider.name,
      description: provider.description,
      website: provider.website,
      supports: provider.supports,
      authFields: provider.authFields
    }));

    res.json({
      success: true,
      data: providerSummaries,
      message: `Providers supporting ${feature} retrieved successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;