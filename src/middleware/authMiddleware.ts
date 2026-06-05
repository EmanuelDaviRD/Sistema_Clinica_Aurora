import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  id: number;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Middleware para reter e autenticar requisições usando JWT.
 * Valida o cabeçalho Authorization do tipo 'Bearer <token>'.
 */
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Não autorizado', 
      message: 'Token de autenticação não fornecido ou inválido.' 
    });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET || 'chave-secreta-super-ultra-forte';

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthenticatedUser;
    req.user = decoded;
    return next();
  } catch (error) {
    console.error('Erro na validação do token JWT:', error);
    return res.status(401).json({ 
      error: 'Não autorizado', 
      message: 'Token expirado ou inválido.' 
    });
  }
};
