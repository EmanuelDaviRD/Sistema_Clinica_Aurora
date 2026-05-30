import { useState, useEffect } from 'react';
import { sanityClient, urlFor } from '../lib/sanityClient';

// Definindo as Interfaces para os dados carregados do Sanity.io de forma estrita
export interface SanityDoctor {
  id: string;
  name: string;
  role: string;
  category: 'Medicina' | 'Reabilitação' | 'Exames' | 'Outros';
  crm: string;
  photoUrl: string;
  details: string[];
  whatsappMsg: string;
}

export interface SanityService {
  id: string;
  name: string;
  shortDescription: string;
  category: string;
  iconUrl: string;
  price?: string;
}

export interface SanityConfig {
  clinicName: string;
  address: string;
  whatsapp: string;
  whatsappDisplay: string;
  email: string;
  openingHours: string;
  instagramUrl?: string;
}

export function useSanityData() {
  const [doctors, setDoctors] = useState<SanityDoctor[]>([]);
  const [services, setServices] = useState<SanityService[]>([]);
  const [config, setConfig] = useState<SanityConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        
        // 1. Consulta GROQ de Médicos/Especialistas
        const rawDoctors = await sanityClient.fetch(`*[_type == "medico"]{
          _id,
          name,
          role,
          category,
          crm,
          photo,
          details,
          whatsappMsg
        }`);

        // 2. Consulta GROQ de Serviços/Exames
        const rawServices = await sanityClient.fetch(`*[_type == "servico"]{
          _id,
          name,
          shortDescription,
          category,
          iconImage,
          price
        }`);

        // 3. Consulta de Configurações Globais da Clínica (Pega a primeira e única ocorrência)
        const rawConfig = await sanityClient.fetch(`*[_type == "configuracoesClinica"][0]{
          clinicName,
          address,
          whatsapp,
          whatsappDisplay,
          email,
          openingHours,
          instagramUrl
        }`);

        if (!isMounted) return;

        // Mapeamento e transformação segura dos objetos do Sanity (incluindo imagens) para o formato do React
        if (rawDoctors && Array.isArray(rawDoctors)) {
          const mappedDoctors: SanityDoctor[] = rawDoctors.map((doc: any) => ({
            id: doc._id,
            name: doc.name,
            role: doc.role,
            category: doc.category || 'Medicina',
            crm: doc.crm,
            // Obtendo a URL otimizada de foto através da ferramenta de imagem do Sanity
            photoUrl: doc.photo ? urlFor(doc.photo) : '',
            details: doc.details || [],
            whatsappMsg: doc.whatsappMsg || `Olá, gostaria de agendar um atendimento com o profissional ${doc.name}.`,
          }));
          setDoctors(mappedDoctors);
        }

        if (rawServices && Array.isArray(rawServices)) {
          const mappedServices: SanityService[] = rawServices.map((srv: any) => ({
            id: srv._id,
            name: srv.name,
            shortDescription: srv.shortDescription,
            category: srv.category,
            // Obtendo a URL otimizada da imagem do ícone através do Sanity image builder
            iconUrl: srv.iconImage ? urlFor(srv.iconImage) : '',
            price: srv.price,
          }));
          setServices(mappedServices);
        }

        if (rawConfig) {
          const mappedConfig: SanityConfig = {
            clinicName: rawConfig.clinicName || 'Luna & Mendes',
            address: rawConfig.address || 'Carregando endereço no painel...',
            whatsapp: rawConfig.whatsapp || '5588996248427',
            whatsappDisplay: rawConfig.whatsappDisplay || '(88) 99624-8427',
            email: rawConfig.email || 'contato@lunaemendes.com.br',
            openingHours: rawConfig.openingHours || 'Segunda a sexta das 07h às 18h',
            instagramUrl: rawConfig.instagramUrl || '',
          };
          setConfig(mappedConfig);
        }

        setError(null);
      } catch (err: any) {
        console.warn('Sanity credentials may be offline or unconfigured. Falling back to mock data securely.', err);
        if (isMounted) {
          setError(err.message || 'Erro de conexão com o Sanity');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { doctors, services, config, loading, error };
}
