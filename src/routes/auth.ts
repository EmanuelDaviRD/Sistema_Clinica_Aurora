import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPrisma } from '../db/prisma.js';

const router = Router();

/**
 * POST /api/login
 * Valida credenciais do administrador no PostgreSQL e emite o token JWT
 */
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Campos obrigatórios', message: 'E-mail e senha são necessários.' });
  }

  try {
    const prisma = getPrisma();
    const admin = await prisma.adminUser.findUnique({
      where: { email }
    });

    if (!admin) {
      return res.status(401).json({ error: 'Não autorizado', message: 'E-mail ou senha inválidos.' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Não autorizado', message: 'E-mail ou senha inválidos.' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'chave-secreta-super-ultra-forte';
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      jwtSecret,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email
      }
    });
  } catch (error: any) {
    console.error('Erro no login do administrador:', error);
    return res.status(500).json({ 
      error: 'Erro interno', 
      message: 'Falha durante o processo de login no banco de dados.', 
      details: error.message 
    });
  }
});

/**
 * POST /api/seed-admin
 * Rota auxiliar segura para criar o primeiro administrador do sistema
 */
router.post('/seed-admin', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Campos obrigatórios', message: 'Defina e-mail e senha para gerar o admin.' });
  }

  try {
    const prisma = getPrisma();
    const existing = await prisma.adminUser.findUnique({
      where: { email }
    });

    if (existing) {
      return res.status(400).json({ error: 'Erro', message: 'Este usuário administrador já existe.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newAdmin = await prisma.adminUser.create({
      data: {
        email,
        password_hash: passwordHash
      }
    });

    return res.status(201).json({
      message: 'Usuário administrador criado com sucesso!',
      admin: {
        id: newAdmin.id,
        email: newAdmin.email
      }
    });
  } catch (error: any) {
    console.error('Erro ao gerar admin de semente:', error);
    return res.status(500).json({ 
      error: 'Erro interno', 
      message: 'Não foi possível semear o banco do administrador.', 
      details: error.message 
    });
  }
});

export default router;
