import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { getProvider } from '../providers';

const prisma = new PrismaClient();
const router = Router();

// POST /connections - body: { provider: string, auth: any }
router.post('/', requireAuth, async (req, res) => {
  const { provider: providerId, auth } = req.body as { provider: string; auth: any };
  const userId = (req as any).userId as string;
  const provider = getProvider(providerId);
  if (!provider) return res.status(400).json({ error: 'Unknown provider' });
  try {
    const connection = await prisma.connection.create({ data: { userId, provider: providerId, auth } });
    return res.status(201).json(connection);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save connection' });
  }
});

// GET /connections/:id/verify
router.get('/:id/verify', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).userId as string;
  const connection = await prisma.connection.findFirst({ where: { id, userId } });
  if (!connection) return res.status(404).json({ error: 'Connection not found' });
  const provider = getProvider(connection.provider);
  if (!provider) return res.status(400).json({ error: 'Provider missing' });
  try {
    const result = await provider.verifyConnection(connection.auth);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Verification error' });
  }
});

// GET /connections/:id/posts
router.get('/:id/posts', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).userId as string;
  const connection = await prisma.connection.findFirst({ where: { id, userId } });
  if (!connection) return res.status(404).json({ error: 'Connection not found' });
  const provider = getProvider(connection.provider);
  if (!provider) return res.status(400).json({ error: 'Provider missing' });
  try {
    const posts = await provider.listPosts(connection.auth, {});
    return res.json(posts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

export default router;