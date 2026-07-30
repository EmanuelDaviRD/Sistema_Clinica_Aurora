import { Router, Request, Response } from 'express';
import { getPrisma } from '../db/prisma.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const checkups = await prisma.checkup.findMany();
    return res.json(checkups);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro de Banco', details: error.message });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const checkup = await prisma.checkup.create({ data: req.body });
    return res.status(201).json(checkup);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao criar checkup', details: error.message });
  }
});

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const checkup = await prisma.checkup.update({
      where: { id: Number(req.params.id) },
      data: req.body
    });
    return res.json(checkup);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao atualizar checkup', details: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    await prisma.checkup.delete({ where: { id: Number(req.params.id) } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao excluir checkup', details: error.message });
  }
});

export default router;
