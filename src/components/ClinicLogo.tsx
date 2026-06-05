import React from 'react';

interface ClinicLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  variant?: 'gold-teal' | 'gold-white' | 'gold-only';
}

export function ClinicLogo({ 
  className = '', 
  size = 44, 
  showText = true,
  variant = 'gold-teal' 
}: ClinicLogoProps) {
  // Cores baseadas na identidade visual da Luna & Mendes
  const bgFill = variant === 'gold-teal' ? '#0A2B2A' : 'transparent';
  const goldColor = '#C5A880';
  const lightGoldColor = '#E3C9A6';

  return (
    <div className={`flex items-center ${className}`} style={{ height: size }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 200 200" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          {/* Gradiente ouro premium */}
          <linearGradient id="logo-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A88958" />
            <stop offset="30%" stopColor="#C5A880" />
            <stop offset="70%" stopColor="#E3C9A6" />
            <stop offset="100%" stopColor="#B39462" />
          </linearGradient>
          
          {/* Gradiente de brilho sutil */}
          <linearGradient id="logo-gold-glow" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9C7F4F" />
            <stop offset="50%" stopColor="#DFC59F" />
            <stop offset="100%" stopColor="#9C7F4F" />
          </linearGradient>

          {/* Caminho curvo no topo para o texto LUNA & MENDES */}
          {/* M 30,100 A 70,70 0 0,1 170,100 */}
          <path 
            id="textPath-top" 
            d="M 32,100 A 68,68 0 0,1 168,100" 
            fill="none" 
          />

          {/* Caminho curvo na base para o texto SAÚDE E DIAGNÓSTICO */}
          {/* Nós queremos que a leitura seja da esquerda para a direita, então o arco precisa ir no sentido anti-horário */}
          <path 
            id="textPath-bottom" 
            d="M 168,100 A 68,68 0 0,1 32,100" 
            fill="none" 
          />
        </defs>

        {/* Fundo do círculo */}
        <circle cx="100" cy="100" r="94" fill={bgFill} />

        {/* Círculo externo com borda dupla dourada */}
        <circle cx="100" cy="100" r="92" stroke="url(#logo-gold-grad)" strokeWidth="4" />
        <circle cx="100" cy="100" r="85" stroke="url(#logo-gold-grad)" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />
        <circle cx="100" cy="100" r="81" stroke="url(#logo-gold-grad)" strokeWidth="1" />

        {/* Círculo interno que abraça as letras */}
        <circle cx="100" cy="100" r="54" stroke="url(#logo-gold-grad)" strokeWidth="1.5" opacity="0.4" />

        {/* Texto do Topo: LUNA & MENDES */}
        <text className="font-serif font-black tracking-[0.24em] uppercase" fill="url(#logo-gold-glow)" fontSize="13.5">
          <textPath href="#textPath-top" startOffset="50%" textAnchor="middle">
            LUNA &amp; MENDES
          </textPath>
        </text>

        {/* Texto da Base: SAÚDE E DIAGNÓSTICO */}
        <text className="font-sans font-bold tracking-[0.18em] uppercase" fill="url(#logo-gold-glow)" fontSize="8.5" opacity="0.9">
          <textPath href="#textPath-bottom" startOffset="50%" textAnchor="middle">
            SAÚDE E DIAGNÓSTICO
          </textPath>
        </text>

        {/* Monograma central "LM" estilizado de forma premium */}
        <g transform="translate(100, 100)">
          {/* Sombra sutil vazada */}
          {/* Letra 'L' */}
          <path 
            d="M -42,16 L -42,12 C -36,12 -34,11 -34,6 L -34,-26 C -34,-31 -36,-32 -42,-32 L -42,-36 L -16,-36 L -16,-32 C -22,-32 -24,-31 -24,-26 L -24,10 C -24,18 -18,22 -10,22 C -4,22 1,18 4,14 L 6,17 C 1,23 -8,26 -14,26 C -28,26 -34,18 -34,6 L -34,10 C -34,11 -34,12 -35,13 C -36,15 -38,16 -42,16 Z" 
            fill="url(#logo-gold-grad)" 
          />

          {/* Letra 'M' interligada */}
          <path 
            d="M -18,-36 L -1,-36 L 14,-1 L 28,-36 L 43,-36 L 43,-32 C 38,-32 36,-31 36,-26 L 36,10 C 36,15 38,16 43,16 L 43,20 L 25,20 L 25,16 C 30,16 31,15 31,10 L 31,-20 L 17,14 L 11,14 L -3,-20 L -3,10 C -3,15 -1,16 4,16 L 4,20 L -14,20 L -14,16 C -9,16 -7,15 -7,10 L -7,-24 C -7,-30 -9,-32 -14,-32 L -14,-36 Z" 
            fill="url(#logo-gold-grad)" 
          />

          {/* DNA Helix integrado na diagonal direita do M */}
          {/* Vamos desenhar um pequeno filamento helicoidal que dá o toque de biologia/saúde ao lado direito do M */}
          <g transform="translate(23, -5) scale(0.6)">
            {/* Linha ondulada 1 */}
            <path 
              d="M -5,-35 C 5,-25 5,-15 -5,-5 C -15,5 -15,15 -5,25 C 5,35 5,45 -5,55" 
              stroke="url(#logo-gold-grad)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              opacity="0.8"
            />
            {/* Linha ondulada 2 (defasada) */}
            <path 
              d="M 5,-35 C -5,-25 -5,-15 5,-5 C 15,5 15,15 5,25 C -5,35 -5,45 5,55" 
              stroke="url(#logo-gold-grad)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              opacity="0.8"
            />
            {/* Degraus da escada do DNA */}
            <line x1="-3.5" y1="-28" x2="3.5" y2="-28" stroke="url(#logo-gold-grad)" strokeWidth="1.5" opacity="0.6" />
            <line x1="-4.8" y1="-18" x2="4.8" y2="-18" stroke="url(#logo-gold-grad)" strokeWidth="1.5" opacity="0.6" />
            <line x1="-5" y1="-10" x2="5" y2="-10" stroke="url(#logo-gold-grad)" strokeWidth="1.5" opacity="0.6" />
            <line x1="-3.5" y1="-2" x2="3.5" y2="-2" stroke="url(#logo-gold-grad)" strokeWidth="1.5" opacity="0.6" />
            <line x1="3.5" y1="8" x2="-3.5" y2="8" stroke="url(#logo-gold-grad)" strokeWidth="1.5" opacity="0.6" />
            <line x1="4.8" y1="18" x2="-4.8" y2="18" stroke="url(#logo-gold-grad)" strokeWidth="1.5" opacity="0.6" />
            <line x1="5" y1="26" x2="-5" y2="26" stroke="url(#logo-gold-grad)" strokeWidth="1.5" opacity="0.6" />
            <line x1="3.5" y1="36" x2="-3.5" y2="36" stroke="url(#logo-gold-grad)" strokeWidth="1.5" opacity="0.6" />
            <line x1="-4.8" y1="46" x2="4.8" y2="46" stroke="url(#logo-gold-grad)" strokeWidth="1.5" opacity="0.6" />

            {/* Esferas de fósforo nas pontas dos degraus */}
            <circle cx="-5" cy="-5" r="2.5" fill="white" />
            <circle cx="5" cy="25" r="2.5" fill="white" />
            <circle cx="5" cy="-5" r="2.5" fill="white" />
            <circle cx="-5" cy="25" r="2.5" fill="white" />
          </g>
        </g>
      </svg>
    </div>
  );
}
