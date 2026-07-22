import { Router, Request, Response } from 'express';
import { getPrisma } from '../db/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * GET /api/agendamentos
 * Protegido: Lista todos os agendamentos cadastrados (exclusivo para Admins)
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    let agendamentos;
    try {
      agendamentos = await prisma.agendamento.findMany({
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
      });
    } catch (e: any) {
      console.warn("Falling back agendamentos query due to missing medico columns:", e.message);
      // Fallback: manually selecting old columns to avoid SELECT * failing on missing medico columns
      agendamentos = await prisma.agendamento.findMany({
        include: {
          horario: {
            select: {
              id: true,
              data_hora: true,
              medico_id: true,
              status_disponivel: true,
              medico: {
                select: {
                  id: true,
                  nome: true,
                  especialidade: true,
                  foto_url: true
                }
              }
            }
          }
        },
        orderBy: {
          id: 'desc'
        }
      });
    }
    return res.json(agendamentos);
  } catch (error: any) {
    console.error('Erro ao buscar agendamentos:', error);
    return res.status(500).json({ error: 'Erro de leitura', message: 'Incapaz de carregar agendamentos.', details: error.message });
  }
});

/**
 * POST /api/agendamentos
 * Público: Realiza um novo agendamento a partir de um horário vago disponível
 */
router.post('/', async (req: Request, res: Response) => {
  const { nome_paciente, telefone, horario_id } = req.body;

  if (!nome_paciente || !telefone || !horario_id) {
    return res.status(400).json({ error: 'Campos vazios', message: 'Nome, Telefone e Identificador do Horário são obrigatórios.' });
  }

  try {
    const prisma = getPrisma();

    // Executa tudo dentro de uma transação isolada para evitar concorrência/overscheduling
    const result = await prisma.$transaction(async (tx) => {
      // 1. Busca o horário ativo e garante que esteja disponível
      const slot = await tx.horario.findUnique({
        where: { id: Number(horario_id) },
        include: { agendamento: true }
      });

      if (!slot) {
        throw new Error('Horário inválido ou inexistente.');
      }

      if (!slot.status_disponivel || slot.agendamento) {
        throw new Error('Este horário já foi reservado por outro paciente.');
      }

      // 2. Modifica o estado do horário para indisponível
      await tx.horario.update({
        where: { id: slot.id },
        data: { status_disponivel: false }
      });

      // 3. Cria a ficha de agendamento do paciente
      const agendamento = await tx.agendamento.create({
        data: {
          nome_paciente,
          telefone,
          horario_id: slot.id
        },
        include: {
          horario: {
            select: {
              id: true,
              data_hora: true,
              medico_id: true,
              status_disponivel: true,
              medico: {
                select: {
                  id: true,
                  nome: true,
                  especialidade: true,
                  foto_url: true
                }
              }
            }
          }
        }
      });

      return agendamento;
    });

    return res.status(201).json({
      success: true,
      message: 'Consulta agendada com completo sucesso!',
      agendamento: result
    });
  } catch (error: any) {
    console.error('Falha de transação ao agendar consulta:', error);
    return res.status(400).json({ 
      error: 'Agendamento Falhou', 
      message: error.message || 'Houve um erro em nosso sistema durante o agendamento.',
      details: error.message
    });
  }
});

/**
 * DELETE /api/agendamentos/:id
 * Protegido: Cancela um agendamento e libera o horário no banco automaticamente
 */
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const prisma = getPrisma();

    await prisma.$transaction(async (tx) => {
      const agendamento = await tx.agendamento.findUnique({
        where: { id: Number(id) }
      });

      if (!agendamento) {
        throw new Error('Agendamento não localizado para cancelamento.');
      }

      // Libera o horário associado
      await tx.horario.update({
        where: { id: agendamento.horario_id },
        data: { status_disponivel: true }
      });

      // Remove a filiação
      await tx.agendamento.delete({
        where: { id: agendamento.id }
      });
    });

    return res.json({ success: true, message: 'Agendamento cancelado e horário liberado!' });
  } catch (error: any) {
    console.error(`Erro ao cancelar agendamento ${id}:`, error);
    return res.status(500).json({ error: 'Erro de Cancelamento', message: error.message || 'Falha ao processar cancelamento.', details: error.message });
  }
});

export default router;
