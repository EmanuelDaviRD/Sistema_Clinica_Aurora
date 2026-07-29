import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, Clock, LogOut, Plus, Trash2, 
  User, Shield, Activity, RefreshCw, AlertCircle, CheckCircle, Stethoscope,
  Search, UserPlus, Edit3, PhoneCall, FileText, ChevronDown, ChevronUp, UserCheck, X,
  Check, Crop
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { ImageCropModal } from './ImageCropModal';

interface Medico {
  id: number;
  nome: string;
  especialidade: string;
  foto_url?: string;
  registroProfissionalTipo?: string;
  registroProfissionalNumero?: string;
  imageFit?: string;
  imagePosition?: string;
  imageScale?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
  _count?: {
    horarios: number;
  };
}

interface EditingMedicoState extends Medico {
  newFotoFile?: File | null;
  newFotoPreview?: string | null;
}

interface Horario {
  id: number;
  data_hora: string;
  medico_id: number;
  status_disponivel: boolean;
  medico: {
    nome: string;
    especialidade: string;
  };
  agendamento?: {
    nome_paciente: string;
    telefone: string;
  };
}

interface Agendamento {
  id: number;
  nome_paciente: string;
  telefone: string;
  horario_id: number;
  horario: {
    data_hora: string;
    medico: {
      nome: string;
      especialidade: string;
    }
  }
}

interface Paciente {
  id: number;
  nome: string;
  cpf?: string;
  telefone?: string;
  createdAt?: string;
  agendamentos?: Array<{
    id: number;
    horario: {
      data_hora: string;
      medico: {
        nome: string;
        especialidade: string;
      }
    }
  }>;
}

