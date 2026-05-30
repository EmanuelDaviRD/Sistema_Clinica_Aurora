// Sanity Schema para Médicos/Especialistas - Luna & Mendes
// Caminho sugerido em seu projeto Sanity: schemas/medico.ts ou schemas/medico.js

export default {
  name: 'medico',
  title: 'Médicos e Especialistas',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Nome Completo',
      type: 'string',
      description: 'Digite o nome do médico ou especialista (Ex: Dr. Henrique Feitosa).',
      validation: (Rule: any) => Rule.required().min(3).error('O nome completo é obrigatório e deve ter no mínimo 3 caracteres.'),
    },
    {
      name: 'role',
      title: 'Especialidade / Cargo',
      type: 'string',
      description: 'Ex: Médico Cardiologista, Fonoaudióloga Clínico-Comportamental.',
      validation: (Rule: any) => Rule.required().error('A especialidade é obrigatória para exibição.'),
    },
    {
      name: 'category',
      title: 'Categoria',
      description: 'Selecione a categoria de atuação deste profissional.',
      type: 'string',
      options: {
        list: [
          { title: 'Medicina', value: 'Medicina' },
          { title: 'Reabilitação', value: 'Reabilitação' },
          { title: 'Exames & Diagnósticos', value: 'Exames' },
          { title: 'Outros', value: 'Outros' },
        ],
        layout: 'radio',
      },
      validation: (Rule: any) => Rule.required().error('Selecione uma categoria válida.'),
    },
    {
      name: 'crm',
      title: 'Registro de Classe (CRM / Outros)',
      type: 'string',
      description: 'Ex: CRM Ativo, CRFa Ativo, CRM/PB 12.017.',
      validation: (Rule: any) => Rule.required().error('O registro de classe é necessário por compliance legal.'),
    },
    {
      name: 'photo',
      title: 'Foto de Perfil',
      type: 'image',
      description: 'Envie uma foto de perfil profissional para exibição na página.',
      options: {
        hotspot: true, // Habilita o corte inteligente (Hotspot) diretamente no painel do Sanity
      },
      validation: (Rule: any) => Rule.required().error('A foto profissional é obrigatória.'),
    },
    {
      name: 'details',
      title: 'Procedimentos e Foco de Atendimento',
      type: 'array',
      description: 'Lista de exames, procedimentos ou tratamentos em que este profissional é especialista.',
      of: [{ type: 'string' }],
      validation: (Rule: any) => Rule.min(1).error('Adicione pelo menos um procedimento ou foco de atendimento em detalhes.'),
    },
    {
      name: 'whatsappMsg',
      title: 'Mensagem Padrão do WhatsApp',
      type: 'text',
      rows: 3,
      description: 'Mensagem pré-preenchida enviada quando o cliente clica para agendar com este profissional.',
      initialValue: 'Olá, gostaria de agendar uma consulta.',
      validation: (Rule: any) => Rule.required().max(160).error('Defina uma mensagem curta de introdução (máx. 160 caracteres).'),
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'role',
      media: 'photo',
    },
  },
};
