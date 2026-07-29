import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      confirmBtn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500/30',
    },
    warning: {
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/30',
    },
    info: {
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/30',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      id="confirm-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden animate-scaleIn">
        
        {/* Header com logo */}
        <div className="bg-[#0A2B2A] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="/favicon.png"
              alt="Luna & Mendes"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div>
              <p className="text-[#C5A880] text-xs font-bold tracking-wider uppercase font-serif">Luna & Mendes</p>
              <p className="text-white/50 text-[9px] font-mono">Painel Administrativo</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-white/40 hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <div className="flex items-start space-x-4">
            <div className={`w-11 h-11 ${styles.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
              <AlertTriangle className={`w-5 h-5 ${styles.iconColor}`} />
            </div>
            <div>
              <h3 id="confirm-modal-title" className="text-sm font-bold text-[#0A2B2A] mb-1">
                {title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Footer com ações */}
        <div className="px-6 pb-5 flex items-center justify-end space-x-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-slate-300"
            id="confirm-modal-cancel"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-all focus:outline-none focus:ring-2 shadow-sm ${styles.confirmBtn}`}
            id="confirm-modal-confirm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};
