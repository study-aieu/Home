import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { getProvider } from '../providers';
import { PublishInput } from '../providers/adapter';

const prisma = new PrismaClient();
const router = Router();

// POST /publish - create post(s)
router.post('/', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { draftId, connectionIds } = req.body as { draftId: string; connectionIds: string[] };
  try {
    const draft = await prisma.draft.findFirst({ where: { id: draftId, userId } });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    const connections = await prisma.connection.findMany({ where: { id: { in: connectionIds }, userId } });
    const publishResults: any[] = [];

    for (const conn of connections) {
      const provider = getProvider(conn.provider);
      if (!provider) {
        publishResults.push({ connectionId: conn.id, ok: false, error: 'Provider missing' });
        continue;
      }
      const input: PublishInput = {
        title: draft.title,
        body: draft.body,
        tags: draft.tags,
        categories: draft.categories,
        images: draft.images as any,
      };
      try {
        const result = await provider.createPost(conn.auth, input);
        if (result.ok) {
          await prisma.post.create({
            data: {
              userId,
              provider: conn.provider,
              providerPostId: result.postId || '',
              url: result.url || '',
              title: draft.title,
              body: draft.body,
            },
          });
        }
        publishResults.push({ connectionId: conn.id, ...result });
      } catch (err) {
        console.error(err);
        publishResults.push({ connectionId: conn.id, ok: false, error: err });
      }
    }

    res.json(publishResults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Publishing failed' });
  }
});

// PUT /publish/:id - update post (single connection record id)
router.put('/:id', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { id } = req.params; // this is Post.id record
  const { title, body, tags, categories, images } = req.body as Partial<PublishInput>;
  try {
    const post = await prisma.post.findFirst({ where: { id, userId } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const connection = await prisma.connection.findFirst({ where: { userId, provider: post.provider } });
    if (!connection) return res.status(404).json({ error: 'Connection not found' });
    const provider = getProvider(post.provider);
    if (!provider) return res.status(400).json({ error: 'Provider missing' });

    const input: PublishInput = {
      title: title || post.title,
      body: body || post.body,
      tags,
      categories,
      images,
    } as any;
    const result = await provider.updatePost(connection.auth, post.providerPostId, input);
    if (result.ok) {
      await prisma.post.update({ where: { id }, data: { title: input.title, body: input.body } });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE /publish/:id - delete post
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  try {
    const post = await prisma.post.findFirst({ where: { id, userId } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const connection = await prisma.connection.findFirst({ where: { userId, provider: post.provider } });
    if (!connection) return res.status(404).json({ error: 'Connection not found' });
    const provider = getProvider(post.provider);
    if (!provider) return res.status(400).json({ error: 'Provider missing' });

    const result = await provider.deletePost(connection.auth, post.providerPostId);
    if (result.ok) {
      await prisma.post.delete({ where: { id } });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;