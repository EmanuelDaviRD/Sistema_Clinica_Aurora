import { useState } from 'react';
import { Copy, Check, ExternalLink, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const IMAGE_URLS = [
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.41.jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.42%20(1).jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.42%20(2).jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.42%20(3).jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.42%20(4).jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.42.jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.43%20(1).jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.43%20(2).jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.43%20(3).jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.43%20(4).jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.43.jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.44%20(1).jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.44%20(2).jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.44%20(3).jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.44.jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.47.47%20(1).jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.47.47%20(2).jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.47.47.jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.47.48%20(1).jpeg",
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.47.48%20(1).jpeg"
];

export function ImageMapper() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-6 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors mb-2">
              <ArrowLeft className="w-4 h-4" />
              <Link to="/" className="text-xs font-bold uppercase tracking-wider">Voltar para a Lading Page</Link>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Visualizador Mapeador de Imagens
            </h1>
            <p className="mt-2 text-slate-400 text-sm max-w-2xl">
              Este é um painel temporário para ajudar no mapeamento cego das fotos dos médicos.
              Identifique cada imagem por seu índice, faça suas anotações e coloque os IDs corretos no script de seeding do Prisma.
            </p>
          </div>
          <div className="bg-slate-800 text-slate-300 text-xs px-4 py-3 rounded-xl border border-slate-700 h-fit">
            <span className="font-bold text-teal-400">Total de URLs:</span> {IMAGE_URLS.length} imagens carregadas.
          </div>
        </div>

        {/* Grid de Imagens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {IMAGE_URLS.map((url, index) => (
            <div 
              key={`${url}-${index}`} 
              className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-transform hover:-translate-y-1 hover:border-slate-600 duration-300"
            >
              {/* Header do Card (Índice / ID) */}
              <div className="bg-slate-950 p-4 flex items-center justify-between border-b border-slate-800">
                <span className="text-lg font-black text-rose-500 tracking-wider">
                  INDEX: {index}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleCopy(url, index)}
                    title="Copiar URL"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                  >
                    {copiedIndex === index ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    rel="noopener noreferrer"
                    title="Abrir em nova guia"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Corpo da Imagem com detecção de erro e renderização */}
              <div className="aspect-square bg-slate-950 relative flex items-center justify-center p-2">
                <img
                  src={url}
                  alt={`Vetor Clinica Image ${index}`}
                  className="w-full h-full object-contain rounded"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback visual em caso de falha de carregamento no iframe
                    (e.target as HTMLElement).className = 'hidden';
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent) {
                      const fallbackDiv = document.createElement('div');
                      fallbackDiv.className = 'text-center p-4 text-xs text-rose-400';
                      fallbackDiv.innerText = 'Não pôde carregar diretamente (Iframe sandbox ou CORS). Clique em abrir nova guia para ver.';
                      parent.appendChild(fallbackDiv);
                    }
                  }}
                />
              </div>

              {/* URL resumida e acionador de cópia rápida */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-2">
                <p className="text-[10px] text-slate-500 font-mono break-all line-clamp-2">
                  {url}
                </p>
                <button
                  onClick={() => handleCopy(url, index)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-2 transition"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado para o Seed!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar URL do Supabase</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
