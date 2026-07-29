/**
 * Utilitário de Higienização de Números de Telefone e Geração de Links do WhatsApp
 * Especializado em alta conversão (CRO) e prevenção de falhas de redirecionamento.
 */

/**
 * Limpa qualquer caractere não numérico de uma string de telefone, 
 * mantendo apenas o formato bruto esperado pelo WhatsApp (Ex: "5588996248427").
 * 
 * @param phone String de telefone vinda do CMS ou do código (Ex: "+55 (88) 99624-8427")
 * @returns String contendo exclusivamente dígitos numéricos limpos
 */
export const sanitizePhoneNumber = (phone: string): string => {
  if (!phone) return '5588996248427';
  
  let sanitized = phone.replace(/\D/g, '');
  
  if (sanitized.length === 11 || sanitized.length === 10) {
    sanitized = `55${sanitized}`;
  }
  
  return sanitized;
};

/**
 * Cria de forma blindada, segura e performática um link direcionador para o WhatsApp oficial.
 * Resolve qualquer caractere especial ou acentuação usando `encodeURIComponent` para total suporte mobile/desktop.
 * 
 * @param phone Número de WhatsApp central (higienizado automaticamente internamente)
 * @param text Mensagem em texto simples pré-programada para o paciente
 * @returns Link completo pronto para o redirecionamento (wa.me)
 */
export const getWhatsAppLink = (phone: string, text: string): string => {
  const cleanPhone = sanitizePhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
};
