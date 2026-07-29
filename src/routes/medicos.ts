import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getPrisma } from '../db/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { supabase } from '../lib/supabaseClient.js';

const router = Router();

// Configuração do multer usando memória em vez de disco
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /api/medicos
 * Público: Lista todos os médicos cadastrados (Otimizado com SELECT)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const medicos = await prisma.medico.findMany({
      select: {
        id: true,
        nome: true,
        especialidade: true,
        foto_url: true,
        registroProfissionalTipo: true,
        registroProfissionalNumero: true,
        _count: {
          select: { horarios: { where: { status_disponivel: true } } }
        }
      }
    });
    return res.json(medicos);
  } catch (error: any) {
    console.error('Erro ao listar médicos:', error);
    return res.status(500).json({ error: 'Erro de Banco', message: 'Incapaz de ler os médicos ativos no banco.', details: error.message });
  }
});

/**
 * POST /api/medicos
 * Protegido: Adiciona um novo médico com upload de foto
 */
router.post('/', authMiddleware, upload.single('foto'), async (req: AuthenticatedRequest, res: Response) => {
  const { nome, especialidade, registroProfissionalTipo, registroProfissionalNumero } = req.body;
  const file = req.file;

  if (!nome || !especialidade) {
    return res.status(400).json({ error: 'Campos inválidos', message: 'Nome e Especialidade são obrigatórios.' });
  }

  try {
    let foto_url = req.body.foto_url || null;

    if (file) {
      try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.split('.').pop() || 'jpg';
        const fileName = `${uniqueSuffix}.${ext}`;

        const { error } = await supabase
          .storage
          .from('fotos-clinica')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (!error) {
          const { data: publicUrlData } = supabase
            .storage
            .from('fotos-clinica')
            .getPublicUrl(fileName);

          foto_url = publicUrlData.publicUrl;
        } else {
          console.warn('Upload no Supabase falhou, utilizando fallback Base64:', error.message);
          foto_url = `data:${file.mimetype || 'image/jpeg'};base64,${file.buffer.toString('base64')}`;
        }
      } catch (uploadErr: any) {
        console.warn('Exceção no upload Supabase, utilizando fallback Base64:', uploadErr?.message);
        foto_url = `data:${file.mimetype || 'image/jpeg'};base64,${file.buffer.toString('base64')}`;
      }
    } else if (!foto_url) {
      // Caso não forneça foto, pode ser usada uma URL padrão
      foto_url = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(nome) + '&background=random';
    }

    const prisma = getPrisma();
    const medico = await prisma.medico.create({
      data: {
        nome,
        especialidade,
        foto_url,
        registroProfissionalTipo: registroProfissionalTipo || null,
        registroProfissionalNumero: registroProfissionalNumero || null
      }
    });
    return res.status(201).json(medico);
  } catch (error: any) {
    console.error('Erro ao criar médico:', error);
    return res.status(500).json({ error: 'Erro de Banco', message: 'Incapaz de salvar o novo médico.', details: error.message });
  }
});

/**
 * PUT /api/medicos/:id
 * Protegido: Atualiza as informações completas de um médico (com suporte a upload de nova foto e alteração de horários/registros)
 */
router.put('/:id', authMiddleware, upload.single('foto'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { nome, especialidade, registroProfissionalTipo, registroProfissionalNumero } = req.body;
  let foto_url = req.body.foto_url;
  const file = req.file;

  try {
    const prisma = getPrisma();
    const existing = await prisma.medico.findUnique({
      where: { id: Number(id) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Não encontrado', message: 'Médico não foi localizado.' });
    }

    if (file) {
      try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.split('.').pop() || 'jpg';
        const fileName = `${uniqueSuffix}.${ext}`;

        const { error } = await supabase
          .storage
          .from('fotos-clinica')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (!error) {
          const { data: publicUrlData } = supabase
            .storage
            .from('fotos-clinica')
            .getPublicUrl(fileName);

          foto_url = publicUrlData.publicUrl;
        } else {
          console.warn('Upload no Supabase falhou na edição, utilizando fallback Base64:', error.message);
          foto_url = `data:${file.mimetype || 'image/jpeg'};base64,${file.buffer.toString('base64')}`;
        }
      } catch (uploadErr: any) {
        console.warn('Exceção no upload Supabase na edição, utilizando fallback Base64:', uploadErr?.message);
        foto_url = `data:${file.mimetype || 'image/jpeg'};base64,${file.buffer.toString('base64')}`;
      }
    }

    const updated = await prisma.medico.update({
      where: { id: Number(id) },
      data: {
        nome: nome ?? existing.nome,
        especialidade: especialidade ?? existing.especialidade,
        foto_url: foto_url !== undefined ? foto_url : existing.foto_url,
        registroProfissionalTipo: registroProfissionalTipo !== undefined ? registroProfissionalTipo : existing.registroProfissionalTipo,
        registroProfissionalNumero: registroProfissionalNumero !== undefined ? registroProfissionalNumero : existing.registroProfissionalNumero
      }
    });
    return res.json(updated);
  } catch (error: any) {
    console.error(`Erro ao atualizar médico ${id}:`, error);
    return res.status(500).json({ error: 'Erro ao salvar', message: 'Não foi possível modificar esse médico.', details: error.message });
  }
});

/**
 * DELETE /api/medicos/:id
 * Protegido: Remove o médico do banco de dados (cascade deletará os horários dele)
 */
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const prisma = getPrisma();
    await prisma.medico.delete({
      where: { id: Number(id) }
    });
    return res.json({ success: true, message: 'Médico excluído com sucesso!' });
  } catch (error: any) {
    console.error(`Erro ao excluir médico ${id}:`, error);
    return res.status(500).json({ error: 'Erro na exclusão', message: 'A exclusão falhou.', details: error.message });
  }
});

export default router;
