import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// POST /drafts - save new draft
router.post('/', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { title, body, tags = [], categories = [], images = [] } = req.body;
  try {
    const draft = await prisma.draft.create({
      data: { userId, title, body, tags, categories, images },
    });
    res.status(201).json(draft);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// GET /drafts - list drafts for user
router.get('/', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  try {
    const drafts = await prisma.draft.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
    res.json(drafts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

export default router;