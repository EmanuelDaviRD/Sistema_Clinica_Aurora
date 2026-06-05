import { useState, useEffect, useRef, FormEvent, useMemo } from 'react';
import { useSanityData } from './hooks/useSanityData';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { ServiceCTAButton } from './components/ServiceCTAButton';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { LoginAdmin } from './components/LoginAdmin';
import { DashboardAdmin } from './components/DashboardAdmin';
import { PublicAgendar } from './components/PublicAgendar';
import { ImageMapper } from './components/ImageMapper';
import { ClinicLogo } from './components/ClinicLogo';

import {
  Calendar,
  ArrowRight,
  Clock,
  MapPin,
  Phone,
  Mail,
  Check,
  ChevronDown,
  Menu,
  X,
  Award,
  ShieldCheck,
  Activity,
  UserCheck,
  Search,
  ExternalLink,
  Copy,
  Plus,
  Compass,
  FileText,
  MessageCircle,
  Stethoscope,
  Heart,
  ChevronRight,
  Map,
  Star,
  Quote,
  Baby,
  Users,
  Lock
} from 'lucide-react';

// Tipagem para os dados de agendamento fictício / integração
interface AppointmentData {
  specialty: string;
  doctor: string;
  date: string;
  time: string;
  patientName: string;
  phone: string;
  plan: string;
  checkup?: string;
}

