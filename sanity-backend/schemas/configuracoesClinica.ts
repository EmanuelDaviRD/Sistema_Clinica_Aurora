
export default {
  name: 'configuracoesClinica',
  title: 'Configurações da Clínica',
  type: 'document',
 
  __experimental_actions: ['update', 'publish'], 
  fields: [
    {
      name: 'clinicName',
      title: 'Nome Oficial da Clínica',
      type: 'string',
      initialValue: 'Luna & Mendes',
      validation: (Rule: any) => Rule.required().error('O nome da clínica é obrigatório.'),
    },
    {
      name: 'address',
      title: 'Endereço Completo',
      type: 'string',
      description: 'Ex: Rua Coronel Juvêncio Carneiro, 350 - Centro, Cajazeiras - PB.',
      validation: (Rule: any) => Rule.required().error('O endereço físico é crucial para a dona da clínica.'),
    },
    {
      name: 'whatsapp',
      title: 'Número Central do WhatsApp (Apenas Números com DDD)',
      type: 'string',
      description: 'Inicie com 55 + DDD + Número. Ex: 5588996248427. Não use traços ou espaços no número bruto de envio.',
      validation: (Rule: any) => Rule.required().min(12).max(15).regex(/^55\d{10,13}$/, {
        name: 'WhatsApp',
        invert: false,
      }).error('Formato de WhatsApp inválido. Utilize o formato padrão: 55 + DDD + número (ex: 5588996248427).'),
    },
    {
      name: 'whatsappDisplay',
      title: 'Número de WhatsApp Formatado para Exibição',
      type: 'string',
      description: 'Ex: (88) 99624-8427',
      validation: (Rule: any) => Rule.required().error('Forneça a exibição amigável do número.'),
    },
    {
      name: 'email',
      title: 'E-mail de Contato',
      type: 'string',
      description: 'Ex: contato@lunaemendes.com.br',
      validation: (Rule: any) => Rule.required().email().error('Forneça um endereço de e-mail corporativo válido.'),
    },
    {
      name: 'openingHours',
      title: 'Horário de Funcionamento',
      type: 'string',
      description: 'Ex: Segunda a Sexta: 07h às 18h | Sábado: 07h às 12h',
      validation: (Rule: any) => Rule.required().error('O horário de funcionamento é obrigatório.'),
    },
    {
      name: 'instagramUrl',
      title: 'Link do Instagram',
      type: 'url',
      description: 'Ex: https://instagram.com/lunaemendes',
    },
  ],
  preview: {
    prepare() {
      return {
        title: 'Painel Central de Configurações Luna & Mendes',
      };
    },
  },
};