export const DashboardAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Estados dos dados buscados da API PostgreSQL
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  // Estados da busca e filtros de pacientes
  const [searchPaciente, setSearchPaciente] = useState('');
  const [expandedPacienteId, setExpandedPacienteId] = useState<number | null>(null);

  // Modal / Form para Novo Paciente
  const [isNovoPacienteModalOpen, setIsNovoPacienteModalOpen] = useState(false);
  const [novoPacienteNome, setNovoPacienteNome] = useState('');
  const [novoPacienteCpf, setNovoPacienteCpf] = useState('');
  const [novoPacienteTelefone, setNovoPacienteTelefone] = useState('');

  // Modal / Form para Editar Paciente
  const [editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);

  // Modal para Agendar Consulta para o Paciente
  const [agendandoParaPaciente, setAgendandoParaPaciente] = useState<Paciente | null>(null);
  const [horarioParaPacienteId, setHorarioParaPacienteId] = useState<string>('');

  // Formulário: Cadastrar Médico
  const [novoMedicoNome, setNovoMedicoNome] = useState('');
  const [novoMedicoEspec, setNovoMedicoEspec] = useState('');
  const [novoMedicoTipoReg, setNovoMedicoTipoReg] = useState('CRM');
  const [novoMedicoNumReg, setNovoMedicoNumReg] = useState('');
  const [novoMedicoFotoFicheiro, setNovoMedicoFotoFicheiro] = useState<File | null>(null);
  const [novoMedicoFotoPreview, setNovoMedicoFotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Edição de Médico
  const [editingMedico, setEditingMedico] = useState<EditingMedicoState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Modal de Recorte e Ajuste de Foto (Cropper)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropModalSrc, setCropModalSrc] = useState<string | null>(null);
  const [cropTargetMode, setCropTargetMode] = useState<'novo' | 'edit'>('novo');

  // Formulário: Cadastrar Horário para Médico
  const [novoHorarioData, setNovoHorarioData] = useState('');
  const [novoHorarioMedico, setNovoHorarioMedico] = useState('');

  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'agendamentos' | 'pacientes' | 'medicos' | 'horarios'>('agendamentos');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    variant: 'danger',
    onConfirm: () => {},
  });

  const openConfirmModal = (config: Omit<typeof confirmModal, 'isOpen'>) => {
    setConfirmModal({ ...config, isOpen: true });
  };

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // Formatadores visuais
  const formatarCPF = (cpf?: string) => {
    if (!cpf) return 'Não cadastrado';
    const raw = cpf.replace(/\D/g, '');
    if (raw.length === 11) {
      return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
    }
    return cpf;
  };

  const formatarTelefone = (tel?: string) => {
    if (!tel) return 'Não cadastrado';
    const raw = tel.replace(/\D/g, '');
    if (raw.length === 11) {
      return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    if (raw.length === 10) {
      return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    }
    return tel;
  };

  // Verifica Sessão de Token JWT
  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    const savedUser = localStorage.getItem('admin_user');
    
    if (!savedToken) {
      navigate('/admin/login');
      return;
    }

    setToken(savedToken);
    if (savedUser) {
      setAdminUser(JSON.parse(savedUser));
    }

    fetchDatabaseData(savedToken);
  }, [navigate]);

  // Buscas direcionadas e silenciosas por entidade
  const fetchAgendamentosData = async (activeToken: string) => {
    try {
      const res = await fetch('/api/agendamentos', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.ok) {
        setAgendamentos(await res.json());
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHorariosData = async () => {
    try {
      const res = await fetch('/api/horarios');
      if (res.ok) setHorarios(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPacientesData = async (activeToken: string) => {
    try {
      const res = await fetch('/api/pacientes', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.ok) setPacientes(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMedicosData = async () => {
    try {
      const res = await fetch('/api/medicos');
      if (res.ok) setMedicos(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  // Busca conjunta de todos os dados do banco PostgreSQL
  const fetchDatabaseData = async (activeToken: string, options: { silent?: boolean } = {}) => {
    const isSilent = options.silent ?? (medicos.length > 0 || agendamentos.length > 0 || pacientes.length > 0 || horarios.length > 0);

    if (!isSilent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setMensagemErro(null);

    try {
      const headers = { 'Authorization': `Bearer ${activeToken}` };

      const [resMedicos, resHorarios, resAgendamentos, resPacientes] = await Promise.all([
        fetch('/api/medicos'),
        fetch('/api/horarios'),
        fetch('/api/agendamentos', { headers }),
        fetch('/api/pacientes', { headers })
      ]);

      if (resMedicos.ok) setMedicos(await resMedicos.json());
      if (resHorarios.ok) setHorarios(await resHorarios.json());
      if (resAgendamentos.ok) setAgendamentos(await resAgendamentos.json());
      if (resPacientes.ok) setPacientes(await resPacientes.json());

      if (!resAgendamentos.ok) {
        if (resAgendamentos.status === 401) {
          handleLogout();
        } else {
          const errData = await resAgendamentos.json();
          throw new Error(errData.message || 'Falhas de leitura administrativa.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setMensagemErro(err.message || 'Incapaz de ler os dados do banco PostgreSQL corporativo.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Logout e limpeza
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  // Handlers de Ações para Pacientes
  const handleCriarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPacienteNome) return;

    try {
      const response = await fetch('/api/pacientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: novoPacienteNome,
          cpf: novoPacienteCpf,
          telefone: novoPacienteTelefone
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Erro ao cadastrar paciente.');
      }

      setNovoPacienteNome('');
      setNovoPacienteCpf('');
      setNovoPacienteTelefone('');
      setIsNovoPacienteModalOpen(false);
      triggerFeedback('Paciente cadastrado com sucesso!');
      fetchPacientesData(token!);
    } catch (err: any) {
      setMensagemErro(err.message);
    }
  };

  const handleAtualizarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaciente) return;

    try {
      const response = await fetch(`/api/pacientes/${editingPaciente.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: editingPaciente.nome,
          cpf: editingPaciente.cpf,
          telefone: editingPaciente.telefone
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Erro ao atualizar dados do paciente.');
      }

      setEditingPaciente(null);
      triggerFeedback('Cadastro do paciente atualizado com sucesso!');
      fetchPacientesData(token!);
    } catch (err: any) {
      setMensagemErro(err.message);
    }
  };

  const handleExcluirPaciente = (id: number, nome: string) => {
    openConfirmModal({
      title: 'Excluir Cadastro do Paciente',
      message: `Tem certeza que deseja remover "${nome}" do cadastro de pacientes?`,
      confirmLabel: 'Excluir Paciente',
      variant: 'danger',
      onConfirm: async () => {
        closeConfirmModal();
        const previousPacientes = [...pacientes];
        setPacientes(prev => prev.filter(p => p.id !== id));
        setActionLoadingId(id);

        try {
          const response = await fetch(`/api/pacientes/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            const err = await response.json();
            setPacientes(previousPacientes);
            throw new Error(err.message || 'Erro ao excluir paciente.');
          }

          triggerFeedback('Paciente removido com sucesso!');
          fetchPacientesData(token!);
        } catch (err: any) {
          setMensagemErro(err.message);
        } finally {
          setActionLoadingId(null);
        }
      }
    });
  };

  const handleAgendarParaPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendandoParaPaciente || !horarioParaPacienteId) return;

    try {
      const response = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome_paciente: agendandoParaPaciente.nome,
          telefone: agendandoParaPaciente.telefone || '(00) 00000-0000',
          horario_id: Number(horarioParaPacienteId),
          paciente_id: agendandoParaPaciente.id
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Erro ao vincular consulta ao paciente.');
      }

      setAgendandoParaPaciente(null);
      setHorarioParaPacienteId('');
      triggerFeedback(`Consulta agendada para ${agendandoParaPaciente.nome}!`);
      fetchAgendamentosData(token!);
      fetchHorariosData();
      fetchPacientesData(token!);
    } catch (err: any) {
      setMensagemErro(err.message);
    }
  };

  // Handlers para Fotos e Previews com Suporte a Recorte / Cropper
  const handleNovoMedicoFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setCropModalSrc(evt.target.result as string);
          setCropTargetMode('novo');
          setIsCropModalOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditMedicoFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingMedico) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setCropModalSrc(evt.target.result as string);
          setCropTargetMode('edit');
          setIsCropModalOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRecortarFotoAtual = () => {
    if (editingMedico) {
      const currentSrc = editingMedico.newFotoPreview || editingMedico.foto_url;
      if (currentSrc) {
        setCropModalSrc(currentSrc);
        setCropTargetMode('edit');
        setIsCropModalOpen(true);
      }
    }
  };

  const handleCropComplete = (croppedDataUrl: string, croppedFile: File) => {
    if (cropTargetMode === 'novo') {
      setNovoMedicoFotoFicheiro(croppedFile);
      setNovoMedicoFotoPreview(croppedDataUrl);
    } else if (cropTargetMode === 'edit' && editingMedico) {
      setEditingMedico({
        ...editingMedico,
        newFotoFile: croppedFile,
        newFotoPreview: croppedDataUrl
      });
    }
  };

  // Ações de Médicos
  const handleCriarMedico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoMedicoNome || !novoMedicoEspec) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('nome', novoMedicoNome);
      formData.append('especialidade', novoMedicoEspec);
      formData.append('registroProfissionalTipo', novoMedicoTipoReg);
      formData.append('registroProfissionalNumero', novoMedicoNumReg);
      if (novoMedicoFotoFicheiro) {
        formData.append('foto', novoMedicoFotoFicheiro);
      }
      if (novoMedicoFotoPreview) {
        formData.append('foto_url', novoMedicoFotoPreview);
      }

      const response = await fetch('/api/medicos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao salvar médico.');
      }

      setNovoMedicoNome('');
      setNovoMedicoEspec('');
      setNovoMedicoTipoReg('CRM');
      setNovoMedicoNumReg('');
      setNovoMedicoFotoFicheiro(null);
      setNovoMedicoFotoPreview(null);
      
      const fileInput = document.getElementById('foto-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      triggerFeedback('Médico cadastrado com sucesso!');
      fetchMedicosData();
    } catch (err: any) {
      setMensagemErro(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSalvarEdicaoMedico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedico) return;
    setIsSavingEdit(true);
    try {
      const cleanUrl = editingMedico.foto_url ? editingMedico.foto_url.split('#imgcfg=')[0] : '';
      const configObj = {
        imageFit: editingMedico.imageFit,
        imagePosition: editingMedico.imagePosition,
        imageScale: editingMedico.imageScale,
        imageOffsetX: editingMedico.imageOffsetX,
        imageOffsetY: editingMedico.imageOffsetY
      };
      const newFotoUrlWithConfig = cleanUrl ? `${cleanUrl}#imgcfg=${encodeURIComponent(JSON.stringify(configObj))}` : '';

      const formData = new FormData();
      formData.append('nome', editingMedico.nome);
      formData.append('especialidade', editingMedico.especialidade);
      formData.append('registroProfissionalTipo', editingMedico.registroProfissionalTipo || '');
      formData.append('registroProfissionalNumero', editingMedico.registroProfissionalNumero || '');
      if (editingMedico.newFotoPreview) {
        formData.append('foto_url', editingMedico.newFotoPreview);
      } else if (newFotoUrlWithConfig) {
        formData.append('foto_url', newFotoUrlWithConfig);
      }

      if (editingMedico.newFotoFile) {
        formData.append('foto', editingMedico.newFotoFile);
      }

      const response = await fetch(`/api/medicos/${editingMedico.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao salvar edição.');
      }

      setEditingMedico(null);
      triggerFeedback('Médico e configurações atualizados com sucesso!');
      fetchMedicosData();
    } catch (err: any) {
      setMensagemErro(err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleExcluirMedico = (id: number) => {
    openConfirmModal({
      title: 'Excluir Profissional',
      message: 'Tem certeza? Isso removerá o médico e TODOS os horários e consultas estruturadas dele. Esta ação não pode ser desfeita.',
      confirmLabel: 'Sim, Excluir Médico',
      variant: 'danger',
      onConfirm: async () => {
        closeConfirmModal();
        const previousMedicos = [...medicos];
        setMedicos(prev => prev.filter(m => m.id !== id));
        setActionLoadingId(id);

        try {
          const response = await fetch(`/api/medicos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) {
            const errorData = await response.json();
            setMedicos(previousMedicos);
            throw new Error(errorData.message || 'Erro ao excluir.');
          }

          triggerFeedback('Médico e seus horários foram excluídos.');
          fetchMedicosData();
          fetchHorariosData();
        } catch (err: any) {
          setMensagemErro(err.message);
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  };

  const handleCriarHorario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoHorarioData || !novoHorarioMedico) return;

    try {
      const response = await fetch('/api/horarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          data_hora: novoHorarioData,
          medico_id: Number(novoHorarioMedico)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar horário.');
      }

      setNovoHorarioData('');
      triggerFeedback('Novo horário vago inserido com sucesso!');
      fetchHorariosData();
    } catch (err: any) {
      setMensagemErro(err.message);
    }
  };

  const handleExcluirHorario = (id: number) => {
    openConfirmModal({
      title: 'Excluir Horário',
      message: 'Deseja realmente excluir este horário da grade? Se houver um agendamento vinculado, ele também será removido.',
      confirmLabel: 'Sim, Excluir Horário',
      variant: 'warning',
      onConfirm: async () => {
        closeConfirmModal();
        const previousHorarios = [...horarios];
        setHorarios(prev => prev.filter(h => h.id !== id));
        setActionLoadingId(id);

        try {
          const response = await fetch(`/api/horarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) {
            const errorData = await response.json();
            setHorarios(previousHorarios);
            throw new Error(errorData.message || 'Erro ao excluir.');
          }

          triggerFeedback('Horário excluído com sucesso.');
          fetchHorariosData();
          fetchAgendamentosData(token!);
        } catch (err: any) {
          setMensagemErro(err.message);
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  };

  // Ações de Agendamentos
  const handleCancelarAgendamento = (id: number) => {
    openConfirmModal({
      title: 'Cancelar Consulta',
      message: 'Deseja realmente cancelar esta consulta? O horário correspondente será liberado e ficará disponível para outros pacientes.',
      confirmLabel: 'Sim, Cancelar Consulta',
      variant: 'danger',
      onConfirm: async () => {
        closeConfirmModal();
        const previousAgendamentos = [...agendamentos];
        setAgendamentos(prev => prev.filter(ag => ag.id !== id));
        setActionLoadingId(id);

        try {
          const response = await fetch(`/api/agendamentos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) {
            const errorData = await response.json();
            setAgendamentos(previousAgendamentos);
            throw new Error(errorData.message || 'Falha ao cancelar consulta.');
          }

          triggerFeedback('Agendamento cancelado. O horário correspondente agora está disponível para outros pacientes.');
          fetchAgendamentosData(token!);
          fetchHorariosData();
          fetchPacientesData(token!);
        } catch (err: any) {
          setMensagemErro(err.message);
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  };

  // Helper para feedback dinâmico temporário
  const triggerFeedback = (msg: string) => {
    setMensagemSucesso(msg);
    setTimeout(() => setMensagemSucesso(null), 5000);
  };

  // Formata data amigável
  const formatarData = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] font-sans text-slate-850" id="admin-dashboard-root">
      
      {/* Topo Administrativo */}
      <header className="bg-[#0A2B2A] text-white py-4 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[#C5A880]/20 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#FAF8F5]/10 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#C5A880]" />
          </div>
          <div>
            <h1 className="text-lg font-serif font-bold tracking-tight">Painel de Controle Interno</h1>
            <p className="text-[10px] text-[#FAF8F5]/70 font-mono">Espaço Reabilitar • Sistema de Gestão Ativa</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold">{adminUser?.email}</p>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono font-bold uppercase rounded-full px-2 py-0.5">Admin</span>
          </div>
          
          <button 
            onClick={() => fetchDatabaseData(token!, { silent: true })}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[#C5A880] transition-all"
            title="Sincronizar Banco de Dados (Silencioso)"
          >
            <RefreshCw className={`w-4 h-4 ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 bg-red-600/90 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 md:px-12 py-8">
        
        {/* Feedbacks de Alerta */}
        {mensagemErro && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start space-x-3 text-red-700 text-xs" id="admin-err-box">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Erro de Operação</p>
              <p className="mt-0.5 opacity-90">{mensagemErro}</p>
            </div>
            <button onClick={() => setMensagemErro(null)} className="ml-auto font-bold">×</button>
          </div>
        )}

        {mensagemSucesso && (
          <div className="mb-6 bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start space-x-3 text-emerald-800 text-xs shadow-sm" id="admin-success-box">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Concluído</p>
              <p className="mt-0.5 opacity-90">{mensagemSucesso}</p>
            </div>
            <button onClick={() => setMensagemSucesso(null)} className="ml-auto font-bold">×</button>
          </div>
        )}

        {/* Abas e Menus de Navegação */}
        <div className="flex border-b border-slate-200/60 mb-8 space-x-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('agendamentos')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'agendamentos'
                ? 'border-[#0A2B2A] text-[#0A2B2A]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Consultas ({agendamentos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pacientes')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'pacientes'
                ? 'border-[#0A2B2A] text-[#0A2B2A]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Pacientes ({pacientes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('medicos')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'medicos'
                ? 'border-[#0A2B2A] text-[#0A2B2A]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Médicos ({medicos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('horarios')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'horarios'
                ? 'border-[#0A2B2A] text-[#0A2B2A]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Grade de Horários ({horarios.length})</span>
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-24">
            <RefreshCw className="w-10 h-10 animate-spin text-[#0A2B2A] mx-auto mb-4" />
            <p className="text-xs text-slate-500 font-mono">Conectando ao banco de dados PostgreSQL...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Esquerda: Seções Principais (Preenche 2 Colunas) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* ABA: PACIENTES */}
              {activeTab === 'pacientes' && (
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                    <div>
                      <h3 className="text-sm font-bold uppercase text-[#0A2B2A] tracking-wider">Painel Unificado de Pacientes</h3>
                      <p className="text-[11px] text-slate-500 font-mono">Gestão e cadastro único de pacientes da clínica.</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Campo de Busca em Tempo Real */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar por nome, telefone ou CPF..."
                          value={searchPaciente}
                          onChange={(e) => setSearchPaciente(e.target.value)}
                          className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-56 sm:w-64 focus:bg-white focus:border-[#0A2B2A] outline-none font-medium"
                        />
                        {searchPaciente && (
                          <button onClick={() => setSearchPaciente('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
                        )}
                      </div>

                      {/* Botão Novo Paciente */}
                      <button
                        onClick={() => setIsNovoPacienteModalOpen(true)}
                        className="bg-[#0A2B2A] hover:bg-[#134241] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 shadow-xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Novo Paciente</span>
                      </button>
                    </div>
                  </div>

                  {pacientes.filter(p => {
                    const term = searchPaciente.toLowerCase();
                    return p.nome.toLowerCase().includes(term) ||
                      (p.telefone && p.telefone.toLowerCase().includes(term)) ||
                      (p.cpf && p.cpf.toLowerCase().includes(term));
                  }).length === 0 ? (
                    <p className="text-center py-12 text-xs text-slate-400 font-mono">
                      {searchPaciente ? 'Nenhum paciente encontrado para esta busca.' : 'Nenhum paciente cadastrado no banco.'}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b text-slate-400 font-bold uppercase">
                            <th className="py-2.5">Paciente</th>
                            <th className="py-2.5">Telefone</th>
                            <th className="py-2.5">CPF / Documento</th>
                            <th className="py-2.5">Histórico de Consultas</th>
                            <th className="py-2.5 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pacientes
                            .filter(p => {
                              const term = searchPaciente.toLowerCase();
                              return p.nome.toLowerCase().includes(term) ||
                                (p.telefone && p.telefone.toLowerCase().includes(term)) ||
                                (p.cpf && p.cpf.toLowerCase().includes(term));
                            })
                            .map((pac) => {
                              const isExpanded = expandedPacienteId === pac.id;
                              const qtdConsultas = pac.agendamentos?.length || 0;

                              return (
                                <React.Fragment key={pac.id}>
                                  <tr className="hover:bg-slate-50/60 transition-all">
                                    <td className="py-3">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-7 h-7 bg-[#0A2B2A]/10 text-[#0A2B2A] rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                                          {pac.nome.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                          <p className="font-semibold text-slate-800">{pac.nome}</p>
                                          <span className="text-[9px] font-mono text-slate-400">ID #{pac.id}</span>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="py-3 font-mono text-slate-600">
                                      {pac.telefone ? (
                                        <span className="flex items-center space-x-1">
                                          <PhoneCall className="w-3 h-3 text-slate-400" />
                                          <span>{formatarTelefone(pac.telefone)}</span>
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 italic">Não informado</span>
                                      )}
                                    </td>

                                    <td className="py-3 font-mono text-slate-600">
                                      {pac.cpf ? (
                                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                          {formatarCPF(pac.cpf)}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 italic">Não informado</span>
                                      )}
                                    </td>

                                    <td className="py-3">
                                      <button
                                        onClick={() => setExpandedPacienteId(isExpanded ? null : pac.id)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1.5 transition-all ${
                                          qtdConsultas > 0
                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}
                                      >
                                        <FileText className="w-3 h-3" />
                                        <span>{qtdConsultas} {qtdConsultas === 1 ? 'consulta' : 'consultas'}</span>
                                        {qtdConsultas > 0 && (
                                          isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />
                                        )}
                                      </button>
                                    </td>

                                    <td className="py-3 text-center">
                                      <div className="flex items-center justify-center space-x-1.5">
                                        <button
                                          onClick={() => {
                                            setAgendandoParaPaciente(pac);
                                            setHorarioParaPacienteId('');
                                          }}
                                          className="bg-[#0A2B2A] hover:bg-[#134241] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 shadow-2xs"
                                          title="Agendar nova consulta para este paciente"
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>Agendar</span>
                                        </button>

                                        <button
                                          onClick={() => setEditingPaciente(pac)}
                                          className="p-1.5 text-slate-500 hover:text-[#0A2B2A] hover:bg-slate-100 rounded-lg transition-all"
                                          title="Editar paciente"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                          onClick={() => handleExcluirPaciente(pac.id, pac.nome)}
                                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                          title="Excluir paciente"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Histórico Expansível */}
                                  {isExpanded && qtdConsultas > 0 && (
                                    <tr>
                                      <td colSpan={5} className="bg-slate-50/80 p-4 border-b border-slate-200/60">
                                        <div className="space-y-2">
                                          <p className="text-[10px] uppercase tracking-wider font-bold text-[#0A2B2A] flex items-center space-x-1">
                                            <FileText className="w-3 h-3" />
                                            <span>Histórico de Agendamentos de {pac.nome}</span>
                                          </p>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {pac.agendamentos?.map((ag) => (
                                              <div key={ag.id} className="bg-white p-2.5 rounded-xl border border-slate-200/70 text-[11px] flex items-center justify-between shadow-2xs">
                                                <div>
                                                  <p className="font-bold text-slate-800">{ag.horario?.medico?.nome}</p>
                                                  <p className="text-[10px] text-[#C5A880] font-medium">{ag.horario?.medico?.especialidade}</p>
                                                </div>
                                                <div className="text-right font-mono text-slate-600">
                                                  <p className="font-bold">{formatarData(ag.horario?.data_hora)}</p>
                                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-sans font-bold">Agendado</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              
              {/* ABA: AGENDAMENTOS */}
              {activeTab === 'agendamentos' && (
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
                  <h3 className="text-sm font-bold uppercase text-[#0A2B2A] tracking-wider mb-4 border-b pb-2">Consultas Marcadas no Banco</h3>
                  
                  {agendamentos.length === 0 ? (
                    <p className="text-center py-12 text-xs text-slate-400 font-mono">Nenhuma consulta agendada no banco PostgreSQL.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b text-slate-400 font-bold uppercase">
                            <th className="py-2.5">Paciente</th>
                            <th className="py-2.5">Telefone</th>
                            <th className="py-2.5">Médico / Especialidade</th>
                            <th className="py-2.5">Horário</th>
                            <th className="py-2.5 text-center">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {agendamentos.map((ag) => (
                            <tr key={ag.id} className="hover:bg-slate-50/50">
                              <td className="py-3 font-semibold text-slate-800">{ag.nome_paciente}</td>
                              <td className="py-3 font-mono text-slate-500">{ag.telefone}</td>
                              <td className="py-3">
                                <p className="font-semibold text-slate-800">{ag.horario?.medico?.nome}</p>
                                <p className="text-[10px] text-[#C5A880]">{ag.horario?.medico?.especialidade}</p>
                              </td>
                              <td className="py-3 font-mono text-slate-600">{formatarData(ag.horario?.data_hora)}</td>
                              <td className="py-3 text-center">
                                <button
                                  onClick={() => handleCancelarAgendamento(ag.id)}
                                  className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-all"
                                  title="Cancelar Consulta"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ABA: MEDICOS */}
              {activeTab === 'medicos' && (
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
                  <h3 className="text-sm font-bold uppercase text-[#0A2B2A] tracking-wider mb-4 border-b pb-2">Equipe Cadastrada no Banco</h3>
                  
                  {medicos.length === 0 ? (
                    <p className="text-center py-12 text-xs text-slate-400 font-mono">Não há profissionais salvos.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {medicos.map((med) => (
                        <div key={med.id} className="border border-slate-100 rounded-xl p-4 flex items-center space-x-4 hover:shadow-md transition-all relative group bg-slate-50/40">
                          <div className="w-16 h-20 aspect-[3/4] rounded-xl overflow-hidden shrink-0 border border-[#C5A880]/30 bg-slate-100 relative">
                            {med.foto_url ? (
                              <img 
                                src={med.foto_url.split('#')[0]} 
                                alt={med.nome} 
                                className="w-full h-full object-cover object-top"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-[#0A2B2A]/10 flex items-center justify-center">
                                <User className="w-6 h-6 text-[#0A2B2A]" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pr-12">
                            <p className="font-semibold text-slate-800 text-xs truncate">{med.nome}</p>
                            <p className="text-[10px] text-[#C5A880] font-medium truncate">{med.especialidade}</p>
                            
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 font-mono font-bold rounded-md px-2 py-0.5 border border-emerald-200/50">
                                {med.registroProfissionalTipo || 'CRM'} {med.registroProfissionalNumero || 'Ativo'}
                              </span>
                              <span className="text-[9px] bg-slate-100 text-slate-600 font-mono font-bold rounded-md px-2 py-0.5">
                                Horários: {med._count?.horarios || 0}
                              </span>
                            </div>
                          </div>

                          <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all bg-white/90 p-1 rounded-lg backdrop-blur-sm shadow-sm border border-slate-200">
                            <button
                              onClick={() => {
                                let parsedConfig = { imageFit: 'cover', imagePosition: 'top', imageScale: 100, imageOffsetX: 0, imageOffsetY: 0 };
                                if (med.foto_url && med.foto_url.includes('#imgcfg=')) {
                                  try {
                                    const configStr = med.foto_url.split('#imgcfg=')[1];
                                    parsedConfig = { ...parsedConfig, ...JSON.parse(decodeURIComponent(configStr)) };
                                  } catch(e) {}
                                }
                                setEditingMedico({
                                  ...med,
                                  newFotoFile: null,
                                  newFotoPreview: null,
                                  imageFit: parsedConfig.imageFit,
                                  imagePosition: parsedConfig.imagePosition,
                                  imageScale: parsedConfig.imageScale,
                                  imageOffsetX: parsedConfig.imageOffsetX,
                                  imageOffsetY: parsedConfig.imageOffsetY
                                });
                              }}
                              className="text-slate-500 hover:text-[#0A2B2A] p-1.5 rounded-md hover:bg-slate-100 transition-all"
                              title="Editar Profissional e Imagem"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button
                              onClick={() => handleExcluirMedico(med.id)}
                              className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-all"
                              title="Remover Médico"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ABA: HORARIOS */}
              {activeTab === 'horarios' && (
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
                  <h3 className="text-sm font-bold uppercase text-[#0A2B2A] tracking-wider mb-4 border-b pb-2">Grade Completa de Horários</h3>
                  
                  {horarios.length === 0 ? (
                    <p className="text-center py-12 text-xs text-slate-400 font-mono">Não há horários salvos na grade.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b text-slate-400 font-bold uppercase">
                            <th className="py-2.5">Data & Hora</th>
                            <th className="py-2.5">Médico Responsável</th>
                            <th className="py-2.5">Status</th>
                            <th className="py-2.5 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {horarios.map((hor) => (
                            <tr key={hor.id} className="hover:bg-slate-50/50">
                              <td className="py-3 font-semibold text-slate-800 font-mono">{formatarData(hor.data_hora)}</td>
                              <td className="py-3">
                                <p className="font-semibold text-slate-800">{hor.medico?.nome}</p>
                                <p className="text-[9px] text-[#C5A880]">{hor.medico?.especialidade}</p>
                              </td>
                              <td className="py-3">
                                {hor.status_disponivel ? (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold uppercase px-2 py-0.5 rounded-full">Disponível</span>
                                ) : (
                                  <div>
                                    <span className="text-[10px] bg-amber-50 text-amber-700 font-bold uppercase px-2 py-0.5 rounded-full inline-block">Reservado</span>
                                    {hor.agendamento && (
                                      <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Pact: {hor.agendamento.nome_paciente}</p>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 text-center">
                                <button
                                  onClick={() => handleExcluirHorario(hor.id)}
                                  className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-all"
                                  title="Remover Horário"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Direita: Painéis de Cadastro Lateral (Preenche 1 Coluna) */}
            <div className="space-y-6">
              
              {/* FORMULÁRIO: CADASTRAR MÉDICO */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
                <div className="flex items-center space-x-2 mb-4 border-b pb-2">
                  <Users className="w-4 h-4 text-[#0A2B2A]" />
                  <h3 className="font-serif font-bold text-[#0A2B2A] text-xs uppercase tracking-wider">Novo Médico</h3>
                </div>
                
                <form onSubmit={handleCriarMedico} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={novoMedicoNome}
                      onChange={(e) => setNovoMedicoNome(e.target.value)}
                      placeholder="Dr. Alexandre Mendes"
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] focus:bg-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Especialidade Clínica</label>
                    <input
                      type="text"
                      required
                      value={novoMedicoEspec}
                      onChange={(e) => setNovoMedicoEspec(e.target.value)}
                      placeholder="Fisiatria e Reabilitação"
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] focus:bg-white outline-none"
                    />
                  </div>

                  {/* CAMPOS DINÂMICOS DE REGISTRO */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Conselho</label>
                      <select
                        value={novoMedicoTipoReg}
                        onChange={(e) => setNovoMedicoTipoReg(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] focus:bg-white outline-none font-semibold"
                      >
                        <option value="CRM">CRM</option>
                        <option value="COREN">COREN</option>
                        <option value="CRN">CRN</option>
                        <option value="CRP">CRP</option>
                        <option value="CREFITO">CREFITO</option>
                        <option value="CRO">CRO</option>
                        <option value="CRFA">CRFA</option>
                        <option value="OUTRO">OUTRO</option>
                      </select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Nº de Registro</label>
                      <input
                        type="text"
                        value={novoMedicoNumReg}
                        onChange={(e) => setNovoMedicoNumReg(e.target.value)}
                        placeholder="Ex: 12345/CE"
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] focus:bg-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* PREVIEW E UPLOAD DE FOTO */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Foto do Médico (Upload & Recorte)</label>
                    
                    {novoMedicoFotoPreview ? (
                      <div className="mb-2 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center space-x-3">
                        <div className="w-14 aspect-[3/4] rounded-xl overflow-hidden border border-[#C5A880]/40 shadow-2xs shrink-0 bg-slate-100">
                          <img 
                            src={novoMedicoFotoPreview} 
                            alt="Preview da Foto" 
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div className="space-y-1 text-xs">
                          <p className="font-bold text-emerald-700 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Foto Enquadrada
                          </p>
                          <div className="flex flex-wrap gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setCropModalSrc(novoMedicoFotoPreview);
                                setCropTargetMode('novo');
                                setIsCropModalOpen(true);
                              }}
                              className="text-[11px] text-[#0A2B2A] font-bold underline cursor-pointer hover:text-[#134241]"
                            >
                              Recortar / Ajustar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNovoMedicoFotoFicheiro(null);
                                setNovoMedicoFotoPreview(null);
                                const fileInput = document.getElementById('foto-upload') as HTMLInputElement;
                                if (fileInput) fileInput.value = '';
                              }}
                              className="text-[11px] text-red-600 font-bold underline cursor-pointer hover:text-red-700"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <input
                      type="file"
                      id="foto-upload"
                      accept="image/*"
                      onChange={handleNovoMedicoFotoChange}
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 focus:border-[#0A2B2A] focus:bg-white outline-none file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-[#0A2B2A] file:text-white hover:file:bg-[#134241] cursor-pointer"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full bg-[#0A2B2A] hover:bg-[#134241] text-[#FAF8F5] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 disabled:opacity-75 disabled:cursor-not-allowed shadow-xs"
                  >
                    {!isUploading && <Plus className="w-4 h-4" />}
                    <span>{isUploading ? 'Cadastrando e enviando foto...' : 'Adicionar Profissional'}</span>
                  </button>
                </form>
              </div>

              {/* FORMULÁRIO: CADASTRAR HORÁRIO */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs p-6">
                <div className="flex items-center space-x-2 mb-4 border-b pb-2">
                  <Calendar className="w-4 h-4 text-[#0A2B2A]" />
                  <h3 className="font-serif font-bold text-[#0A2B2A] text-xs uppercase tracking-wider">Novo Horário Vago</h3>
                </div>

                {medicos.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-mono">Cadastre ao menos um médico para criar horários.</p>
                ) : (
                  <form onSubmit={handleCriarHorario} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Médico Associado</label>
                      <select
                        required
                        value={novoHorarioMedico}
                        onChange={(e) => setNovoHorarioMedico(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] focus:bg-white outline-none"
                      >
                        <option value="">Selecione o médico...</option>
                        {medicos.map((med) => (
                          <option key={med.id} value={med.id}>
                            {med.nome} ({med.especialidade})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Data & Hora Selecionadas</label>
                      <input
                        type="datetime-local"
                        required
                        value={novoHorarioData}
                        onChange={(e) => setNovoHorarioData(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] focus:bg-white outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#0A2B2A] hover:bg-[#134241] text-[#FAF8F5] py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Cadastrar na Grade</span>
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Modal de Confirmação Customizado */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
      />

      {/* Modal de Edição de Médico */}
      {editingMedico && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row">
            
            {/* Esquerda: Formulário de Edição Completo */}
            <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-serif font-bold text-[#0A2B2A] text-lg">Editar Profissional</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Altere dados pessoais, registro profissional e fotografia.</p>
                </div>
                <button onClick={() => setEditingMedico(null)} className="text-slate-400 hover:text-red-500 font-bold text-xl leading-none">✕</button>
              </div>

              <form onSubmit={handleSalvarEdicaoMedico} className="space-y-4">
                {/* 1. Nome Completo */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">1. Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={editingMedico.nome}
                    onChange={(e) => setEditingMedico({...editingMedico, nome: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] outline-none"
                  />
                </div>

                {/* 2. Especialidade */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">2. Especialidade Clínica</label>
                  <input
                    type="text"
                    required
                    value={editingMedico.especialidade}
                    onChange={(e) => setEditingMedico({...editingMedico, especialidade: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] outline-none"
                  />
                </div>

                {/* 3. Registro Profissional */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">3. Conselho</label>
                    <select
                      value={editingMedico.registroProfissionalTipo || 'CRM'}
                      onChange={(e) => setEditingMedico({...editingMedico, registroProfissionalTipo: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] outline-none font-semibold"
                    >
                      <option value="CRM">CRM</option>
                      <option value="COREN">COREN</option>
                      <option value="CRN">CRN</option>
                      <option value="CRP">CRP</option>
                      <option value="CREFITO">CREFITO</option>
                      <option value="CRO">CRO</option>
                      <option value="CRFA">CRFA</option>
                      <option value="OUTRO">OUTRO</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Nº Registro</label>
                    <input
                      type="text"
                      value={editingMedico.registroProfissionalNumero || ''}
                      onChange={(e) => setEditingMedico({...editingMedico, registroProfissionalNumero: e.target.value})}
                      placeholder="Ex: 12345/CE"
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] outline-none font-mono"
                    />
                  </div>
                </div>

                {/* 4. Foto de Perfil e Recorte */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">4. Foto de Perfil do Médico</label>

                  <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="w-14 aspect-[3/4] rounded-xl overflow-hidden border border-[#C5A880]/40 shadow-2xs shrink-0 bg-slate-100">
                      <img 
                        src={editingMedico.newFotoPreview || editingMedico.foto_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(editingMedico.nome)} 
                        alt={editingMedico.nome} 
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <p className="font-bold text-slate-800">
                        {editingMedico.newFotoPreview ? 'Nova Foto Selecionada e Enquadrada' : 'Foto Atual Cadastrada'}
                      </p>
                      {(editingMedico.newFotoPreview || editingMedico.foto_url) && (
                        <button
                          type="button"
                          onClick={handleRecortarFotoAtual}
                          className="text-xs bg-[#0A2B2A] text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 hover:bg-[#134241] cursor-pointer shadow-2xs"
                        >
                          <Crop className="w-3.5 h-3.5" />
                          <span>Recortar / Redimensionar Foto</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="text-[10px] text-slate-500 font-semibold block mb-1">Escolher outro arquivo de imagem:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditMedicoFotoChange}
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 focus:border-[#0A2B2A] outline-none file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-[#0A2B2A] file:text-white hover:file:bg-[#134241] cursor-pointer"
                    />
                  </div>
                </div>

                {/* 5. Ajustes de Exibição de Imagem */}
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <p className="text-[11px] font-serif font-bold text-[#0A2B2A] uppercase tracking-wider">Ajuste de Enquadramento</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Modo de Fit</label>
                      <select
                        value={editingMedico.imageFit || 'cover'}
                        onChange={(e) => setEditingMedico({...editingMedico, imageFit: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 focus:border-[#0A2B2A] outline-none"
                      >
                        <option value="cover">Cover (Corta e Preenche)</option>
                        <option value="contain">Contain (Inteira)</option>
                        <option value="fill">Fill (Estica)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Posição</label>
                      <select
                        value={editingMedico.imagePosition || 'top'}
                        onChange={(e) => setEditingMedico({...editingMedico, imagePosition: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 focus:border-[#0A2B2A] outline-none"
                      >
                        <option value="top">Topo (Foco Rosto)</option>
                        <option value="center">Centro</option>
                        <option value="bottom">Base</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex justify-between">
                      <span>Zoom</span>
                      <span>{editingMedico.imageScale || 100}%</span>
                    </label>
                    <input
                      type="range"
                      min="80"
                      max="150"
                      value={editingMedico.imageScale || 100}
                      onChange={(e) => setEditingMedico({...editingMedico, imageScale: Number(e.target.value)})}
                      className="w-full accent-[#0A2B2A]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingMedico(null)}
                    className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="flex-1 bg-[#0A2B2A] hover:bg-[#134241] text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2"
                  >
                    {isSavingEdit ? 'Salvando Alterações...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>

            {/* Direita: Preview do Card do Médico */}
            <div className="flex-1 bg-[#FAF8F5] p-6 flex flex-col items-center justify-center rounded-r-2xl">
              <h4 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-4">Pré-visualização do Cartão</h4>
              
              <div className="w-[260px] bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200/50 relative">
                <div className="w-full aspect-[3/4] overflow-hidden relative bg-neutral-100 border-b border-slate-200/30">
                  {editingMedico.newFotoPreview || editingMedico.foto_url ? (
                    <div className="w-full h-full overflow-hidden flex items-center justify-center">
                      <img 
                        src={editingMedico.newFotoPreview || (editingMedico.foto_url ? editingMedico.foto_url.split('#')[0] : '')} 
                        alt={editingMedico.nome} 
                        className="w-full h-full object-cover" 
                        style={{
                          objectFit: (editingMedico.imageFit as any) || 'cover',
                          objectPosition: editingMedico.imagePosition || 'top',
                          transform: `scale(${(editingMedico.imageScale || 100) / 100})`
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A2B2A]/50 via-transparent to-transparent pointer-events-none" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#0A2B2A] to-[#061C1B] text-white p-6 text-center">
                      <div className="w-14 h-14 rounded-full bg-[#C5A880]/15 border border-[#C5A880]/25 flex items-center justify-center mb-4 shadow-inner">
                        <User className="w-6 h-6 text-[#C5A880]" />
                      </div>
                      <span className="font-serif text-2xl tracking-widest text-[#C5A880] font-light">
                        {editingMedico.nome.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="bg-[#0A2B2A]/5 text-[#0A2B2A] text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Espaço Reabilitar
                    </span>
                    <span className="text-[#C5A880] font-mono text-[9px] font-bold uppercase">
                      {editingMedico.registroProfissionalTipo || 'CRM'} {editingMedico.registroProfissionalNumero || 'Ativo'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-[#0A2B2A] text-sm">{editingMedico.nome || 'Nome do Médico'}</h4>
                    <p className="text-[11px] text-slate-500 font-semibold">{editingMedico.especialidade || 'Especialidade'}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
      {/* Modal: Cadastrar Novo Paciente */}
      {isNovoPacienteModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <div>
                <h3 className="font-serif font-bold text-[#0A2B2A] text-base">Novo Paciente</h3>
                <p className="text-[10px] text-slate-400 font-mono">Cadastre um paciente manualmente no sistema.</p>
              </div>
              <button 
                onClick={() => setIsNovoPacienteModalOpen(false)}
                className="text-slate-400 hover:text-red-500 font-bold text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCriarPaciente} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={novoPacienteNome}
                  onChange={(e) => setNovoPacienteNome(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] focus:bg-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">CPF / Documento</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={novoPacienteCpf}
                  onChange={(e) => setNovoPacienteCpf(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] focus:bg-white outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(85) 99999-8888"
                  value={novoPacienteTelefone}
                  onChange={(e) => setNovoPacienteTelefone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] focus:bg-white outline-none font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNovoPacienteModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#0A2B2A] hover:bg-[#134241] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Paciente */}
      {editingPaciente && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <div>
                <h3 className="font-serif font-bold text-[#0A2B2A] text-base">Editar Paciente</h3>
                <p className="text-[10px] text-slate-400 font-mono">Atualize as informações do cadastro.</p>
              </div>
              <button 
                onClick={() => setEditingPaciente(null)}
                className="text-slate-400 hover:text-red-500 font-bold text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAtualizarPaciente} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={editingPaciente.nome}
                  onChange={(e) => setEditingPaciente({ ...editingPaciente, nome: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] focus:bg-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">CPF / Documento</label>
                <input
                  type="text"
                  value={editingPaciente.cpf || ''}
                  onChange={(e) => setEditingPaciente({ ...editingPaciente, cpf: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] focus:bg-white outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={editingPaciente.telefone || ''}
                  onChange={(e) => setEditingPaciente({ ...editingPaciente, telefone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] focus:bg-white outline-none font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPaciente(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#0A2B2A] hover:bg-[#134241] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Agendar Consulta para Paciente */}
      {agendandoParaPaciente && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <div>
                <h3 className="font-serif font-bold text-[#0A2B2A] text-base">Agendar Consulta</h3>
                <p className="text-[10px] text-slate-400 font-mono">Paciente: <strong className="text-slate-700">{agendandoParaPaciente.nome}</strong></p>
              </div>
              <button 
                onClick={() => setAgendandoParaPaciente(null)}
                className="text-slate-400 hover:text-red-500 font-bold text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAgendarParaPaciente} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1">
                <p className="font-bold text-slate-800">{agendandoParaPaciente.nome}</p>
                <p className="text-[10px] text-slate-500 font-mono">Telefone: {agendandoParaPaciente.telefone || 'Não informado'}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Selecione um Horário Vago</label>
                {horarios.filter(h => h.status_disponivel).length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                    Não há horários vagos disponíveis na grade. Cadastre horários em "Grade de Horários".
                  </div>
                ) : (
                  <select
                    required
                    value={horarioParaPacienteId}
                    onChange={(e) => setHorarioParaPacienteId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] focus:bg-white outline-none font-medium"
                  >
                    <option value="">Selecione um horário...</option>
                    {horarios
                      .filter(h => h.status_disponivel)
                      .map((h) => (
                        <option key={h.id} value={h.id}>
                          {formatarData(h.data_hora)} — Dr(a). {h.medico.nome} ({h.medico.especialidade})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAgendandoParaPaciente(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={horarios.filter(h => h.status_disponivel).length === 0}
                  className="flex-1 bg-[#0A2B2A] hover:bg-[#134241] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Recorte e Enquadramento de Imagem */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropModalSrc}
        onClose={() => setIsCropModalOpen(false)}
        onCropComplete={handleCropComplete}
        initialAspectRatio="3:4"
        title="Ajustar e Recortar Foto do Médico"
      />
    </div>
  );
};
