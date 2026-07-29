import React, { useState } from 'react';
import { getWhatsAppLink } from '../utils/whatsapp';

interface WhatsAppFloatingButtonProps {
  phone: string;
  defaultMessage?: string;
  assistantName?: string;
}

export const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({
  phone,
  defaultMessage = 'Olá! Estava navegando no site da clínica e gostaria de agendar uma consulta.',
  assistantName = 'Prevenção Luna & Mendes'
}) => {
  const [showTooltip, setShowTooltip] = useState(true);
  const whatsappUrl = getWhatsAppLink(phone, defaultMessage);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end group" id="wa-floating-container">
      {/* Balão de Dica (Tooltip) CRO - Atrai atenção do paciente e simula interação humana real */}
      {showTooltip && (
        <div 
          className="mb-3 bg-white border border-emerald-100 rounded-2xl shadow-xl p-3 max-w-[240px] text-left animate-bounce relative text-xs text-slate-700 font-sans"
          id="wa-lead-tooltip"
        >
          {/* Botão de Fechar Tooltip */}
          <button 
            onClick={() => setShowTooltip(false)}
            className="absolute top-1 right-2 text-slate-400 hover:text-slate-600 font-bold text-[10px]"
            title="Fechar"
            aria-label="Fechar dica"
          >
            ×
          </button>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Atendente Online</span>
          </div>
          <p className="font-semibold text-slate-800 text-[11px] leading-tight">
            Olá! Como posso te ajudar hoje? Tire suas dúvidas por aqui.
          </p>
          <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-white border-r border-b border-emerald-100 rotate-45"></div>
        </div>
      )}

      {/* Botão de Ação Principal */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setShowTooltip(false)}
        className="flex items-center justify-center w-16 h-16 bg-emerald-500 hover:bg-emerald-600 rounded-full text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 relative focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
        id="wa-main-trigger-btn"
        aria-label="Fale conosco no WhatsApp"
      >
        {/* Onda pulsar para capturar o olho do usuário */}
        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-30 -z-10"></span>
        
        {/* Ícone de Alta Fidelidade com SVG Personalizado do WhatsApp */}
        <svg 
          className="w-8 h-8 fill-current text-white" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.023-5.115-2.883-6.978C16.584 1.9 14.11 1.01 11.488 1.01 6.047 1.01 1.624 5.433 1.621 10.875c0 1.69.444 3.341 1.284 4.809l-.406 1.481 1.524-.4c1.45.79 3.033 1.205 4.624 1.205zm11.309-7.6c-.301-.15-1.78-.879-2.056-.979s-.477-.15-.677.15-.773.979-.948 1.179-.349.225-.65.076c-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.276-2.084s.225-.349.375-.65.075-.301-.038-.524-.225-.524-.45-.948c-.201-.413-.426-.35-.613-.35-.175-.01-.375-.01-.575-.01s-.525.075-.801.375c-.276.3-.1.15-.3.225-.225.075-1.05 1.026-1.05 2.502s1.077 2.903 1.227 3.103c.15.2 2.118 3.235 5.131 4.537.717.31 1.276.494 1.713.633.721.23 1.377.198 1.896.121.579-.088 1.78-.727 2.03-1.427s.25-1.3.175-1.427c-.075-.127-.275-.202-.575-.352z"/>
        </svg>
      </a>
    </div>
  );
};
