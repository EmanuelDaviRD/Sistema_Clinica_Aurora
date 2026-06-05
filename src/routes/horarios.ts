import { Router, Request, Response } from 'express';
import { getPrisma } from '../db/prisma.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

const router = Router();

/**
 * GET /api/horarios
 * Público: Lista horários disponíveis ou filtrados por médico
 */
router.get('/', async (req: Request, res: Response) => {
  const { medico_id, apenas_disponiveis } = req.query;

  try {
    const prisma = getPrisma();
    const whereClause: any = {};

    if (medico_id) {
      whereClause.medico_id = Number(medico_id);
    }

    if (apenas_disponiveis === 'true') {
      whereClause.status_disponivel = true;
    }

    const horarios = await prisma.horario.findMany({
      where: whereClause,
      include: {
        medico: {
          select: { nome: true, especialidade: true }
        },
        agendamento: {
          select: { nome_paciente: true, telefone: true }
        }
      },
      orderBy: {
        data_hora: 'asc'
      }
    });

    return res.json(horarios);
  } catch (error: any) {
    console.error('Erro ao listar horários:', error);
    return res.status(500).json({ error: 'Erro de SQL', message: 'Incapaz de ler os horários disponíveis.', details: error.message });
  }
});

/**
 * POST /api/horarios
 * Protegido: Cria novos horários para um médico determinado
 */
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { data_hora, medico_id } = req.body;

  if (!data_hora || !medico_id) {
    return res.status(400).json({ error: 'Campos incorretos', message: 'Data/Hora e Identificador do Médico são obrigatórios.' });
  }

  try {
    const prisma = getPrisma();
    
    // Valida se o médico existe
    const medico = await prisma.medico.findUnique({
      where: { id: Number(medico_id) }
    });

    if (!medico) {
      return res.status(404).json({ error: 'Não encontrado', message: 'O médico indicado não existe.' });
    }

    const horario = await prisma.horario.create({
      data: {
        data_hora: new Date(data_hora),
        medico_id: Number(medico_id),
        status_disponivel: true
      }
    });

    return res.status(201).json(horario);
  } catch (error: any) {
    console.error('Erro ao criar horário:', error);
    return res.status(500).json({ error: 'Erro de inserção', message: 'Não foi possível cadastrar o horário.', details: error.message });
  }
});

/**
 * DELETE /api/horarios/:id
 * Protegido: Remove um determinado horário
 */
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const prisma = getPrisma();
    await prisma.horario.delete({
      where: { id: Number(id) }
    });
    return res.json({ success: true, message: 'Horário removido com sucesso!' });
  } catch (error: any) {
    console.error(`Erro ao remover horário ${id}:`, error);
    return res.status(500).json({ error: 'Erro ao remover', message: 'Incapaz de excluir.', details: error.message });
  }
});

export default router;
