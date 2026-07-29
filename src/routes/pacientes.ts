import { Router, Request, Response } from 'express';
import { getPrisma } from '../db/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * GET /api/pacientes
 * Protegido: Lista todos os pacientes com histórico de agendamentos
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const pacientes = await prisma.paciente.findMany({
      include: {
        agendamentos: {
          include: {
            horario: {
              include: {
                medico: true
              }
            }
          },
          orderBy: {
            id: 'desc'
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });
    return res.json(pacientes);
  } catch (error: any) {
    console.error('Erro ao listar pacientes:', error);
    return res.status(500).json({ error: 'Erro de Banco', message: 'Incapaz de ler os pacientes no banco.', details: error.message });
  }
});

/**
 * GET /api/pacientes/:id
 * Protegido: Detalhes de um paciente específico
 */
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const prisma = getPrisma();
    const paciente = await prisma.paciente.findUnique({
      where: { id: Number(id) },
      include: {
        agendamentos: {
          include: {
            horario: {
              include: {
                medico: true
              }
            }
          },
          orderBy: {
            id: 'desc'
          }
        }
      }
    });

    if (!paciente) {
      return res.status(404).json({ error: 'Não encontrado', message: 'Paciente não localizado.' });
    }

    return res.json(paciente);
  } catch (error: any) {
    console.error(`Erro ao buscar paciente ${id}:`, error);
    return res.status(500).json({ error: 'Erro de Banco', message: 'Incapaz de buscar paciente.', details: error.message });
  }
});

/**
 * POST /api/pacientes
 * Protegido: Cria um novo paciente
 */
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { nome, cpf, telefone } = req.body;

  if (!nome) {
    return res.status(400).json({ error: 'Campo obrigatório', message: 'O nome do paciente é obrigatório.' });
  }

  try {
    const prisma = getPrisma();
    const novoPaciente = await prisma.paciente.create({
      data: {
        nome,
        cpf: cpf || null,
        telefone: telefone || null
      }
    });
    return res.status(201).json(novoPaciente);
  } catch (error: any) {
    console.error('Erro ao criar paciente:', error);
    return res.status(500).json({ error: 'Erro de Banco', message: 'Incapaz de salvar o novo paciente.', details: error.message });
  }
});

/**
 * PUT /api/pacientes/:id
 * Protegido: Atualiza um paciente existente
 */
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { nome, cpf, telefone } = req.body;

  try {
    const prisma = getPrisma();
    const pacienteAtualizado = await prisma.paciente.update({
      where: { id: Number(id) },
      data: {
        nome,
        cpf,
        telefone
      }
    });
    return res.json(pacienteAtualizado);
  } catch (error: any) {
    console.error(`Erro ao atualizar paciente ${id}:`, error);
    return res.status(500).json({ error: 'Erro de Banco', message: 'Não foi possível atualizar este paciente.', details: error.message });
  }
});

/**
 * DELETE /api/pacientes/:id
 * Protegido: Remove um paciente do cadastro
 */
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const prisma = getPrisma();
    await prisma.paciente.delete({
      where: { id: Number(id) }
    });
    return res.json({ success: true, message: 'Paciente excluído com sucesso!' });
  } catch (error: any) {
    console.error(`Erro ao excluir paciente ${id}:`, error);
    return res.status(500).json({ error: 'Erro de Exclusão', message: 'Não foi possível excluir este paciente.', details: error.message });
  }
});

export default router;
