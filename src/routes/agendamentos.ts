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
    const agendamentos = await prisma.agendamento.findMany({
      include: {
        horario: {
          include: {
            medico: true
          }
        },
        exame_imagem: true,
        exame_laboratorial: true,
        checkup: true
      },
      orderBy: {
        id: 'desc'
      }
    });
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
  const { nome_paciente, telefone, horario_id, serviceType, data_preferencial, exame_imagem_id, exame_laboratorial_id, checkup_id } = req.body;

  if (!nome_paciente || !telefone) {
    return res.status(400).json({ error: 'Campos vazios', message: 'Nome e Telefone são obrigatórios.' });
  }

  const tipo = serviceType || 'CONSULTA_MEDICA';

  if (tipo === 'CONSULTA_MEDICA' && !horario_id) {
    return res.status(400).json({ error: 'Campos vazios', message: 'Identificador do Horário é obrigatório para consultas.' });
  }

  try {
    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx) => {
      let slot = null;
      
      if (tipo === 'CONSULTA_MEDICA') {
        slot = await tx.horario.findUnique({
          where: { id: Number(horario_id) },
          include: { agendamento: true }
        });

        if (!slot) throw new Error('Horário inválido ou inexistente.');
        if (!slot.status_disponivel || slot.agendamento) throw new Error('Este horário já foi reservado por outro paciente.');

        await tx.horario.update({
          where: { id: slot.id },
          data: { status_disponivel: false }
        });
      }

      let pacienteId: number | null = req.body.paciente_id ? Number(req.body.paciente_id) : null;
      
      if (!pacienteId && telefone) {
        const existingPaciente = await tx.paciente.findFirst({
          where: { telefone }
        });
        if (existingPaciente) {
          pacienteId = existingPaciente.id;
        } else {
          const novoPaciente = await tx.paciente.create({
            data: { nome: nome_paciente, telefone }
          });
          pacienteId = novoPaciente.id;
        }
      }

      const agendamento = await tx.agendamento.create({
        data: {
          nome_paciente,
          telefone,
          serviceType: tipo,
          data_preferencial: data_preferencial ? new Date(data_preferencial) : null,
          horario_id: slot ? slot.id : null,
          paciente_id: pacienteId,
          exame_imagem_id: exame_imagem_id ? Number(exame_imagem_id) : null,
          exame_laboratorial_id: exame_laboratorial_id ? Number(exame_laboratorial_id) : null,
          checkup_id: checkup_id ? Number(checkup_id) : null
        },
        include: {
          horario: { include: { medico: true } },
          paciente: true,
          exame_imagem: true,
          exame_laboratorial: true,
          checkup: true
        }
      });

      return agendamento;
    });

    return res.status(201).json({
      success: true,
      message: tipo === 'CONSULTA_MEDICA' ? 'Consulta agendada com completo sucesso!' : 'Agendamento realizado com sucesso!',
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

      // Libera o horário associado se existir
      if (agendamento.horario_id) {
        await tx.horario.update({
          where: { id: agendamento.horario_id },
          data: { status_disponivel: true }
        });
      }

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
