import { Router } from 'express';
import { providers } from '../providers';
const router = Router();
// GET /providers
router.get('/', (_req, res) => {
    const list = providers.map((p) => ({ id: p.id, name: p.name, supports: p.supports }));
    res.json(list);
});
export default router;
