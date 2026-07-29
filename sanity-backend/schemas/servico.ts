// Sanity Schema para Serviços / Exames / Procedimentos - Luna & Mendes
// Caminho sugerido em seu projeto Sanity: schemas/servico.ts ou schemas/servico.js

export default {
  name: 'servico',
  title: 'Serviços e Exames',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Nome do Serviço ou Exame',
      type: 'string',
      description: 'Digite o nome visível do exame ou procedimento (Ex: Ecocardiograma com Doppler, Consulta Geral).',
      validation: (Rule: any) => Rule.required().min(2).max(80).error('O nome do serviço é obrigatório e deve ter entre 2 e 80 caracteres.'),
    },
    {
      name: 'shortDescription',
      title: 'Descrição Curta do Serviço',
      type: 'text',
      rows: 3,
      description: 'Uma descrição rápida e direta que aparecerá nos cards da clínica.',
      validation: (Rule: any) => Rule.required().min(10).max(250).error('O texto deve ter entre 10 e 250 caracteres.'),
    },
    {
      name: 'category',
      title: 'Categoria do Serviço',
      type: 'string',
      options: {
        list: [
          { title: 'Análises Clínicas', value: 'Análises Clínicas' },
          { title: 'Cardiologia', value: 'Cardiologia' },
          { title: 'Ginecologia', value: 'Ginecologia' },
          { title: 'Urologia', value: 'Urologia' },
          { title: 'Reabilitação', value: 'Reabilitação' },
          { title: 'Dermatologia', value: 'Dermatologia' },
          { title: 'Outros', value: 'Outros' },
        ],
      },
      validation: (Rule: any) => Rule.required().error('Selecione uma categoria válida para catalogar o serviço.'),
    },
    {
      name: 'iconImage',
      title: 'Ícone ou Imagem Representativa',
      type: 'image',
      description: 'Carregue uma imagem ou desenho limpo para representar visualmente este serviço.',
      options: {
        hotspot: true,
      },
      validation: (Rule: any) => Rule.required().error('Carregue uma imagem representativa para garantir a consistência do design.'),
    },
    {
      name: 'price',
      title: 'Preço Sugerido (Opcional)',
      type: 'string',
      description: 'Ex: R$ 120,00 ou sob consulta.',
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'category',
      media: 'iconImage',
    },
  },
};