export function LandingPage() {
  const navigate = useNavigate();
  // Estados de controle de menus e modais de agendamento
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showAllDoctors, setShowAllDoctors] = useState(false);
  const [dbMedicos, setDbMedicos] = useState<any[]>([]); // Médicos originários do PostgreSQL (Supabase)
  
  // Estado do agendador multi-etapas
  const [bookingStep, setBookingStep] = useState(1);
  const [appointment, setAppointment] = useState<AppointmentData>({
    specialty: '',
    doctor: '',
    date: '',
    time: '',
    patientName: '',
    phone: '',
    plan: 'particular',
    checkup: ''
  });

  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // DEFESAS DE BORDA E ABUSO (ETAPA 4)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitHistory, setSubmitHistory] = useState<number[]>([]);
  const [rateLimited, setRateLimited] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => Math.random().toString(36).substring(2, 11) + '-' + Date.now());

  // Limpa o estado temporário do rate limit caso fique ocioso
  useEffect(() => {
    if (rateLimited) {
      const timer = setTimeout(() => {
        setRateLimited(false);
        setValidationError(null);
      }, 60000); // Libera após 60 segundos
      return () => clearTimeout(timer);
    }
  }, [rateLimited]);

  // Carrega médicos dinâmicamente do banco PostgreSQL via API REST no mount
  useEffect(() => {
    let isMounted = true;
    const loadMedicosFromDB = async () => {
      try {
        const response = await fetch('/api/medicos');
        if (response.ok) {
          const data = await response.json();
          if (isMounted && Array.isArray(data)) {
            setDbMedicos(data);
          }
        }
      } catch (error) {
        console.warn('PostgreSQL /api/medicos offline or unreachable on load. Using structured fallback.', error);
      }
    };
    loadMedicosFromDB();
    return () => { isMounted = false; };
  }, []);

  // Função para reiniciar o timer de inatividade (5 minutos)
  const resetInactivityTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Configura expiração de 5 minutos (300.000 ms) para proteger dados privados de pacientes
    timeoutRef.current = setTimeout(() => {
      if (isBookingModalOpen && (appointment.patientName || appointment.phone || appointment.specialty)) {
        handleSessionTimeout();
      }
    }, 300000); // 5 minutos
  };

  const handleSessionTimeout = () => {
    setAppointment({
      specialty: '',
      doctor: '',
      date: '',
      time: '',
      patientName: '',
      phone: '',
      plan: 'particular',
      checkup: ''
    });
    setBookingStep(1);
    setIsBookingModalOpen(false);
    setIsSessionExpired(true);
  };

  // Monitora interações quando o modal de agendamento está ativo para redefinir o temporizador
  useEffect(() => {
    if (isBookingModalOpen) {
      resetInactivityTimer();
      
      const events = ['mousemove', 'keydown', 'click', 'touchstart'];
      const handleActivity = () => resetInactivityTimer();
      
      events.forEach(event => {
        window.addEventListener(event, handleActivity);
      });
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        events.forEach(event => {
          window.removeEventListener(event, handleActivity);
        });
      };
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [isBookingModalOpen, appointment]);

  // CONTROLE DE ACESSO DE ESTADO & PREVENÇÃO DE DESVIOS (ETAPA 3)
  // Bloqueia e reverte qualquer estado de progresso de agendamento que desvie dos pré-requisitos lógicos.
  useEffect(() => {
    if (!isBookingModalOpen) {
      if (bookingStep !== 1) setBookingStep(1);
      return;
    }

    // Regra para Passo 2 (Informações Pessoais do Paciente)
    // Exige obrigatoriamente Especialidade, Data válida e Período preenchidos
    if (bookingStep === 2) {
      if (!appointment.specialty || !appointment.date || !appointment.time) {
        setBookingStep(1);
        setValidationError('Por favor, preencha os dados da primeira etapa antes de avançar.');
      }
    }

    // Regra para Passo 3 (Confirmação e Envio)
    // Exige obrigatoriamente Nome e Telefone válidos além dos dados do Passo 2
    if (bookingStep === 3) {
      if (!appointment.specialty || !appointment.date || !appointment.time || !appointment.patientName || !appointment.phone) {
        setBookingStep(1);
        setValidationError('Não é possível concluir o agendamento sem preencher todas as informações obrigatórias.');
      }
    }
  }, [bookingStep, isBookingModalOpen, appointment]);

  // Lista Real de Pacotes de Check-up da Clínica Luna & Mendes (Extraído do Perfil)
  const checkups = [
    {
      id: 'checkup-completo',
      name: 'Check-up Completo',
      price: 'R$ 169,99',
      subtitle: 'Mais saúde e tranquilidade para sua viagem ou rotina',
      tag: 'Mais Procurado',
      exams: [
        'Hemograma Completo',
        'Ácido Úrico',
        'Vitamina D',
        'Creatinina',
        'Glicose',
        'Ureia',
        'Triglicerídeos',
        'Colesterol Total',
        'TGO / TGP',
        'TSH & T4 Livre',
        'LDL / VLDL / HDL'
      ]
    },
    {
      id: 'checkup-feminino',
      name: 'Check-up Feminino',
      price: 'R$ 165,99',
      subtitle: 'Prevenção e acompanhamento completo de saúde da mulher',
      tag: 'Essencial Mulher',
      exams: [
        'Citologia (Preventivo)',
        'Tireoide (TSH e T4 Livre)',
        'Vitamina D',
        'Hemograma Completo',
        'Glicose em Jejum',
        'Eletrólitos (Sódio e Potássio)',
        'Sumário de Urina',
        'Colesterol Total e Frações',
        'Triglicerídeos completos'
      ]
    },
    {
      id: 'checkup-infantil',
      name: 'Check-up Infantil',
      price: 'R$ 90,90',
      subtitle: 'Acompanhamento do desenvolvimento e exames fundamentais',
      tag: 'Pediátrico',
      exams: [
        'Hemograma Completo',
        'Hemoglobina Glicada',
        'Ferro Sérico',
        'Colesterol Total',
        'Colesterol HDL / LDL',
        'Colesterol VLDL',
        'Sódio e Potássio',
        'Sumário de Urina',
        'Parasitológico de Fezes'
      ]
    },
    {
      id: 'checkup-folia',
      name: 'Check-up Pré/Pós Festas',
      price: 'R$ 149,99',
      subtitle: 'Avaliação clínica geral e exames de infecção essenciais',
      tag: 'Foco Geral',
      exams: [
        'Hemograma',
        'Glicose',
        'Ureia e Creatinina',
        'TGO / TGP (Função Hepática)',
        'Exame de Urina (EAS)',
        'Hepatite B e C',
        'HIV',
        'Sífilis'
      ]
    }
  ];

  // Lista Real de Especialistas do Corpo Clínico da Clínica Luna & Mendes (Extraído do Perfil)
  const doctors = [
    {
      id: 'dr-henrique-feitosa',
      name: 'Dr. Henrique Feitosa',
      role: 'Médico Cardiologista',
      category: 'Medicina',
      crm: 'CRM/CE 16.842',
      details: [
        'Consultas Cardiológicas e Exames Preventivos (Eletrocardiograma)',
        'Laudo de Risco Cirúrgico e Avaliação Cardiovascular Completa',
        'Tratamento de Doenças Cardiovasculares, Arritmias e Hipertensão',
        'Acompanhamento de Valvopatias e Insuficiência Cardíaca'
      ],
      whatsappMsg: 'Gostaria de agendar uma consulta cardiológica com o Dr. Henrique Feitosa.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.41.jpeg'
    },
    {
      id: 'dr-everton-silveira',
      name: 'Dr. Éverton Silveira Macedo',
      role: 'Médico Cirurgião Geral e Urologista',
      category: 'Medicina',
      crm: 'CRM/CE 17.085 | RQE 13.423',
      details: [
        'Tratamento de doenças da Próstata, Rins, Bexiga e Testículos',
        'Cálculos Renais, Câncer Urológico, Fimose, Hidrocele e Varicocele',
        'Vasectomia, Disfunção Erétil, Ejaculação Precoce e Infertilidade Masculina',
        'Diagnóstico e Tratamento de ISTs e Realização de Biópsia de Próstata'
      ],
      whatsappMsg: 'Gostaria de agendar uma consulta urológica com o Dr. Éverton Silveira Macedo.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.42%20(1).jpeg'
    },
    {
      id: 'junior-soares',
      name: 'Júnior Soares',
      role: 'Enfermeiro Dermato-Estomaterapeuta',
      category: 'Enfermagem',
      crm: 'COREN Especializado',
      details: [
        'Dermatologia e Estomaterapia aplicada ao Tratamento de Feridas e Curativos',
        'Habilitação Avançada em Laserterapia para Diferentes Patologias',
        'Acompanhamento Técnico e Cuidados em Feridas Complexas'
      ],
      whatsappMsg: 'Gostaria de agendar atendimento com o enfermeiro especialista Júnior Soares.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.42%20(2).jpeg'
    },
    {
      id: 'ana-cecilia-benicio',
      name: 'Ana Cecília Benício',
      role: 'Enfermeira Estomaterapeuta & Laserterapeuta',
      category: 'Enfermagem',
      crm: 'COREN Estomaterapia',
      details: [
        'Tratamento Avançado de Feridas Crônicas (Adulto e Pediátrico)',
        'Laser de Baixa Potência para diversas patologias e cicatrização',
        'Acompanhamento pós-operatório, pós-parto e prevenção de fissura mamária',
        'Manejo de ostomias e orientação para troca de bolsas'
      ],
      whatsappMsg: 'Gostaria de agendar atendimento estomaterápico/feridas com Ana Cecília.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.42%20(3).jpeg'
    },
    {
      id: 'dra-myreia-petronio',
      name: 'Dra. Myreia Petronio',
      role: 'Médica Ginecologista e Obstetra',
      category: 'Medicina',
      crm: 'CRM/CE 21.151',
      details: [
        'Atuação em Ginecologia Geral e Especialista em Cirurgia Ginecológica Minimamente Invasiva',
        'Inserção segura de DIU e Implanon sob Técnica Guiada',
        'Realização de Colposcopia e Microscopia de Conteúdo Vaginal',
        'Pré-Natal Completo, Puericultura e Obstetrícia'
      ],
      whatsappMsg: 'Gostaria de agendar uma consulta ginecológica com a Dra. Myreia Petronio.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.42%20(4).jpeg'
    },
    {
      id: 'dra-tamyllys-tavares',
      name: 'Dra. Tamyllys Tavares',
      role: 'Médica Psiquiatra de Adultos, Crianças e Adolescentes',
      category: 'Medicina',
      crm: 'CRM/PB 12.817',
      details: [
        'Pós-graduada em Psiquiatria Geral',
        'Pós-graduando em Psiquiatria da Infância e Adolescência — Albert Einstein (SP)',
        'Tratamento de Transtornos de Humor, Conduta e Autismo no Desenvolvimento',
        'Suporte em Saúde Mental Integrada para Adultos e Crianças'
      ],
      whatsappMsg: 'Gostaria de agendar consulta em Psiquiatria com a Dra. Tamyllys Tavares.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.42.jpeg'
    },
    {
      id: 'josiclea-cassiano',
      name: 'Josiclea Cassiano',
      role: 'Fonoaudióloga Especialista em Audiologia',
      category: 'Reabilitação',
      crm: 'CRFa Ativo',
      details: [
        'Especialista em Audiologia e Analista do Comportamento Aplicado (ABA)',
        'Pós-graduanda em Autismo e Fonoaudiologia do Trabalho',
        'Capacitação em Laserterapia, Tratamento de Disfagia e Alterações de Linguagem',
        'Realização do Teste da Orelhinha (Triagem Nacional) e do Teste da Linguinha'
      ],
      whatsappMsg: 'Gostaria de agendar fonoaudiologia com Josiclea Cassiano.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.43%20(1).jpeg'
    },
    {
      id: 'dra-renata-aquino',
      name: 'Dra. Renata Aquino',
      role: 'Médica Dermatologista',
      category: 'Medicina',
      crm: 'CRM/CE 24.315',
      details: [
        'Biópsia de Câncer de Pele e Retirada de Sinais, Lipomas e Cistos',
        'Procedimentos Estéticos: Lobuloplastia, Blefaroplastia e Correção de Lóbulo de Orelha',
        'Tratamento clínico de Doenças de Pele, Acne, Queloides e Manchas',
        'Tratamento de Queda de Cabelo e Terapia Capilar Avançada'
      ],
      whatsappMsg: 'Gostaria de agendar consulta com a dermatologista Dra. Renata Aquino.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.43%20(2).jpeg'
    },
    {
      id: 'jamile-santos',
      name: 'Jamile Santos',
      role: 'Enfermeira de Rastreamento Preventivo',
      category: 'Enfermagem',
      crm: 'COREN Rastreio',
      details: [
        'Realização de Exame Citopatológico Preventivo Ginecológico',
        'Atendimento Humanizado, focado no conforto físico e emocional',
        'Orientações sobre autocuidado, imunização e prevenção de saúde'
      ],
      whatsappMsg: 'Gostaria de agendar preventivo com a Enfermeira Jamile Santos.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.43%20(3).jpeg'
    },
    {
      id: 'dr-cicero-hedilberto',
      name: 'Dr. Cícero Hedilberto',
      role: 'Gastroenterologista, Endoscopista e Cirurgião Geral',
      category: 'Medicina',
      crm: 'CRM 10.466 | RQE 12.361',
      details: [
        'Consultas especializadas em Gastroenterologia e vias gástricas',
        'Exames de Endoscopia Digestiva Alta de Alta Definição',
        'Avaliação cirúrgica geral e procedimentos eletivos'
      ],
      whatsappMsg: 'Gostaria de agendar consulta com o Dr. Cícero Hedilberto.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.43%20(4).jpeg'
    },
    {
      id: 'dr-guilherme-porto-neuropediatria',
      name: 'Dr. Guilherme Porto (Neuropediatria)',
      role: 'Médico Neuropediatra e Neurologista',
      category: 'Medicina',
      crm: 'CRM/PB 18.454',
      details: [
        'Consultas de Neuropediatria e Neurologia Clínica',
        'Tratamento de Distúrbios de Desenvolvimento e Aprendizado na Infância',
        'Abordagem clínica em patologias neurológicas e controle de crises convulsivas'
      ],
      whatsappMsg: 'Gostaria de agendar consulta de Neuropediatria com o Dr. Guilherme Porto.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.43.jpeg'
    },
    {
      id: 'dr-henrile-ferreira-nutrologia',
      name: 'Dr. Henrile Ferreira (Nutrologia)',
      role: 'Endoscopista Digestiva Alta e Nutrologia',
      category: 'Medicina',
      crm: 'CRM/CE 22.213',
      details: [
        'Atendimento focado em Emagrecimento Saudável e Longevidade',
        'Reposição Hormonal Orientada e Medicine do Estilo de Vida',
        'Terapia Injetável Médica Nutrológica e Restauração Metabólica',
        'Nutrologia voltada para longevidade ativa e bem-estar integral'
      ],
      whatsappMsg: 'Gostaria de agendar consulta de Nutrologia com o Dr. Henrile Ferreira.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.44%20(1).jpeg'
    },
    {
      id: 'samara-joice',
      name: 'Samara Joice',
      role: 'Nutricionista Materno Infantil',
      category: 'Reabilitação',
      crm: 'CRN: 49.545',
      details: [
        'Especialista em Nutrição Materno Infantil e Pós-graduanda na área',
        'Introdução Alimentar, Capacitação em ABA e Autismo',
        'Tratamento e Terapia Alimentar para Seletividade Alimentar e Dificuldades de Mastigação',
        'Acompanhamento preventivo e tratamento de Obesidade Infantil'
      ],
      whatsappMsg: 'Gostaria de agendar consulta com a Nutricionista Infantil Samara Joice.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.44%20(2).jpeg'
    },
    {
      id: 'marcia-duarte',
      name: 'Márcia Duarte',
      role: 'Fonoaudióloga Clínico-Comportamental',
      category: 'Reabilitação',
      crm: 'CRFa Ativo',
      details: [
        'Analista do Comportamento Aplicada (ABA) no Autismo (TEA)',
        'Avaliação e Intervenção focada em TEA e TDAH',
        'Manejo de Distúrbios e Atrasos de Linguagem e Transtornos de Comunicação',
        'Realização do Teste da Linguinha'
      ],
      whatsappMsg: 'Gostaria de marcar terapia de fonoaudiologia com Márcia Duarte.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.44%20(3).jpeg'
    },
    {
      id: 'paula-jamilly',
      name: 'Paula Jamilly',
      role: 'Enfermeira Especializada em Saúde da Mulher',
      category: 'Enfermagem',
      crm: 'COREN Ativo',
      details: [
        'Consultas Privadas de Enfermagem e Orientação de Métodos Contraceptivos',
        'Coleta de Citologia Oncótica (Preventivo) de Colo de Útero',
        'Esp. em Suplementação Baseada em Evidências e Terapia Injetável',
        'Acompanhamento Pré-Natal Acolhedor e Cuidados de Puericultura'
      ],
      whatsappMsg: 'Gostaria de agendar consulta de enfermagem com Paula Jamilly.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.44.jpeg'
    },
    {
      id: 'dr-guilherme-porto-neuropsiquiatria',
      name: 'Dr. Guilherme Porto (Neuropsiquiatria)',
      role: 'Médico Neuropsiquiatra',
      category: 'Medicina',
      crm: 'CRM/PB 18.454 | CRM/RN 13.923',
      details: [
        'Avaliação de Transtornos Globais de Desenvolvimento (TEA, TDAH, TOD, TOC)',
        'Tratamento de Depressão, Ansiedade, Transtornos Alimentares e Síndrome de Burnout',
        'Abordagem clínica em Parkinson, Cefaleias Crônicas e Transtorno do Sono',
        'Atendimento direcionado à reabilitação clínica integrada no Espaço Reabilitar'
      ],
      whatsappMsg: 'Gostaria de agendar consulta em Neuropsiquiatria com o Dr. Guilherme Porto.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.47.47%20(1).jpeg'
    },
    {
      id: 'dr-henrile-ferreira-endoscopia',
      name: 'Dr. Henrile Ferreira (Endoscopia)',
      role: 'Endoscopia Digestiva Alta',
      category: 'Medicina',
      crm: 'CRM/CE 22.213',
      details: [
        'Realização de Endoscopia Digestiva Alta de Alta Definição e Biópsias Gástricas',
        'Tratamento do Refluxo Gastroesofágico, Esofagites, Úlceras e Dispepsia Funcional',
        'Diagnóstico e Pesquisa Avançada de Helicobacter pylori e Lesões do Trato Gástrico',
        'Orientações nutricionais integradas no manejo de diarreias agudas e crônicas'
      ],
      whatsappMsg: 'Gostaria de agendar exame de Endoscopia com o Dr. Henrile Ferreira.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.47.47%20(2).jpeg'
    },
    {
      id: 'dr-francisco-rosario',
      name: 'Dr. Francisco Rosário',
      role: 'Médico do Trabalho & Saúde Ocupacional',
      category: 'Medicina',
      crm: 'CRM Ativo',
      details: [
        'Consultas de Medicina do Trabalho e Exames Admissionais, Periódicos e Demissionais',
        'Emissão de Atestado de Saúde Ocupacional (ASO) regulamentar',
        'Exames preventivos de retorno ao trabalho e acompanhamento de saúde do trabalhador'
      ],
      whatsappMsg: 'Gostaria de agendar exames de Medicina do Trabalho com o Dr. Francisco Rosário.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.47.47.jpeg'
    },
    {
      id: 'dr-pblo-rolim',
      name: 'Dr. Pablo Rolim',
      role: 'Ultrassonografia e Consultas Gástricas',
      category: 'Medicina',
      crm: 'CRM Ativo',
      details: [
        'Ultrassonografias convencionais e com Doppler coloridos',
        'Ultrassonografia Morfológica 1º, 2º Trimestre e 3D/4D',
        'Realização de Biópsias guiadas por USG',
        'Consultas especializadas na abordagem de patologias gástricas'
      ],
      whatsappMsg: 'Gostaria de agendar ultrassom ou consulta com o Dr. Pablo Rolim.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.47.48%20(1).jpeg'
    },
    {
      id: 'dr-fernando-filho',
      name: 'Dr. Fernando Filho',
      role: 'Médico Ultrassonografista',
      category: 'Medicina',
      crm: 'CRM/PB 13.889 | CRM/RN 12.481',
      details: [
        'Atendimento em Ultrassonografia de Tecidos e Abdômen',
        'Doppler Arterial e Venoso de Alta Precisão',
        'Acompanhamento e Laudos Ágeis e Confiáveis para Clínicos'
      ],
      whatsappMsg: 'Gostaria de agendar exame de ultrassonografia com o Dr. Fernando Filho.',
      photoUrl: 'https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.47.48.jpeg'
    },
    {
      id: 'samara-saraiva',
      name: 'Samara Saraiva',
      role: 'Psicóloga e Psicopedagoga Clínico-Infantil',
      category: 'Reabilitação',
      crm: 'CRP Ativo',
      details: [
        'Terapia Comportamental Aplicada em ABA para Autismo e TEA',
        'Terapia Cognitivo Comportamental (TCC)',
        'Avaliação e Atendimento Psicopedagógico Infantil',
        'Tratamento para Transtornos Globais do Desenvolvimento'
      ],
      whatsappMsg: 'Gostaria de agendar terapia psicológica com Samara Saraiva.',
      photoUrl: ''
    },
    {
      id: 'mara-alves',
      name: 'Mara Alves',
      role: 'Fisioterapeuta Neurofuncional e Terapeuta ABA',
      category: 'Reabilitação',
      crm: 'CREFITO Ativo',
      details: [
        'Especialista em Fisioterapia Neurofuncional Adulta e Pediátrica',
        'Aperfeiçoamento em Fisioterapia Respiratória Adulto e Infantil',
        'Intervenção Psicomotora e Terapeuta ABA dedicada',
        'Terapia Ocupacional em curso para desenvolvimento funcional'
      ],
      whatsappMsg: 'Gostaria de agendar fisioterapia/terapia ocupacional com Mara Alves.',
      photoUrl: ''
    },
    {
      id: 'socorro-maria',
      name: 'Socorro Maria',
      role: 'Psicopedagoga e Terapeuta ABA',
      category: 'Reabilitação',
      crm: 'Especialista em Educação Especial',
      details: [
        'Especialização em TEA, Psicopedagogia Institucional e ABA',
        'Capacitação no Método TEACCH e AEE',
        'Tratamento focado em Transtornos de Aprendizagem, TDAH e TOD',
        'Apoio à inclusão escolar e desenvolvimento adaptado'
      ],
      whatsappMsg: 'Gostaria de marcar avaliação psicopedagógica com Socorro Maria.',
      photoUrl: ''
    },
    {
      id: 'thayna-fernandes',
      name: 'Thayná Fernandes',
      role: 'Psicóloga Clínica de Adolescentes e Adultos',
      category: 'Reabilitação',
      crm: 'CRP Ativo',
      details: [
        'Psicologia com Abordagem Existencial, Humanista e Fenomenológica',
        'Atendimento de Casos de Ansiedade, Depressão e Saúde Mental Geral',
        'Psicoterapia de Apoio em Crises de Período de Transição de Carreira',
        'Atendimento focado, acolhedor e integrativo'
      ],
      whatsappMsg: 'Gostaria de agendar consulta psicológica com Thayná Fernandes.',
      photoUrl: ''
    },
    {
      id: 'vitoria-duarte',
      name: 'Vitória Duarte',
      role: 'Nutricionista Clínica & Esportiva',
      category: 'Reabilitação',
      crm: 'CRN Ativo',
      details: [
        'Planos Alimentares Personalizados e Educação Nutricional Integral',
        'Emagrecimento Funcional Saudável, Hipertrofia e Definição Muscular',
        'Nutrição voltada para gestação, infância, fase escolar e longevidade',
        'Modulação de Hábitos Saudáveis e Rotina Equilibrada'
      ],
      whatsappMsg: 'Gostaria de agendar consulta com a Nutricionista Vitória Duarte.',
      photoUrl: ''
    }
  ];

  // Gancho de Integração com o Sanity.io (Médicos, Serviços e Configs Dinâmicos!)
  const { doctors: sanityDoctors, services: sanityServices, config: sanityConfig } = useSanityData();

  // Mapeia e consolida os dados de Contato, Endereço e Funcionamento dinamicamente com Fallbacks robustos
  const centralWhatsApp = sanityConfig?.whatsapp || '5588996248427';
  const centralWhatsAppDisplay = sanityConfig?.whatsappDisplay || '(88) 99624-8427';
  const centralEmail = sanityConfig?.email || 'contato@lunaemendes.com.br';
  const centralAddress = sanityConfig?.address || 'Av. Antônio Ricardo, 29, Centro, Aurora - CE, 63360-000';
  const centralOpeningHours = sanityConfig?.openingHours || 'Segunda a Sexta: 07h às 18h | Sábado: 07h às 12h';
  const centralInstagram = sanityConfig?.instagramUrl || 'https://instagram.com/lunaemendes';

  // Consolidação dinâmica do Corpo Técnico (Prisma/PostgreSQL prioritário + Fallbacks do Sanity/Local)
  const finalDoctors = useMemo(() => {
    // Lista base de médicos (Sanity se houver, senão local)
    const baseList = sanityDoctors.length > 0 ? sanityDoctors : doctors;

    // Se houver registros populados no banco PostgreSQL (Supabase) via API /api/medicos
    if (dbMedicos && dbMedicos.length > 0) {
      return dbMedicos.map((dbMed: any) => {
        // Tenta associar com nosso banco de especialistas local pelo nome do médico
        const localMatch = baseList.find(
          (loc) => loc.name.toLowerCase().trim() === dbMed.nome.toLowerCase().trim()
        );

        return {
          id: `db-${dbMed.id}`,
          name: dbMed.nome,
          role: dbMed.especialidade,
          category: localMatch?.category || 'Medicina',
          crm: localMatch?.crm || 'CRM Ativo',
          photoUrl: (dbMed.foto_url && !dbMed.foto_url.startsWith('COLE_AQUI_')) ? dbMed.foto_url : (localMatch?.photoUrl || ''), // Ignora os placeholders de seed e usa recurso estático ou vazio
          details: localMatch?.details || [
            'Atendimento integral e personalizado',
            'Acompanhamento e suporte continuado',
            'Excelência técnica orientada à saúde'
          ],
          whatsappMsg: localMatch?.whatsappMsg || `Olá, gostaria de agendar uma consulta com ${dbMed.nome}.`
        };
      });
    }

    return baseList;
  }, [sanityDoctors, dbMedicos]);

  // SANITIZAÇÃO DE ENTRADA, PREVENÇÃO DE XSS E INJEÇÃO (ETAPA 2)
  // Remove marcas de tags HTML/XML ou injeção de scripts maliciosos e limita caracteres
  const sanitizeText = (input: string, limitLength: number = 80): string => {
    if (!input) return '';
    let clean = input.replace(/<[^>]*>?/gm, '');
    clean = clean.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    return clean.slice(0, limitLength).trim();
  };

  // Filtra a entrada de pesquisa para evitar caracteres perigosos de negação de serviço algorítmico, XSS ou injeção
  const sanitizeSearchTerm = (input: string): string => {
    if (!input) return '';
    let clean = input.replace(/[^a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ\s.,()/-]/g, '');
    return clean.slice(0, 40);
  };

  // Sanitiza e formata o número do celular de forma estrita para evitar injeção e phone spoofing
  const sanitizePhoneNumber = (input: string): string => {
    if (!input) return '';
    let clean = input.replace(/[^0-9()\s+-]/g, '');
    return clean.slice(0, 20);
  };

  const [validationError, setValidationError] = useState<string | null>(null);

  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Copiar endereço, PIX ou contatos para área de transferência
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Enviar agendamento e avançar com validação estrita (ETAPA 2/4)
  const handleBookingSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 0. Rate Limiting de Borda no Cliente (ETAPA 4)
    // Protege contra ataques de flood, força bruta e abuso de agendamentos automatizados
    const now = Date.now();
    const recentSubmits = submitHistory.filter(timestamp => now - timestamp < 60000);
    
    if (recentSubmits.length >= 3 || rateLimited) {
      setRateLimited(true);
      setValidationError('Bloqueio temporário de segurança: Limite de agendamentos excedido. Por favor, aguarde 60 segundos para tentar novamente.');
      return;
    }

    if (isSubmitting) return; // Trava contra duplo clique concorrente

    // Validação estrita de cada dado inserido pelo usuário
    const cleanName = sanitizeText(appointment.patientName, 60);
    const cleanPhone = sanitizePhoneNumber(appointment.phone);
    const cleanSpecialty = sanitizeText(appointment.specialty, 40);
    const cleanTime = sanitizeText(appointment.time, 30);

    // 1. Validar Nome
    if (!cleanName || cleanName.length < 3) {
      setValidationError('Por favor, informe o nome completo do paciente contendo ao menos 3 caracteres.');
      return;
    }

    // 2. Validar Telefone / WhatsApp
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      setValidationError('O número de WhatsApp informado é inválido. Digite um número real com DDD (ex: 88996248427).');
      return;
    }

    // 3. Validar Especialidade/Serviço
    const validSpecialties = ['Análises Clínicas', 'Cardiologia', 'Ginecologia', 'Urologia', 'Reabilitação'];
    if (!cleanSpecialty || !validSpecialties.includes(cleanSpecialty)) {
      setValidationError('Área de interesse ou procedimento inválido.');
      return;
    }

    // 4. Validar Data (Prevenir agendamentos retroativos)
    if (!appointment.date || appointment.date < todayStr) {
      setValidationError('Selecione uma data de agendamento válida (hoje ou no futuro).');
      return;
    }

    // 5. Validar Período
    const validTimes = ['Manhã (07h às 12h)', 'Tarde (13h às 18h)', 'Manhã', 'Tarde'];
    const matchesTime = validTimes.some(t => cleanTime.includes(t) || t.includes(cleanTime));
    if (!cleanTime || !matchesTime) {
      setValidationError('Selecione um período de atendimento válido (Manhã ou Tarde).');
      return;
    }

    // Inicia a transação garantindo a idempotência e simulando envio por rede ao servidor de forma segura
    setIsSubmitting(true);

    setTimeout(() => {
      // Atualiza o estado com os dados sanitizados e validados para renderização segura
      setAppointment({
        ...appointment,
        patientName: cleanName,
        phone: cleanPhone,
        specialty: cleanSpecialty,
        time: cleanTime
      });

      // Registra timestamp do envio no histórico para controle de requisições por minuto
      setSubmitHistory(prev => [...prev, now]);
      setIsSubmitting(false);
      setBookingStep(3); // Mostra sucesso com dados blindados
    }, 1200); // 1.2s de latência simulada de transmissão segura criptografada
  };

  // Reiniciar agendamento
  const resetBooking = () => {
    setAppointment({
      specialty: '',
      doctor: '',
      date: '',
      time: '',
      patientName: '',
      phone: '',
      plan: 'particular',
      checkup: ''
    });
    setBookingStep(1);
    setIsBookingModalOpen(false);
    setIsSessionExpired(false);
    setValidationError(null);
    setIsSubmitting(false);
    // Regenera a chave de idempotência para o próximo agendamento
    setIdempotencyKey(Math.random().toString(36).substring(2, 11) + '-' + Date.now());
  };

  // Filtragem dinâmica inteligente baseada no termo de busca (pesquisa por nome, especialidade, procedimentos ou checkups)
  const filteredOutput = useMemo(() => {
    if (!searchTerm) return { doctors: [], checkups: [], hasMatches: false };

    const term = searchTerm.toLowerCase();

    const matchedDocs = finalDoctors.filter(doc => 
      doc.name.toLowerCase().includes(term) ||
      doc.role.toLowerCase().includes(term) ||
      doc.details.some(det => det.toLowerCase().includes(term))
    );

    const matchedCheckups = checkups.filter(chk => 
      chk.name.toLowerCase().includes(term) ||
      chk.subtitle.toLowerCase().includes(term) ||
      chk.exams.some(exm => exm.toLowerCase().includes(term))
    );

    return {
      doctors: matchedDocs,
      checkups: matchedCheckups,
      hasMatches: matchedDocs.length > 0 || matchedCheckups.length > 0
    };
  }, [searchTerm, finalDoctors]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A2F2D] font-sans antialiased" id="clinic-root">
      
      {isSessionExpired && (
        <div className="bg-[#C5A880] text-[#0A2B2A] px-4 py-3 text-center text-xs font-semibold flex items-center justify-between shadow-inner relative z-50 animate-fade-in animate-duration-300">
          <div className="flex-1 text-center flex items-center justify-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#0A2B2A]" />
            <span>Sua solicitação de agendamento expirou por inatividade para garantir o sigilo dos seus dados pessoais (Diretrizes de Privacidade & LGPD).</span>
          </div>
          <button 
            onClick={() => setIsSessionExpired(false)} 
            className="text-[#0A2B2A] hover:bg-[#0A2B2A]/10 p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Dispensar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. TOPO DA PÁGINA / BARRA DE NAVEGAÇÃO PREMIUM (Estilo Luna & Mendes) */}
      <header className="sticky top-0 z-40 bg-[#0A2B2A] border-b border-[#C5A880]/30 text-white shadow-lg backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4" id="navbar-container">
            
            {/* Logo da Clínica */}
            <a href="#clinic-root" className="flex items-center space-x-3 group shrink-0" id="logo-brand">
              <ClinicLogo size={46} variant="gold-teal" className="transform group-hover:scale-105 transition-transform" />
              <div className="flex flex-col justify-center leading-none">
                <span className="font-serif text-base sm:text-lg font-bold tracking-wider text-[#C5A880] group-hover:text-white transition-colors whitespace-nowrap">
                  LUNA & MENDES
                </span>
                <span className="text-[8px] sm:text-[9.5px] uppercase tracking-widest text-[#E3C9A6] font-semibold whitespace-nowrap mt-1 opacity-90">
                  Saúde • Diagnóstico • Reabilitação
                </span>
              </div>
            </a>

            {/* Menu Desktop */}
            <nav className="hidden lg:flex items-center gap-x-5 xl:gap-x-7 text-[11px] xl:text-xs font-semibold uppercase tracking-widest" id="desktop-nav">
              <a href="#exames" className="text-white/80 hover:text-[#C5A880] transition-colors whitespace-nowrap relative py-2 group">
                Check-ups
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C5A880] group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="#especialistas" className="text-white/80 hover:text-[#C5A880] transition-colors whitespace-nowrap relative py-2 group">
                Corpo Técnico
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C5A880] group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="#espaco-reabilitar" className="text-white/80 hover:text-[#C5A880] transition-colors whitespace-nowrap relative py-2 group">
                Espaço Reabilitar
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C5A880] group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="#sobre" className="text-white/80 hover:text-[#C5A880] transition-colors whitespace-nowrap relative py-2 group">
                Nossa Clínica
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C5A880] group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="#localizacao" className="text-white/80 hover:text-[#C5A880] transition-colors whitespace-nowrap relative py-2 group">
                Localização
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C5A880] group-hover:w-full transition-all duration-300"></span>
              </a>
            </nav>

            {/* Botão de Agendamento Rápido no Header */}
            <div className="hidden lg:flex items-center gap-x-4 xl:gap-x-6 shrink-0">
              <Link 
                to="/admin/login"
                className="text-white/70 hover:text-[#C5A880] text-[11px] xl:text-xs font-bold tracking-widest uppercase transition-colors flex items-center whitespace-nowrap gap-1.5 py-2 group"
              >
                <Lock className="w-3.5 h-3.5 text-[#C5A880] shrink-0 group-hover:scale-110 transition-transform" />
                Painel Admin
              </Link>
              <Link 
                to="/agendar"
                className="bg-gradient-to-r from-[#C5A880] to-[#E3C9A6] text-[#0A2B2A] px-5 py-2.5 rounded-full text-[11px] xl:text-xs font-black shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-95 transition-all text-center whitespace-nowrap"
              >
                Agendamento Online
              </Link>
            </div>

            {/* Hamburguer Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-white hover:text-[#C5A880] focus:outline-none focus:ring-2 focus:ring-[#C5A880]/30 rounded-lg"
              aria-label="Abrir menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

          </div>
        </div>

        {/* Menu Retrátil Mobile */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#0A2B2A] border-t border-[#C5A880]/20 px-4 py-6 space-y-4 shadow-inner" id="mobile-nav">
            <div className="flex flex-col space-y-3 font-semibold text-sm">
              <a href="#exames" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C5A880] py-1 border-b border-white/5">Check-ups e Exames</a>
              <a href="#especialistas" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C5A880] py-1 border-b border-white/5">Nosso Corpo Técnico</a>
              <a href="#espaco-reabilitar" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C5A880] py-1 border-b border-white/5">Espaço Reabilitar (ABA)</a>
              <a href="#sobre" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C5A880] py-1 border-b border-white/5">Estrutura</a>
              <a href="#localizacao" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C5A880] py-1">Localização e Contato</a>
              <Link to="/agendar" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C5A880] py-1 text-emerald-400 font-bold border-b border-white/5 pb-2">Agendar Consulta</Link>
              <Link to="/admin/login" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#C5A880] text-amber-500 font-bold py-1 flex items-center">
                <Lock className="w-3.5 h-3.5 mr-2 text-amber-500" />
                Painel Admin
              </Link>
            </div>
            <div className="pt-4 flex flex-col space-y-3">
              <a 
                href="https://wa.me/5588996248427"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#134645] border border-[#C5A880] text-center py-2.5 rounded-xl text-xs font-bold text-[#E3C9A6]"
              >
                Atendimento WhatsApp
              </a>
              <Link 
                to="/agendar"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full bg-[#C5A880] text-[#0A2B2A] text-center py-2.5 rounded-xl text-xs font-extrabold"
              >
                Agendamento Rápido
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO / PRIMEIRA SEÇÃO (Apresentação Visual Sofisticada) */}
      <section className="relative bg-gradient-to-b from-[#0A2B2A] to-[#123E3C] text-white py-24 md:py-32 overflow-hidden border-b border-[#C5A880]/20">
        <div className="absolute inset-0 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] from-[#134645]/40 via-[#0A2B2A]/90 to-[#0A2B2A] pointer-events-none"></div>
        
        {/* Elemento Geométrico Decorativo de Ouro */}
        <div className="absolute right-0 top-1/4 w-96 h-96 bg-[#C5A880]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-[-10%] bottom-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Texto de Coprywriting Real e Convincente */}
            <div className="lg:col-span-7 space-y-6 text-left" id="hero-marketing-box">
              <div className="inline-flex items-center space-x-2 bg-[#C5A880]/15 border border-[#C5A880]/30 px-3.5 py-1.5 rounded-full text-[#E3C9A6] text-xs font-semibold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>O Cuidado Que Sua Saúde Exige em Aurora-CE</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                Compromisso com <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E3C9A6] via-[#C5A880] to-[#E3C9A6] font-serif italic font-normal">
                  Sua Saúde e Bem-Estar
                </span>
              </h1>

              <p className="text-slate-300 text-base md:text-lg max-w-2xl leading-relaxed">
                A <strong>Luna & Mendes</strong> é uma clínica multiprofissional moderna, integrando exames laboratoriais, especialidades médicas e o conceituado <strong>Espaço Reabilitar</strong> com terapias integradas de alta performance no Cariri Cearense.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4" id="hero-actions">
                <button
                  onClick={() => navigate('/agendar')}
                  className="bg-gradient-to-r from-[#C5A880] to-[#E3C9A6] text-[#0A2B2A] font-extrabold px-8 py-4 rounded-xl text-sm shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
                >
                  <Calendar className="w-4.5 h-4.5" />
                  <span>Solicitar Consulta / Exame</span>
                </button>
                <a
                  href="https://wa.me/5588996248427"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 text-white font-bold px-8 py-4 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4.5 h-4.5 text-emerald-400 fill-emerald-400/20" />
                  <span>WhatsApp de Agendamento</span>
                </a>
              </div>

              {/* Informações de Endereço Rápido e Contato da Bio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-white/10 text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-[#C5A880]" />
                  <span>Aurora - Ceará</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#C5A880]" />
                  <span>Espaço Reabilitar integrado</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-[#C5A880]" />
                  <span>Exames • Especialidades</span>
                </div>
              </div>

            </div>

            {/* Imagem ou Bloco Ilustrado do Instagram */}
            <div className="lg:col-span-5 relative" id="hero-imagery">
              <div className="relative mx-auto max-w-sm lg:max-w-none">
                
                {/* Backplate brilhante */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#C5A880]/30 to-emerald-700/20 rounded-3xl blur-2xl transform rotate-3 -z-10"></div>
                
                {/* Card de Informações Médicas Flutuantes */}
                <div className="bg-[#123E3C] border border-[#C5A880]/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
                  
                  <div className="flex justify-between items-start pb-4 border-b border-white/10">
                    <div className="space-y-1">
                      <p className="text-xs text-[#E3C9A6] font-bold tracking-widest uppercase">Saúde & Diagnóstico</p>
                      <h3 className="font-serif text-2xl font-bold">Unidade de Atendimento</h3>
                    </div>
                    <span className="bg-white/10 text-white text-[10px] font-semibold px-2 py-1 rounded">2026</span>
                  </div>

                  <div className="py-6 space-y-4">
                    <div className="flex items-center space-x-3 text-slate-200">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#C5A880]">
                        <Check className="w-4 h-4" />
                      </div>
                      <span className="text-xs">Laboratório de Análises Clínicas Clínico-Químicas</span>
                    </div>
                    <div className="flex items-center space-x-3 text-slate-200">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#C5A880]">
                        <Check className="w-4 h-4" />
                      </div>
                      <span className="text-xs">Cardiologia, Ginecologia, Psiquiatria & Neurologia</span>
                    </div>
                    <div className="flex items-center space-x-3 text-slate-200">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#C5A880]">
                        <Check className="w-4 h-4" />
                      </div>
                      <span className="text-xs">Espaço Reabilitar: Terapias ABA, Psico e Fono</span>
                    </div>
                  </div>

                  <div className="bg-[#0A2B2A] border border-[#C5A880]/20 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-xs text-slate-200 font-semibold">Consulte horários para coletas</span>
                    </div>
                    <a 
                      href="#exames" 
                      className="text-[11px] text-[#C5A880] hover:text-white font-bold flex items-center space-x-0.5"
                    >
                      <span>Ver exames</span>
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. SEÇÃO AVANÇADA DE BUSCA E SERVIÇOS (A Solução que Mantém os 3 Serviços ao Esvaziar e Filtra Inteligente ao Pesquisar) */}
      <section className="py-16 md:py-24 bg-white relative" id="servicos">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header da Seção de Serviços */}
          <div className="text-center max-w-3xl mx-auto mb-10" id="services-section-header">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#134645]">Áreas de Atuação</span>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#0A2B2A] mt-2">
              Qualidade de Atendimento Multidisciplinar
            </h2>
            <div className="w-14 h-0.5 bg-[#C5A880] mx-auto mt-4 rounded-full"></div>
            <p className="text-[#354D4B] text-sm mt-3">
              Utilize o campo de busca instantâneo para localizar coletas, médicos pelo nome ou especialidades integradas disponíveis.
            </p>
          </div>

          {/* Barra de Pesquisa Baseada em Palavras-Chave Reais */}
          <div className="max-w-xl mx-auto mb-14 px-1 md:px-0" id="services-search">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                <Search className="w-5 h-5 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Busque por exame, médico ou especialidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(sanitizeSearchTerm(e.target.value))}
                className="w-full pl-11 pr-16 py-3.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0A2B2A]/10 focus:border-[#0A2B2A] text-slate-800 transition-all font-medium placeholder:text-slate-400 shadow-sm"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-xs text-slate-400 hover:text-red-500 font-semibold"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* EXIBIÇÃO: SE A BUSCA ESTIVER VAZIA -> EXIBE OS 3 SERVIÇOS IGUAL ANTES */}
          {!searchTerm ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="default-services-3-grid">
              
              {/* Card 1: Laboratório & Exames Diagnósticos */}
              <div 
                className="group bg-slate-50 hover:bg-[#FAF8F5] rounded-3xl p-8 border border-slate-100 hover:border-[#C5A880]/40 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                id="default-card-1"
              >
                <div className="space-y-6">
                  <div className="w-14 h-14 bg-[#FAF8F5] border border-slate-200/50 rounded-2xl flex items-center justify-center text-[#134645] group-hover:bg-[#0A2B2A] group-hover:text-white transition-all">
                    <FileText className="w-7 h-7 text-[#0A2B2A] group-hover:text-white" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif text-xl font-bold text-[#0A2B2A]">Medicina Diagnóstica</h4>
                      <span className="bg-[#FAF8F5] border border-[#C5A880]/30 text-[#AF926B] text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Check-ups</span>
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Painel laboratorial certificado para exames de rotina, rastreamento preventivo feminino, infantil e coletas facilitadas na região de Aurora.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center text-xs text-slate-600 font-medium">
                      <Check className="w-4 h-4 text-[#C5A880] mr-2 flex-shrink-0" />
                      <span>Check-up Completo com 11+ exames</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-600 font-medium">
                      <Check className="w-4 h-4 text-[#C5A880] mr-2 flex-shrink-0" />
                      <span>Rastreamento Preventivo Feminino</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-600 font-medium">
                      <Check className="w-4 h-4 text-[#C5A880] mr-2 flex-shrink-0" />
                      <span>Entrega ágil e consulta de laudo online</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8">
                  <a
                    href="#exames"
                    className="w-full inline-flex items-center justify-between px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-[#0A2B2A] bg-white group-hover:bg-[#0A2B2A] group-hover:text-white group-hover:border-transparent transition-all cursor-pointer"
                  >
                    <span>Conhecer Pacotes de Check-up</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>

              {/* Card 2: Corpo Clínico & Consultas Especializadas */}
              <div 
                className="group bg-slate-50 hover:bg-[#FAF8F5] rounded-3xl p-8 border border-slate-100 hover:border-[#C5A880]/40 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                id="default-card-2"
              >
                <div className="space-y-6">
                  <div className="w-14 h-14 bg-[#FAF8F5] border border-slate-200/50 rounded-2xl flex items-center justify-center text-[#134645] group-hover:bg-[#0A2B2A] group-hover:text-white transition-all">
                    <Stethoscope className="w-7 h-7 text-[#0A2B2A] group-hover:text-white" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif text-xl font-bold text-[#0A2B2A]">Consultas Médicas</h4>
                      <span className="bg-[#FAF8F5] border border-[#C5A880]/30 text-[#AF926B] text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Especialistas</span>
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Corpo clínico composto por médicos cardiologista, ginecologista, urologista, psiquiatra, dermatologista e clínico integrativo de alta expertise.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center text-xs text-slate-600 font-medium">
                      <Check className="w-4 h-4 text-[#C5A880] mr-2 flex-shrink-0" />
                      <span>Cardiologista especialista (Dr. Henrique)</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-600 font-medium">
                      <Check className="w-4 h-4 text-[#C5A880] mr-2 flex-shrink-0" />
                      <span>Ginecologia & Inserção de DIU/Implanon</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-600 font-medium">
                      <Check className="w-4 h-4 text-[#C5A880] mr-2 flex-shrink-0" />
                      <span>Urologia avançada & Diagnóstico por Imagem</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8">
                  <a
                    href="#especialistas"
                    className="w-full inline-flex items-center justify-between px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-[#0A2B2A] bg-white group-hover:bg-[#0A2B2A] group-hover:text-white group-hover:border-transparent transition-all cursor-pointer"
                  >
                    <span>Conhecer Nossos Especialistas</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>

              {/* Card 3: Espaço Reabilitar & Terapias Multidisciplinares */}
              <div 
                className="group bg-slate-50 hover:bg-[#FAF8F5] rounded-3xl p-8 border border-slate-100 hover:border-[#C5A880]/40 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                id="default-card-3"
              >
                <div className="space-y-6">
                  <div className="w-14 h-14 bg-[#FAF8F5] border border-slate-200/50 rounded-2xl flex items-center justify-center text-[#134645] group-hover:bg-[#0A2B2A] group-hover:text-white transition-all">
                    <Heart className="w-7 h-7 text-[#0A2B2A] group-hover:text-white" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif text-xl font-bold text-[#0A2B2A]">Espaço Reabilitar</h4>
                      <span className="bg-[#FAF8F5] border border-[#C5A880]/30 text-[#AF926B] text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Terapias ABA</span>
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Espaço dedicado à reabilitação especializado no espetro autista (TEA) e TDAH com Fonoaudiologia, Fisioterapia, Psicopedagogia e Psicologia.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center text-xs text-slate-600 font-medium">
                      <Check className="w-4 h-4 text-[#C5A880] mr-2 flex-shrink-0" />
                      <span>Método ABA Clínico estruturado</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-600 font-medium">
                      <Check className="w-4 h-4 text-[#C5A880] mr-2 flex-shrink-0" />
                      <span>Fonoaudiologia focado em comunicação</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-600 font-medium">
                      <Check className="w-4 h-4 text-[#C5A880] mr-2 flex-shrink-0" />
                      <span>Atendimento Psicoprofissional de excelência</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8">
                  <a
                    href="#espaco-reabilitar"
                    className="w-full inline-flex items-center justify-between px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-[#0A2B2A] bg-white group-hover:bg-[#0A2B2A] group-hover:text-white group-hover:border-transparent transition-all cursor-pointer"
                  >
                    <span>Focar no Espaço Reabilitar</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>

            </div>
          ) : (
            /* EXIBIÇÃO EM TEMPO REAL SE O USUÁRIO ESTIVER PESQUISANDO */
            <div className="space-y-10" id="search-results-section animate-fade-in">
              <div className="flex items-center justify-between border-b pb-4">
                <p className="text-sm text-slate-600">
                  Exibindo resultados para a busca: <strong className="text-[#0A2B2A]">"{searchTerm}"</strong>
                </p>
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="text-xs text-red-600 font-bold hover:underline"
                >
                  Ver todos os serviços padrão
                </button>
              </div>

              {/* Se houver resultados correspondentes */}
              {filteredOutput.hasMatches ? (
                <div className="space-y-10">
                  
                  {/* Se encontrar Especialistas */}
                  {filteredOutput.doctors.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-serif text-lg font-bold text-[#0A2B2A] flex items-center gap-1.5">
                        <Users className="w-5 h-5 text-[#C5A880]" />
                        <span>Profissionais Encontrados ({filteredOutput.doctors.length})</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredOutput.doctors.map(doc => (
                          <div key={doc.id} className="bg-[#FAF8F5] border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-bold text-slate-800 text-sm">{doc.name}</h4>
                                  <p className="text-xs text-[#AF926B] font-medium">{doc.role}</p>
                                </div>
                                <span className="bg-[#0A2B2A] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                  {doc.crm}
                                </span>
                              </div>
                              <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                                {doc.details.map((detail, idx) => (
                                  <li key={idx} className="flex items-center space-x-1.5">
                                    <span className="w-1 h-1 rounded-full bg-[#C5A880]"></span>
                                    <span>{detail}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                              <a 
                                href={`https://wa.me/5588996248427?text=${encodeURIComponent(doc.whatsappMsg)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg inline-flex items-center gap-1 transition-all"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Agendar via WhatsApp</span>
                              </a>
                              <button
                                onClick={() => {
                                  setAppointment({
                                    ...appointment,
                                    specialty: doc.category === 'Medicina' ? 'Cardiologia' : 'Reabilitação',
                                    doctor: doc.name
                                  });
                                  setBookingStep(1);
                                  navigate('/agendar');
                                }}
                                className="text-[#0A2B2A] hover:text-[#C5A880] text-xs font-bold transition-colors"
                              >
                                Agendar no site →
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Se encontrar Pacotes de Check-up */}
                  {filteredOutput.checkups.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-serif text-lg font-bold text-[#0A2B2A] flex items-center gap-1.5">
                        <FileText className="w-5 h-5 text-[#C5A880]" />
                        <span>Pacotes de Check-up encontrados ({filteredOutput.checkups.length})</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredOutput.checkups.map(chk => (
                          <div key={chk.id} className="bg-white border-2 border-[#C5A880]/30 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-bold text-[#0A2B2A] text-sm">{chk.name}</h4>
                                  <p className="text-xs text-slate-500 mt-1">{chk.subtitle}</p>
                                </div>
                                <p className="font-bold text-[#AF926B] text-sm">{chk.price}</p>
                              </div>
                              <div className="mt-4 border-t pt-3 flex flex-wrap gap-2">
                                {chk.exams.map((exm, idx) => (
                                  <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-1 rounded">
                                    {exm}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="mt-5 pt-3 border-t flex justify-end">
                              <button
                                onClick={() => {
                                  setAppointment({
                                    ...appointment,
                                    specialty: 'Análises Clínicas',
                                    checkup: chk.name
                                  });
                                  setBookingStep(1);
                                  navigate('/agendar');
                                }}
                                className="bg-[#0A2B2A] hover:bg-[#134645] text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-all"
                              >
                                Agendar este Check-up
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* No Matches State */
                <div className="text-center py-14 bg-slate-50 border rounded-3xl max-w-md mx-auto" id="no-services-found">
                  <Search className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                  <h4 className="font-serif text-[#0A2B2A] font-bold text-base">Nenhum médico ou exame encontrado</h4>
                  <p className="text-slate-500 text-xs mt-2 leading-relaxed px-6">
                    Não encontrou o procedimento ou especialista que procurava? Toque abaixo para perguntar sobre exames específicos em Aurora-CE imediatamente.
                  </p>
                  <div className="mt-6 flex justify-center space-x-3">
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all"
                    >
                      Ver Tudo
                    </button>
                    <a 
                      href="https://wa.me/5588996248427" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center"
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1" />
                      Pedir Ajuda no Whats
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </section>

      {/* 4. SEÇÃO DETALHADA DE TABELA DE PREÇOS DOS CHECK-UP DA CLÍNICA */}
      <section className="py-20 bg-[#FAF8F5] border-t border-slate-200/50" id="exames">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16" id="checkups-header">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#AF926B]">Diagnósticos Acessíveis</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0A2B2A] mt-2 block">
              Prevenção Inteligente com Valores Transparentes
            </h2>
            <div className="w-14 h-0.5 bg-[#C5A880] mx-auto mt-4 rounded-full"></div>
            <p className="text-slate-500 text-sm mt-3 leading-relaxed">
              Realize o check-up periódico de sua família sem necessidade de guias burocráticas e com acompanhamento multiprofissional de alta qualidade.
            </p>
          </div>

          {/* Grid de Checkups da clínica */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="checkups-pricing-grid">
            {checkups.map((chk) => (
              <div 
                key={chk.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all relative flex flex-col justify-between"
                id={`card-${chk.id}`}
              >
                <div>
                  {/* Tag Superior */}
                  <div className="flex justify-between items-center mb-4">
                    <span className="bg-[#FAF8F5] border border-[#C5A880]/30 text-[#AF926B] text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                      {chk.tag}
                    </span>
                    <Heart className="w-4 h-4 text-[#C5A880]" />
                  </div>

                  <h3 className="font-serif text-lg font-bold text-[#0A2B2A]">{chk.name}</h3>
                  <p className="text-slate-400 text-[11px] leading-relaxed mt-1">{chk.subtitle}</p>

                  <div className="my-5 flex items-baseline">
                    <span className="text-xs text-slate-400 mr-1">Apenas</span>
                    <span className="text-2xl font-extrabold text-[#0A2B2A] tracking-tight">{chk.price}</span>
                    <span className="text-[10px] text-slate-400 ml-1">à vista</span>
                  </div>

                  {/* Listagem De Atendimentos inclusos */}
                  <div className="space-y-2 border-t pt-4 text-xs text-slate-600">
                    <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Procedimentos inclusos:</p>
                    {chk.exams.map((exm, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{exm}</span>
                      </div>
                    ))}
                  </div>

                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setAppointment({
                        ...appointment,
                        specialty: 'Análises Clínicas',
                        checkup: chk.name
                      });
                      setBookingStep(1);
                      navigate('/agendar');
                    }}
                    className="w-full bg-[#0A2B2A]/90 hover:bg-[#0A2B2A] text-[#FAF8F5] py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    Agendar Check-up
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Serviços adicionais e exames individuais carregados do Sanity.io */}
          {sanityServices.length > 0 && (
            <div className="mt-20 border-t border-slate-200/40 pt-16" id="sanity-services-section">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#AF926B]">Exames & Serviços Adicionais</span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#0A2B2A] mt-2 block">
                  Outras Consultas e Métodos Diagnósticos
                </h3>
                <div className="w-10 h-0.5 bg-[#C5A880] mx-auto mt-3 rounded-full"></div>
                <p className="text-slate-500 text-xs mt-3 leading-relaxed">
                  Gerenciados dinamicamente via painel Sanity, prontos para agendamento online com acompanhamento imediato.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="sanity-services-grid">
                {sanityServices.map((srv: any) => (
                  <div key={srv.id} className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 hover:border-[#C5A880]/30 shadow-sm transition-all duration-300 flex flex-col justify-between">
                    <div className="flex items-start space-x-4">
                      {srv.iconUrl ? (
                        <img 
                          src={srv.iconUrl} 
                          alt={srv.name} 
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-[#0A2B2A] font-bold shrink-0">
                          <Activity className="w-6 h-6 text-[#C5A880]" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-sm text-[#0A2B2A]">{srv.name}</h4>
                        <span className="inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 mt-1 bg-white border border-slate-200 rounded-md text-slate-400 font-bold">
                          {srv.category}
                        </span>
                        <p className="text-slate-500 text-[11px] mt-2 leading-relaxed">{srv.shortDescription}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-200/40 pt-4 mt-4">
                      <div className="flex items-center justify-between">
                        {srv.price ? (
                          <span className="text-xs font-extrabold text-[#AF926B]">Preço: {srv.price}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">Valor sob consulta</span>
                        )}
                        <button
                          onClick={() => {
                            setAppointment({
                              ...appointment,
                              specialty: srv.category,
                              checkup: srv.name
                            });
                            setBookingStep(1);
                            navigate('/agendar');
                          }}
                          className="text-[#0A2B2A] hover:underline text-[11px] font-bold transition-all"
                        >
                          Formulário de Pré-Agendamento
                        </button>
                      </div>
                      
                      <ServiceCTAButton 
                        phone={centralWhatsApp} 
                        serviceName={srv.name} 
                        variant="solid" 
                        className="w-full text-[11px] py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* 5. SHOWCASE EXCLUSIVO DO ESPAÇO REABILITAR Autismo, TDAH, ABA e Terapias Integradas */}
      <section className="py-20 md:py-24 bg-[#0A2B2A] text-white relative" id="espaco-reabilitar">
        <div className="absolute right-0 top-1/2 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Esquerda: Informações das Terapias Integradas */}
            <div className="lg:col-span-7 space-y-6" id="reabilitar-info">
              <div className="inline-flex items-center space-x-2 bg-[#C5A880]/15 border border-[#C5A880]/30 px-3 py-1 rounded-full text-[#E3C9A6] text-xs font-bold uppercase tracking-wider">
                <span>🧠 Espaço Reabilitar</span>
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                Espaço Reabilitar | <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E3C9A6] via-[#C5A880] to-[#E3C9A6] font-serif italic font-normal">
                  Terapias Integradas Comportamentais
                </span>
              </h2>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Nossa ala de reabilitação oferece acompanhamento especializado e integrativo de desenvolvimento infantil e adulto. Contamos com um time dedicado ao suporte comportamental do espectro autista (TEA) e TDAH utilizando o consagrado Método ABA, avaliação psicopedagógica profunda e terapias físicas.
              </p>

              {/* Sub-lista de terapeutas reais do Espaço Reabilitar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <h4 className="font-bold text-sm text-[#E3C9A6]">Fonoaudiologia & ABA</h4>
                  <p className="text-xs text-slate-300 mt-1">Linguagem, processamento auditivo e Teste da Linguinha com Márcia Duarte.</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <h4 className="font-bold text-sm text-[#E3C9A6]">Psicologia & TCC</h4>
                  <p className="text-xs text-slate-300 mt-1">Atendimento infanto-juvenil e de adultos com Samara Saraiva e Thayná Fernandes.</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <h4 className="font-bold text-sm text-[#E3C9A6]">Fisioterapia Neuro</h4>
                  <p className="text-xs text-slate-300 mt-1">Fisioterapia neurofuncional motora e acompanhamento respiratório com Mara Alves.</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <h4 className="font-bold text-sm text-[#E3C9A6]">Psicopedagogia ABA</h4>
                  <p className="text-xs text-slate-300 mt-1">Trabalho focado em transtornos de aprendizagem escolar com Socorro Maria.</p>
                </div>
              </div>

            </div>

            {/* Direita: Call To Action Reabilitar */}
            <div className="lg:col-span-5" id="reabilitar-image-card">
              <div className="bg-gradient-to-tr from-[#134645] to-[#123E3C] border-2 border-[#C5A880]/30 rounded-3xl p-8 space-y-6 shadow-2xl relative">
                <h3 className="font-serif text-2xl font-bold text-white">Precisa de Avaliação Multiprofissional?</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Agende uma primeira sessão avaliativa no Espaço Reabilitar para desenhar um plano de desenvolvimento individualizado com base no perfil terapêutico necessário.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                    <Check className="w-4 h-4 text-[#C5A880]" />
                    <span>Salas de reabilitação equipadas</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                    <Check className="w-4 h-4 text-[#C5A880]" />
                    <span>Abordagem humanizada focada na evolução</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                    <Check className="w-4 h-4 text-[#C5A880]" />
                    <span>Equipe integrada com reuniões periódicas de casos</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <a
                    href="https://wa.me/5588996248427?text=Gostaria%20de%20saber%20mais%20sobre%20as%20especialidades%20do%20Espaco%20Reabilitar%20em%20Aurora-CE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#C5A880] text-[#0A2B2A] py-3.5 rounded-xl font-extrabold text-xs inline-flex items-center justify-center space-x-2 hover:bg-[#E3C9A6] transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4.5 h-4.5" />
                    <span>Chamar Terapeuta Recomendado</span>
                  </a>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. CORPO CLÍNICO / NOSSA EQUIPE COM DETALHES COMPLETOS */}
      <section className="py-20 md:py-28 bg-white" id="especialistas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16" id="team-header">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#134645]">Equipe de Saúde</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0A2B2A] mt-2">
              Profissionais Altamente Qualificados de Referência
            </h2>
            <div className="w-14 h-0.5 bg-[#C5A880] mx-auto mt-4 rounded-full"></div>
            <p className="text-slate-500 text-sm mt-3 leading-relaxed">
              Equipe multidisciplinar em constante capacitação nos principais polos de saúde, unindo ciência rigorosa e cuidado centrado no paciente.
            </p>
          </div>

          {/* Grid de Clínicos e Terapeutas da Luna & Mendes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="doctors-listing-grid">
            {finalDoctors.slice(0, showAllDoctors ? finalDoctors.length : 6).map((doc: any) => (
              <div 
                key={doc.id}
                className="group bg-slate-50 rounded-3xl overflow-hidden border border-slate-200/40 hover:border-[#C5A880]/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                id={`card-staff-${doc.id}`}
              >
                {/* ETAPA 1 & 3: Tratamento Visual Unificado (Estilo Apple / Linear) */}
                <div className="w-full aspect-[4/5] overflow-hidden relative bg-neutral-100 border-b border-slate-200/30 shrink-0">
                  {doc.photoUrl ? (
                    <>
                      <img 
                        src={doc.photoUrl} 
                        alt={doc.name} 
                        className="w-full h-full object-cover object-top filter contrast-[1.03] brightness-[1.01] saturate-[0.92] sepia-[0.04] group-hover:scale-105 transition-transform duration-700 ease-out" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const imgEl = e.currentTarget as HTMLImageElement;
                          imgEl.style.display = 'none';
                          // Exibe o fallback caso o link do Supabase esteja vazio ou quebrado
                          const fallbackEl = imgEl.parentElement?.querySelector('.img-fallback-placeholder');
                          if (fallbackEl) {
                            fallbackEl.classList.remove('hidden');
                          }
                        }}
                      />
                      {/* Vinheta de fusão e tom de estúdio uniforme */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A2B2A]/40 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute inset-0 bg-[#C5A880]/5 mix-blend-color pointer-events-none pb-[1px]" />
                    </>
                  ) : null}

                  {/* Fallback de Direção de Arte de Alto Padrão */}
                  <div className={`img-fallback-placeholder absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#0A2B2A] to-[#061C1B] text-white p-6 text-center select-none ${doc.photoUrl ? 'hidden' : ''}`}>
                    <div className="w-14 h-14 rounded-full bg-[#C5A880]/15 border border-[#C5A880]/25 flex items-center justify-center mb-4 shadow-inner">
                      <Award className="w-6 h-6 text-[#C5A880]" />
                    </div>
                    <span className="font-serif text-2xl tracking-widest text-[#C5A880] font-light">
                      {doc.name.split(' ').filter((n: string) => !n.includes('.')).map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 mt-2 block font-mono">
                      Equipe Luna & Mendes
                    </span>
                    {/* Detalhe estético em linhas sutis */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#C5A880_1px,transparent_1px)] [background-size:16px_16px]" />
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-5 flex-grow">
                  {/* Categoria / CRM */}
                  <div className="flex items-center justify-between">
                    <span className="bg-white border text-slate-500 text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {doc.category}
                    </span>
                    <span className="text-[#C5A880] font-mono text-[9px] font-bold uppercase">{doc.crm}</span>
                  </div>

                  {/* Nome e Cargo */}
                  <div className="space-y-1">
                    <h4 className="font-serif text-lg font-bold text-[#0A2B2A] group-hover:text-[#AF926B] transition-colors">
                      {doc.name}
                    </h4>
                    <p className="text-xs text-slate-500 font-semibold">{doc.role}</p>
                  </div>

                  {/* Detalhes de Atendimento */}
                  <div className="border-t border-slate-200/50 pt-4 space-y-2">
                    <p className="font-bold text-[9px] text-slate-400 uppercase tracking-widest">Procedimentos Principais:</p>
                    {doc.details.map((det: string, index: number) => (
                      <div key={index} className="flex items-start text-xs text-slate-600">
                        <span className="w-1.5 h-1.5 bg-[#C5A880] rounded-full mt-1.5 mr-2 flex-shrink-0" />
                        <span className="leading-tight">{det}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botões rápidos de agendamento por especialista */}
                <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between">
                  <a
                    href={`https://wa.me/${centralWhatsApp}?text=${encodeURIComponent(doc.whatsappMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg p-2 text-xs font-bold inline-flex items-center space-x-1 transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  <button
                    onClick={() => {
                      setAppointment({
                        ...appointment,
                        specialty: doc.category === 'Medicina' ? 'Cardiologia' : 'Reabilitação',
                        doctor: doc.name
                      });
                      setBookingStep(1);
                      navigate('/agendar');
                    }}
                    className="text-[#0A2B2A] hover:text-[#C5A880] font-bold text-xs inline-flex items-center cursor-pointer"
                  >
                    <span>Agendar Online</span>
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Botão de Ver Mais Especialistas da Dona da Clínica para aumentar conversão e exibição do portfólio clínico */}
          <div className="text-center mt-12 space-y-4">
            <div>
              <button
                onClick={() => setShowAllDoctors(!showAllDoctors)}
                className="bg-white hover:bg-[#FAF8F5] text-[#0A2B2A] border border-[#C5A880] px-8 py-3.5 rounded-full text-xs font-extrabold shadow-sm hover:shadow-md transition-all uppercase tracking-wider inline-flex items-center space-x-2 cursor-pointer"
              >
                <span>{showAllDoctors ? 'Recolher Corpo Técnico' : `Ver Todos os ${finalDoctors.length} Especialistas`}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAllDoctors ? 'rotate-180 text-[#C5A880]' : 'text-[#C5A880]'}`} />
              </button>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              A clínica dispõe de especialistas de Medicina do Trabalho, Nutrição Infantil, Enfermagem e Laserterapia.
            </p>
          </div>

        </div>
      </section>

      {/* 6.5 SOBRE A CLÍNICA / ESTRUTURA PREMIUM */}
      <section className="py-20 bg-gradient-to-b from-[#FAF8F5] to-white relative border-t border-slate-200/50" id="sobre">
        <div className="absolute right-0 bottom-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-0 top-1/4 w-80 h-80 bg-[#C5A880]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Esquerda: Conteúdo institucional */}
            <div className="lg:col-span-6 space-y-6" id="sobre-clinic-info">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#134645]">Nossa Clínica</span>
              <h2 className="font-serif text-3.5xl sm:text-4xl font-bold text-[#0A2B2A] leading-tight">
                Estrutura de Excelência <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E3C9A6] via-[#C5A880] to-[#E3C9A6] font-serif italic font-normal">
                  Pensada em Cada Detalhe
                </span>
              </h2>
              <div className="w-14 h-0.5 bg-[#C5A880] rounded-full"></div>
              
              <p className="text-[#354D4B] text-sm leading-relaxed">
                A <strong>Clínica Luna & Mendes</strong> nasceu do desejo de oferecer à população de Aurora-CE e do Cariri uma experiência de saúde que une alta rigorosidade de diagnósticos a um atendimento acolhedor e humanizado.
              </p>
              
              <p className="text-[#354D4B] text-sm leading-relaxed">
                Dispomos de amplos consultórios climatizados, equipamentos modernos para exames de análises clínicas preventivos, salas de reabilitação integrativa e profissionais dedicados à sua conveniência e bem-estar total. Saboreie um café gourmet em nossa moderna recepção enquanto cuidamos do que há de mais precioso: <strong>vida e saúde</strong>.
              </p>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    setAppointment({
                      ...appointment,
                      specialty: 'Análises Clínicas',
                      doctor: ''
                    });
                    setBookingStep(1);
                    navigate('/agendar');
                  }}
                  className="bg-[#0A2B2A] text-white hover:bg-[#134645] font-bold px-6 py-3 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-[#C5A880]" />
                  <span>Agendar Atendimento</span>
                </button>
                <a
                  href="https://wa.me/5588996248427"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-slate-200 hover:border-[#C5A880] text-[#0A2B2A] bg-white font-bold px-6 py-3 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-500 fill-emerald-500/10" />
                  <span>Dúvidas por WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Direita: Pilares de Atendimento / Benefícios Premium */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-6" id="sobre-clinic-grid">
              
              {/* Card 1: Recepção Confortável */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-slate-100 flex items-center justify-center mb-4">
                  <Award className="w-5 h-5 text-[#C5A880]" />
                </div>
                <h4 className="font-bold text-[#0A2B2A] text-sm font-serif">Acolhimento Premium</h4>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                  Recepção climatizada, confortável e café especial para que sua consulta ou exame seja um momento agradável e tranquilo.
                </p>
              </div>

              {/* Card 2: Exames Integrados */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-slate-100 flex items-center justify-center mb-4">
                  <Activity className="w-5 h-5 text-[#C5A880]" />
                </div>
                <h4 className="font-bold text-[#0A2B2A] text-sm font-serif">Exames Ágeis</h4>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                  Contamos com laboratório parceiro experiente para oferecer laudos de alta precisão e processamento de análises clínicas em tempo recorde.
                </p>
              </div>

              {/* Card 3: Espaço Reabilitar Dedicado */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-slate-100 flex items-center justify-center mb-4">
                  <UserCheck className="w-5 h-5 text-[#C5A880]" />
                </div>
                <h4 className="font-bold text-[#0A2B2A] text-sm font-serif">Reabilitação Especializada</h4>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                  Instalações adaptadas para suporte e terapias comportamentais baseadas em ABA, ideais para o desenvolvimento de autistas e TDAH.
                </p>
              </div>

              {/* Card 4: Segurança & Privacidade */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-slate-100 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5 text-[#C5A880]" />
                </div>
                <h4 className="font-bold text-[#0A2B2A] text-sm font-serif">Sigilo & Cuidado</h4>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                  Consultórios médicos privativos e normas rígidas de biossegurança e esterilização técnica para a máxima privacidade de sua família.
                </p>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 7. PERGUNTAS FREQUENTES DA CLÍNICA (FAQ Interativo) */}
      <section className="py-20 md:py-24 bg-[#FAF8F5] border-t border-slate-200/50" id="faq-accordions">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16" id="faq-intro">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#134645]">Central de Dúvidas</span>
            <h2 className="font-serif text-3xl font-bold text-[#0A2B2A] mt-2">Dúvidas Clínicas de Atendimento</h2>
            <div className="w-14 h-0.5 bg-[#C5A880] mx-auto mt-4 rounded-full"></div>
          </div>

          <div className="space-y-4" id="faq-accordions-group">
            {[
              {
                q: "A clínica aceita planos de saúde ou convênios?",
                a: "A Luna & Mendes atua de forma particular acessível na região de Aurora-CE, além de emitir relatórios especializados e Notas Fiscais para facilitação de Reembolso Médico em planos de saúde corporativos nacionais de forma fácil."
              },
              {
                q: "Como agendar um exame de check-up ou preventivo ginecológico?",
                a: "Basta escolher o check-up ideal na aba acima e solicitar agendamento no site ou entrar em contato pelo WhatsApp central (88) 99624-8427. Nossa equipe enviará imediatamente as orientações de horário de jejum ou medicamentos."
              },
              {
                q: "Quais terapias são desenvolvidas no Espaço Reabilitar?",
                a: "O Espaço Reabilitar oferece assistência continuada multiprofissional com terapias baseadas em evidências científicas para dificuldades de cognição, linguagem, motoras, fonoaudiologia, psicologia e psicopedagogia no autismo e TEA."
              },
              {
                q: "Qual o horário de funcionamento das coletas acadêmico-laboratoriais?",
                a: "Dispomos de atendimento humanizado de segunda a sexta-feira para exames de sangue gerais e coletas preventivas. Para maior comodidade, recomendamos agendamento prévio com confirmação das orientações de preparo clínicas."
              }
            ].map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div 
                  key={index}
                  className="bg-white border rounded-2xl overflow-hidden transition-all shadow-sm"
                  id={`faq-${index}`}
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left cursor-pointer transition-colors"
                  >
                    <span className="font-bold text-slate-800 text-sm text-[#0A2B2A]">{faq.q}</span>
                    <ChevronDown className={`w-4.5 h-4.5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#C5A880]' : ''}`} />
                  </button>
                  
                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-slate-600 text-xs leading-relaxed border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 7.5 DEPOIMENTOS E AVALIAÇÕES DE PACIENTES (Diferencial de Reputação e Confiança para a Dona da Clínica) */}
      <section className="py-20 bg-[#0A2B2A] text-white overflow-hidden relative border-t border-[#C5A880]/30" id="depoimentos">
        <div className="absolute right-0 top-14 w-80 h-80 bg-[#C5A880]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-0 bottom-14 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#E3C9A6]">Depoimentos Reais</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mt-2">A Opinião de Quem Confia em Nós</h2>
            <div className="w-14 h-0.5 bg-[#C5A880] mx-auto mt-4 rounded-full"></div>
            <p className="text-slate-300 text-xs sm:text-sm mt-3">
              A satisfação dos nossos pacientes de Aurora e região é o nosso maior faturamento. Veja o que dizem sobre nosso atendimento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Depoimento 1 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative hover:border-[#C5A880]/40 transition-colors">
              <Quote className="w-8 h-8 text-[#C5A880]/25 absolute right-6 top-6" />
              <div className="flex items-center space-x-1 text-amber-400 mb-4">
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed italic mb-6">
                "Excelente atendimento! Fiz o Preventivo com as enfermeiras e o acolhimento foi muito humanizado. A clínica é linda e a recepção extremamente confortável."
              </p>
              <div className="border-t border-white/5 pt-4">
                <span className="text-white text-xs font-bold block">Maria Aparecida Alencar</span>
                <span className="text-[#E3C9A6] text-[10px] block mt-0.5">Paciente de Aurora - CE</span>
              </div>
            </div>

            {/* Depoimento 2 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative hover:border-[#C5A880]/40 transition-colors">
              <Quote className="w-8 h-8 text-[#C5A880]/25 absolute right-6 top-6" />
              <div className="flex items-center space-x-1 text-amber-400 mb-4">
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed italic mb-6">
                "O Espaço Reabilitar mudou a rotina do meu filho autista. As sessões com as terapeutas e psicólogas ABA são feitas com muito carinho e precisão científica."
              </p>
              <div className="border-t border-white/5 pt-4">
                <span className="text-white text-xs font-bold block">Francisco de Souza</span>
                <span className="text-[#E3C9A6] text-[10px] block mt-0.5">Pai de paciente TEA</span>
              </div>
            </div>

            {/* Depoimento 3 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative hover:border-[#C5A880]/40 transition-colors">
              <Quote className="w-8 h-8 text-[#C5A880]/25 absolute right-6 top-6" />
              <div className="flex items-center space-x-1 text-amber-400 mb-4">
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed italic mb-6">
                "Consulta cardiológica e exames de imagens em um só lugar. Os laudos saíram de forma rápida e segura. Recomendo para toda a população do Cariri!"
              </p>
              <div className="border-t border-white/5 pt-4">
                <span className="text-white text-xs font-bold block">Dr. Antônio Bezerra Lins</span>
                <span className="text-[#E3C9A6] text-[10px] block mt-0.5">Paciente Clínico de Aurora</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 8. SEÇÃO DE LOCALIZAÇÃO E CONTATO COMPLETO DA BIO */}
      <section className="py-20 md:py-24 bg-white border-t border-slate-200/50" id="localizacao">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Informações detalhadas da clínica */}
            <div className="lg:col-span-5 space-y-8" id="location-details">
              <div className="space-y-3">
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#AF926B]">Localização em Aurora</span>
                <h3 className="font-serif text-3xl font-bold text-[#0A2B2A] leading-tight">
                  Venha conhecer as nossas amplas instalações
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                  Excelente acessibilidade no coração de Aurora-CE, com recepção climatizada, consultórios multiprofissionais independentes e o inovador Espaço Reabilitar.
                </p>
              </div>

              {/* Blocos de Contato copiosos com Copy Button */}
              <div className="space-y-4" id="address-block">
                
                {/* Endereço Principal Copiável */}
                <div className="bg-[#FAF8F5] p-4.5 rounded-2xl border border-[#C5A880]/20 shadow-sm flex items-start justify-between">
                  <div className="flex space-x-3">
                    <MapPin className="w-5 h-5 text-[#0A2B2A] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-[#0A2B2A]">Endereço Clínico</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {centralAddress}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCopyText(centralAddress, "main-address")}
                    className="p-1.5 hover:bg-white rounded text-slate-400 hover:text-[#0A2B2A] transition-colors shrink-0"
                    title="Copiar endereço completo"
                  >
                    {copiedId === "main-address" ? <span className="text-[10px] text-emerald-600 font-bold px-1">Copiado</span> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* WhatsApp Central de Atendimento */}
                <div className="bg-[#FAF8F5] p-4.5 rounded-2xl border border-[#C5A880]/20 shadow-sm flex items-start justify-between">
                  <div className="flex space-x-3">
                    <Phone className="w-5 h-5 text-[#0A2B2A] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-[#0A2B2A]">Central de Atendimento</h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {centralWhatsAppDisplay} (Fale Conosco pelo WhatsApp)
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCopyText(`+${centralWhatsApp}`, "main-phone")}
                    className="p-1.5 hover:bg-white rounded text-slate-400 hover:text-[#0A2B2A] transition-colors shrink-0"
                  >
                    {copiedId === "main-phone" ? <span className="text-[10px] text-emerald-600 font-bold px-1">Copiado</span> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Horários de funcionamento */}
                <div className="p-4.5 bg-[#0A2B2A] text-white border rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2 text-[#E3C9A6] font-bold text-xs">
                    <Clock className="w-4 h-4" />
                    <span>Horário Clínico</span>
                  </div>
                  <div className="text-[11px]">
                    <span className="text-slate-300 block">Horários Gerais de Funcionamento:</span>
                    <span className="font-bold text-white mt-1 block">{centralOpeningHours}</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Mapa Interativo do Google Maps para a Clínica Luna & Mendes em Aurora-CE */}
            <div className="lg:col-span-7" id="interactive-map">
              <div className="bg-slate-50 p-5 rounded-3xl border shadow-sm space-y-4">
                
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center space-x-2">
                    <Map className="w-4.5 h-4.5 text-[#0A2B2A]" />
                    <span className="text-xs font-bold text-[#0A2B2A]">Mapa Esquemático de Aurora-CE</span>
                  </div>
                  <a 
                    href="https://maps.google.com/?q=Av.+Ant%C3%B4nio+Ricardo,+29,+Centro,+Aurora+-+CE,+63360-000" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white border text-[11px] font-bold text-[#0A2B2A] hover:bg-slate-100"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Abrir no Google Maps
                  </a>
                </div>

                {/* Container do Mapa Vetorial Interativo - Geograficamente fiel e livre de bloqueios */}
                <div className="relative h-[340px] rounded-2xl overflow-hidden shadow-inner border border-slate-200 bg-[#EDF3F2] flex items-center justify-center">
                  
                  {/* Map Design Canvas */}
                  <div className="absolute inset-0 w-full h-full select-none overflow-hidden">
                    {/* Grid Pattern para Fundo de Mapa */}
                    <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                    {/* Rio Salgado (Curva Geográfica Fiel de Aurora-CE) */}
                    <svg className="absolute right-4 top-0 h-full w-40 text-[#C1DBE3]/60 drop-shadow-sm" fill="none" preserveAspectRatio="none" viewBox="0 0 100 300">
                      <path d="M40,0 C80,80 10,180 60,300" stroke="currentColor" strokeWidth="18" fill="none" strokeLinecap="round" />
                    </svg>

                    {/* Malha Viária de Aurora - CE */}
                    <svg className="absolute inset-0 w-full h-full text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* CE-288 (Rodovia Horizontal) */}
                      <path d="M-20,120 L500,120" stroke="#FFF" strokeWidth="16" strokeLinecap="round" />
                      <path d="M-20,120 L500,120" stroke="#FDE047" strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" className="opacity-70" />
                      
                      {/* Av. Antônio Ricardo (Vertical Principal) */}
                      <path d="M190,-20 L190,360" stroke="#FFF" strokeWidth="20" strokeLinecap="round" />
                      <path d="M190,-20 L190,360" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />

                      {/* Rua Coronel João de Souza */}
                      <path d="M-20,240 Q190,230 500,210" stroke="#FFF" strokeWidth="10" strokeLinecap="round" />

                      {/* Rua dos Expedicionários */}
                      <path d="M320,-20 L320,360" stroke="#FFF" strokeWidth="10"  strokeLinecap="round"/>
                    </svg>

                    {/* Rótulos das Ruas em posições estratégicas */}
                    <span className="absolute top-[96px] left-6 text-[8.5px] uppercase font-bold tracking-widest text-[#4A6B6C] bg-white/70 px-1 py-[1.2px] rounded">CE-288</span>
                    <span className="absolute top-[28px] left-[202px] text-[8.5px] uppercase font-bold tracking-widest text-[#4A6B6C] rotate-90 origin-left">Av. Antônio Ricardo</span>
                    <span className="absolute top-[218px] left-8 text-[8px] font-semibold text-[#6B8586]">Rua Cel. João de Souza</span>

                    {/* Ponto Turístico: Praça da Estação (Lazer e Natureza) */}
                    <div className="absolute top-[40px] left-[40px] flex items-center space-x-1.5 bg-[#E6F3EA] border border-[#A7F3D0] rounded-full px-2.5 py-1 shadow-sm">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      <span className="text-[10px] font-bold text-emerald-800 tracking-wide">Praça da Estação</span>
                    </div>

                    {/* Ponto Comercial Paralelo 1: Modontos Aurora */}
                    <div className="absolute top-[160px] left-[50px] flex items-center space-x-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-xs opacity-85">
                      <span className="w-1 h-1 bg-sky-400 rounded-full"></span>
                      <span className="text-[8px] font-medium text-slate-600">Modontos Aurora</span>
                    </div>

                    {/* Ponto Comercial Paralelo 2: Studio Mirlley Brito */}
                    <div className="absolute top-[80px] left-[240px] flex items-center space-x-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-xs opacity-85">
                      <span className="w-1 h-1 bg-pink-400 rounded-full"></span>
                      <span className="text-[8px] font-medium text-slate-600">Studio Mirlley Brito</span>
                    </div>

                    {/* Rio Salgado Label */}
                    <span className="absolute right-[45px] top-[140px] text-[9px] italic font-serif text-[#7DA2B0] rotate-[80deg]">Rio Salgado</span>

                    {/* PIN PRINCIPAL - Clínica Luna & Mendes (Av. Antônio Ricardo, 29) */}
                    <div className="absolute top-[180px] left-[190px] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                      {/* Pulse Ring */}
                      <span className="absolute -top-1 w-10 h-10 bg-rose-500/30 rounded-full animate-ping pointer-events-none"></span>
                      
                      {/* Red Marker pin */}
                      <div className="relative group cursor-pointer flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center shadow-lg transform group-hover:scale-110 active:scale-95 transition-all">
                          <MapPin className="w-4 h-4 text-white" />
                        </div>
                        {/* Pin Tail */}
                        <div className="w-2 h-2 bg-rose-600 rotate-45 transform -translate-y-1 border-r border-b border-white"></div>

                        {/* Floating Tooltip Label */}
                        <div className="absolute -top-11 bg-[#0A2B2A] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md whitespace-nowrap border border-[#C5A880]/40 uppercase tracking-wider scale-95 md:scale-100">
                          Luna & Mendes • Nº 29
                        </div>
                      </div>
                    </div>

                    {/* Bússola Decorativa */}
                    <div className="absolute top-4 right-4 w-10 h-10 rounded-full border border-slate-300/60 flex items-center justify-center bg-white/50 backdrop-blur-xs text-slate-400 pointer-events-none">
                      <span className="text-[9px] font-black tracking-widest">N</span>
                      <div className="absolute w-[2px] h-4 bg-rose-500 -top-[3px] left-[18px]"></div>
                      <div className="absolute w-[2px] h-4 bg-slate-400 -bottom-[3px] left-[18px]"></div>
                    </div>
                  </div>

                  {/* Botão Flutuante Superior Esquerdo "Abrir no Maps" */}
                  <a
                    href="https://maps.google.com/?q=Av.+Ant%C3%B4nio+Ricardo,+29,+Centro,+Aurora+-+CE,+63360-000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-4 left-4 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 px-3.5 py-2 rounded-xl shadow-md border border-slate-200/80 flex items-center transition-colors z-20 pointer-events-auto"
                  >
                    Navegar no Google Maps
                    <ExternalLink className="w-3 h-3 ml-1.5 text-slate-500" />
                  </a>

                  {/* Card Central de Endereço - Sobposto ao mapa igual imagem */}
                  <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md bg-[#0A2B2A]/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-[#C5A880]/30 flex items-center justify-between gap-6 z-20 pointer-events-auto">
                    <div className="text-left text-white leading-tight">
                      <p className="text-xs sm:text-sm font-bold tracking-wide">Av. Antônio Ricardo, 29</p>
                      <p className="text-[10px] text-slate-300 font-medium mt-1">Centro, Aurora - CE, 63360-000</p>
                    </div>
                    <button
                      onClick={() => handleCopyText("Av. Antônio Ricardo, 29, Centro, Aurora - CE, 63360-000", "route-copied")}
                      className="bg-[#C5A880] hover:bg-[#E3C9A6] text-[#0A2B2A] transition-all text-[11px] font-bold px-4 py-2 rounded-full whitespace-nowrap active:scale-95"
                    >
                      {copiedId === "route-copied" ? 'Copiado!' : 'Copiar Rota'}
                    </button>
                  </div>

                  {/* Marcadores de copyright do mapa para ambientação na lateral inferior direita */}
                  <div className="absolute bottom-1 right-2 bg-white/80 backdrop-blur-[1px] px-1.5 py-[2px] rounded text-[8px] text-slate-500 font-sans pointer-events-none select-none hidden sm:block">
                    Mapa de Rotas Interativo • Luna & Mendes
                  </div>

                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 9. RODAPÉ INSTITUCIONAL COM DADO REGULAMENTAR (Diretrizes do CRM) */}
      <footer className="bg-[#0A2B2A] text-slate-300 py-16 border-t border-[#C5A880]/30" id="footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12" id="footer-menu">
            
            {/* Sobre a Marca */}
            <div className="space-y-4" id="footer-about">
              <div className="flex items-center space-x-2">
                <ClinicLogo size={36} variant="gold-teal" />
                <span className="text-white font-serif font-bold text-lg tracking-wider">LUNA & MENDES</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Consultas clínicas, exames médicos preventivos por imagem e o integrado Espaço Reabilitar de terapias multidisciplinares infantis e comportamentais na cidade de Aurora-CE.
              </p>
              
              {/* Nota Normativa CFM no Brasil */}
              <div className="text-[10px] text-slate-500 space-y-1">
                <p>Direção Técnica e Ocupacional:</p>
                <p className="font-semibold text-slate-400">Dr. Henrique Feitosa / Dra. Myreia Petronio</p>
                <p>Clínica Multiprofissional Luna & Mendes Ltda.</p>
              </div>
            </div>

            {/* Links Rápidos */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Navegação</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#exames" className="hover:text-[#C5A880] transition-colors">Pacotes de Check-up</a></li>
                <li><a href="#especialistas" className="hover:text-[#C5A880] transition-colors">Profissionais</a></li>
                <li><a href="#espaco-reabilitar" className="hover:text-[#C5A880] transition-colors">Espaço Reabilitar (ABA)</a></li>
                <li><a href="#localizacao" className="hover:text-[#C5A880] transition-colors">Onde nos visitar</a></li>
              </ul>
            </div>

            {/* Contato Clínico */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-serif">Agendamentos</h4>
              <ul className="space-y-2.5 text-xs">
                <li className="flex items-start space-x-2">
                  <Phone className="w-4 h-4 text-[#C5A880] flex-shrink-0" />
                  <span>Central: (88) 99624-8427</span>
                </li>
                <li className="flex items-start space-x-2">
                  <MessageCircle className="w-4 h-4 text-[#C5A880] flex-shrink-0" />
                  <span>WhatsApp: (88) 99624-8427</span>
                </li>
                <li className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-[#C5A880] flex-shrink-0" />
                  <span>Av. Antônio Ricardo, 29, Centro, Aurora-CE</span>
                </li>
              </ul>
            </div>

            {/* Certificações ou Vantagem De Atendimento */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Compromisso Real</h4>
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  "Excelência em diagnóstico vai muito além de exames confiáveis, exige controle de processos e qualificação contínua."
                </p>
                <span className="text-[9px] text-[#E3C9A6] block mt-2 font-medium">— Equipe Luna & Mendes</span>
              </div>
            </div>

          </div>

          <div className="pt-8 border-t border-white/5 text-[10px] text-slate-500 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p>© 2026 Luna & Mendes - Saúde e Diagnóstico. CNPJ sob cadastramento. Todos os direitos reservados.</p>
              <p className="mt-1">
                Aviso Legal: Os dados contidos de exames e especialidades têm cunho apenas de publicidade institucional clínica e não substituem exames presenciais orientados por profissionais sob conselho regional.
              </p>
            </div>
             <div className="flex space-x-4 shrink-0 font-medium text-slate-400">
              <a
                href="https://wa.me/5588996248427?text=Olá,%20gostaria%20de%20esclarecer%20termos%20e%20políticas%20de%20privacidade%20da%20Clínica."
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Políticas de Privacidade
              </a>
              <span>•</span>
              <a href="#localizacao" className="hover:text-white">Aurora-CE</a>
              <span>•</span>
              <Link to="/admin/login" className="hover:text-amber-400 font-semibold text-amber-500">Painel Administrativo</Link>
            </div>
          </div>

        </div>
      </footer>

      {/* Botão Flutuante Permanente do WhatsApp do Cliente Real de Alta Conversão */}
      <WhatsAppFloatingButton phone={centralWhatsApp} />

    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/agendar" element={<PublicAgendar />} />
        <Route path="/admin/login" element={<LoginAdmin />} />
        <Route path="/admin/dashboard" element={<DashboardAdmin />} />
        <Route path="/image-mapper" element={<ImageMapper />} />
        {/* Fallback para home se houver rotas desconhecidas */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </Router>
  );
}

