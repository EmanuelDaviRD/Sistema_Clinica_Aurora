import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

const projectId = (import.meta as any).env.VITE_SANITY_PROJECT_ID || 'dummy-project-id';
const dataset = (import.meta as any).env.VITE_SANITY_DATASET || 'production';
const apiVersion = (import.meta as any).env.VITE_SANITY_API_VERSION || '2026-05-30';

// Configuração do Cliente Sanity devidamente isolada e tipada
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // true para respostas rápidas (cache do CDN da Edge)
});

// Inicializador do construtor de URLs de imagens do Sanity
const builder = imageUrlBuilder(sanityClient);

// Função auxiliar e robusta para gerar as URLs dos assets de imagem de forma dinâmica
// Recebe o objeto asset de imagem recebido do Sanity e gera a URL final otimizada
export const urlFor = (source: any) => {
  if (!source) return '';
  return builder.image(source).url() || '';
};
