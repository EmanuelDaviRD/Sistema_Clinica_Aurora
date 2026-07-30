import { Router, Request, Response } from 'express';
import { getPrisma } from '../db/prisma.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// ==========================================
// EXAMES DE IMAGEM
// ==========================================

router.get('/imagem', async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const exames = await prisma.exameImagem.findMany();
    return res.json(exames);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro de Banco', details: error.message });
  }
});

router.post('/imagem', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const exame = await prisma.exameImagem.create({ data: req.body });
    return res.status(201).json(exame);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao criar exame', details: error.message });
  }
});

router.put('/imagem/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const exame = await prisma.exameImagem.update({
      where: { id: Number(req.params.id) },
      data: req.body
    });
    return res.json(exame);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao atualizar exame', details: error.message });
  }
});

router.delete('/imagem/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    await prisma.exameImagem.delete({ where: { id: Number(req.params.id) } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao excluir exame', details: error.message });
  }
});

// ==========================================
// EXAMES LABORATORIAIS
// ==========================================

router.get('/laboratorial', async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const exames = await prisma.exameLaboratorial.findMany();
    return res.json(exames);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro de Banco', details: error.message });
  }
});

router.post('/laboratorial', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const exame = await prisma.exameLaboratorial.create({ data: req.body });
    return res.status(201).json(exame);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao criar exame', details: error.message });
  }
});

router.put('/laboratorial/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const exame = await prisma.exameLaboratorial.update({
      where: { id: Number(req.params.id) },
      data: req.body
    });
    return res.json(exame);
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao atualizar exame', details: error.message });
  }
});

router.delete('/laboratorial/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    await prisma.exameLaboratorial.delete({ where: { id: Number(req.params.id) } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao excluir exame', details: error.message });
  }
});

export default router;
