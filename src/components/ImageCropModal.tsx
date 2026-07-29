import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crop, ZoomIn, ZoomOut, RotateCw, Move, Check, X, RefreshCw } from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string, croppedFile: File) => void;
  initialAspectRatio?: '3:4' | '1:1' | '4:3';
  title?: string;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  initialAspectRatio = '3:4',
  title = 'Ajustar e Recortar Foto'
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [aspectRatio, setAspectRatio] = useState<'3:4' | '1:1' | '4:3'>(initialAspectRatio);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reseta transformações quando nova foto for carregada ou modal abrir
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setAspectRatio(initialAspectRatio);
    }
  }, [isOpen, imageSrc, initialAspectRatio]);

  if (!isOpen || !imageSrc) return null;

  // Calculo de proporção do frame de corte
  const getAspectDimensions = () => {
    switch (aspectRatio) {
      case '1:1':
        return { width: 260, height: 260 };
      case '4:3':
        return { width: 280, height: 210 };
      case '3:4':
      default:
        return { width: 240, height: 320 };
    }
  };

  const frameDim = getAspectDimensions();

  // Handlers de Arraste (Pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Suporte a Touch para Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Rotacionar 90 graus
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Resetar posições
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Finalizar e gerar o Canvas Cortado e Redimensionado
  const handleConfirmCrop = () => {
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = () => {
      const canvas = document.createElement('canvas');

      // Define resolução de saída alta e limpa
      let outputWidth = 600;
      let outputHeight = 800;

      if (aspectRatio === '1:1') {
        outputWidth = 600;
        outputHeight = 600;
      } else if (aspectRatio === '4:3') {
        outputWidth = 800;
        outputHeight = 600;
      }

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Limpa fundo
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outputWidth, outputHeight);

      ctx.save();

      // Mover origem para o centro do canvas
      ctx.translate(outputWidth / 2, outputHeight / 2);

      // Aplicar rotação
      ctx.rotate((rotation * Math.PI) / 180);

      // Mover conforme pan do usuário escalado para o canvas
      const scaleFactor = outputWidth / frameDim.width;
      ctx.translate(pan.x * scaleFactor, pan.y * scaleFactor);

      // Aplicar zoom do usuário
      ctx.scale(zoom, zoom);

      // Desenhar a imagem centralizada
      ctx.drawImage(
        img,
        -img.naturalWidth / 2,
        -img.naturalHeight / 2,
        img.naturalWidth,
        img.naturalHeight
      );

      ctx.restore();

      // Exportar como Data URL (JPEG de alta qualidade 90%)
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.90);

      // Converter Data URL para arquivo File de upload
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], `medico_foto_${Date.now()}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          onCropComplete(croppedDataUrl, croppedFile);
          onClose();
        }
      }, 'image/jpeg', 0.90);
    };
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#0A2B2A]/10 text-[#0A2B2A] flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#0A2B2A] text-sm sm:text-base leading-tight">{title}</h3>
              <p className="text-[11px] text-slate-500">Arraste e ajuste o enquadramento perfeito</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ÁREA DE CORTE INTERATIVA */}
        <div className="p-4 bg-slate-900 flex-1 flex flex-col items-center justify-center relative overflow-hidden select-none min-h-[340px]">
          
          {/* Instrução visual */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center space-x-1.5 z-20 pointer-events-none">
            <Move className="w-3 h-3 text-amber-300" />
            <span>Arraste a foto para posicionar</span>
          </div>

          {/* Janela / Máscara de Enquadramento */}
          <div
            ref={containerRef}
            style={{ width: `${frameDim.width}px`, height: `${frameDim.height}px` }}
            className="relative border-2 border-amber-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing z-10"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Linhas Guia de Enquadramento (Regra dos Terços) */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
              <div className="border-r border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-b border-white"></div>
              <div className="border-r border-white"></div>
              <div className="border-r border-white"></div>
              <div></div>
            </div>

            {/* Imagem a ser ajustada */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Imagem para corte"
                className="max-w-none max-h-none object-contain pointer-events-none"
                style={{ width: `${frameDim.width}px` }}
              />
            </div>
          </div>
        </div>

        {/* CONTROLES E PAINEL DE AJUSTE */}
        <div className="p-4 bg-white border-t border-slate-100 space-y-4">
          
          {/* Formato / Aspect Ratio */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Formato:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setAspectRatio('3:4')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  aspectRatio === '3:4'
                    ? 'bg-[#0A2B2A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Cartão (3:4)
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('1:1')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  aspectRatio === '1:1'
                    ? 'bg-[#0A2B2A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Perfil (1:1)
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('4:3')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  aspectRatio === '4:3'
                    ? 'bg-[#0A2B2A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Horizontal (4:3)
              </button>
            </div>
          </div>

          {/* Zoom & Rotação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            
            {/* Controle de Zoom */}
            <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200/70">
              <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="range"
                min="0.6"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-[#0A2B2A] cursor-pointer"
              />
              <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-[11px] font-mono font-bold text-slate-600 w-10 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Botoes de Ação Rápida */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Girar 90°</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 p-2 rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer"
                title="Resetar Ajustes"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Botões de Ação Final */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmCrop}
              className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-md cursor-pointer min-h-[44px]"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar e Aplicar Foto</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
