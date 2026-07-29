import React from 'react';
import { getWhatsAppLink } from '../utils/whatsapp';

interface ServiceCTAButtonProps {
  phone: string;
  serviceName: string;
  variant?: 'outline' | 'solid';
  className?: string;
}

/**
 * Componente de Alta Conversão (CRO): Botão CTA do WhatsApp para Cards de Serviço
 * Gera automaticamente mensagens persuasivas focadas em fechar orçamentos e agendamentos.
 */
export const ServiceCTAButton: React.FC<ServiceCTAButtonProps> = ({
  phone,
  serviceName,
  variant = 'solid',
  className = ''
}) => {
  // Copywriting focado em CRO: Reduz fricção e ajuda o atendente a saber exatamente o que o lead quer
  const message = `Olá! Vi no site sobre a especialidade de ${serviceName} e gostaria de mais informações.`;
  const whatsappUrl = getWhatsAppLink(phone, message);

  const baseStyles = "inline-flex items-center justify-center font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl transition-all duration-300 transform active:scale-95 focus:outline-none";
  
  const variantStyles = variant === 'solid'
    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg focus:ring-4 focus:ring-emerald-500/20"
    : "bg-white border border-[#C5A880]/30 hover:border-[#C5A880] text-[#0A2B2A] hover:bg-[#FAF8F5] shadow-xs active:bg-slate-100";

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseStyles} ${variantStyles} ${className}`}
      id={`wa-cta-service-${serviceName.toLowerCase().replace(/\s+/g, '-')}`}
      aria-label={`Agendar consulta para ${serviceName}`}
    >
      <svg 
        className="w-4 h-4 mr-2 fill-current" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.023-5.115-2.883-6.978C16.584 1.9 14.11 1.01 11.488 1.01 6.047 1.01 1.624 5.433 1.621 10.875c0 1.69.444 3.341 1.284 4.809l-.406 1.481 1.524-.4c1.45.79 3.033 1.205 4.624 1.205zm11.309-7.6c-.301-.15-1.78-.879-2.056-.979s-.477-.15-.677.15-.773.979-.948 1.179-.349.225-.65.076c-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.276-2.084s.225-.349.375-.65.075-.301-.038-.524-.225-.524-.45-.948c-.201-.413-.426-.35-.613-.35-.175-.01-.375-.01-.575-.01s-.525.075-.801.375c-.276.3-.1.15-.3.225-.225.075-1.05 1.026-1.05 2.502s1.077 2.903 1.227 3.103c.15.2 2.118 3.235 5.131 4.537.717.31 1.276.494 1.713.633.721.23 1.377.198 1.896.121.579-.088 1.78-.727 2.03-1.427s.25-1.3.175-1.427c-.075-.127-.275-.202-.575-.352z"/>
      </svg>
      Agendar Consulta
    </a>
  );
};
