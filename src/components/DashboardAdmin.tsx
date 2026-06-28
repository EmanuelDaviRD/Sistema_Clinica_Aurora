import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, Clock, LogOut, Plus, Trash2, 
  User, Shield, Activity, RefreshCw, AlertCircle, CheckCircle, Stethoscope
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface Medico {
  id: number;
  nome: string;
  especialidade: string;
  foto_url?: string;
  _count?: {
    horarios: number;
  };
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

export const DashboardAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Estados dos dados buscados da API PostgreSQL
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Formulário: Cadastrar Médico
  const [novoMedicoNome, setNovoMedicoNome] = useState('');
  const [novoMedicoEspec, setNovoMedicoEspec] = useState('');
  const [novoMedicoFotoFicheiro, setNovoMedicoFotoFicheiro] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Formulário: Cadastrar Horário para Médico
  const [novoHorarioData, setNovoHorarioData] = useState('');
  const [novoHorarioMedico, setNovoHorarioMedico] = useState('');

  // Estados de feedback visual
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'agendamentos' | 'medicos' | 'horarios'>('agendamentos');

  // Estado do modal de confirmação customizado
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

  // Busca conjunta de todos os dados do banco PostgreSQL
  const fetchDatabaseData = async (activeToken: string) => {
    setIsLoading(true);
    setMensagemErro(null);

    try {
      const headers = { 'Authorization': `Bearer ${activeToken}` };

      // Como as leituras simples de medicos e horarios são públicas, o token é opcional nelas
      const [resMedicos, resHorarios, resAgendamentos] = await Promise.all([
        fetch('/api/medicos'),
        fetch('/api/horarios'),
        fetch('/api/agendamentos', { headers })
      ]);

      if (resMedicos.ok) setMedicos(await resMedicos.json());
      if (resHorarios.ok) setHorarios(await resHorarios.json());
      if (resAgendamentos.ok) setAgendamentos(await resAgendamentos.json());

      if (!resAgendamentos.ok) {
        // Se o fetch de agendamentos falhar com 401, o token provavelmente expirou
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
    }
  };

  // Logout e limpeza
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
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
      if (novoMedicoFotoFicheiro) {
        formData.append('foto', novoMedicoFotoFicheiro);
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
      setNovoMedicoFotoFicheiro(null);
      // Reset input type file
      const fileInput = document.getElementById('foto-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      triggerFeedback('Médico cadastrado com sucesso!');
      fetchDatabaseData(token!);
    } catch (err: any) {
      setMensagemErro(err.message);
    } finally {
      setIsUploading(false);
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
        try {
          const response = await fetch(`/api/medicos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao excluir.');
          }

          triggerFeedback('Médico e seus horários foram excluídos.');
          fetchDatabaseData(token!);
        } catch (err: any) {
          setMensagemErro(err.message);
        }
      },
    });
  };

  // Ações de Horários
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
      fetchDatabaseData(token!);
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
        try {
          const response = await fetch(`/api/horarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao excluir.');
          }

          triggerFeedback('Horário excluído com sucesso.');
          fetchDatabaseData(token!);
        } catch (err: any) {
          setMensagemErro(err.message);
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
        try {
          const response = await fetch(`/api/agendamentos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao cancelar consulta.');
          }

          triggerFeedback('Agendamento cancelado. O horário correspondente agora está disponível para outros pacientes.');
          fetchDatabaseData(token!);
        } catch (err: any) {
          setMensagemErro(err.message);
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
            onClick={() => fetchDatabaseData(token!)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[#C5A880] transition-all"
            title="Sincronizar Banco"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
        <div className="flex border-b border-slate-200/60 mb-8 space-x-4">
          <button
            onClick={() => setActiveTab('agendamentos')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'agendamentos'
                ? 'border-[#0A2B2A] text-[#0A2B2A]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Consultas Agendadas ({agendamentos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('medicos')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-all ${
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
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-all ${
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
                        <div key={med.id} className="border border-slate-100 rounded-xl p-4 flex items-center space-x-3 hover:shadow-md transition-all relative group bg-slate-55/10">
                          {med.foto_url ? (
                            <img 
                              src={med.foto_url} 
                              alt={med.nome} 
                              className="w-12 h-12 rounded-full object-cover shrink-0 border-2 border-[#C5A880]/20"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-[#0A2B2A]/10 rounded-full flex items-center justify-center shrink-0">
                              <User className="w-5 h-5 text-[#0A2B2A]" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">{med.nome}</p>
                            <p className="text-[10px] text-[#C5A880]">{med.especialidade}</p>
                            <span className="text-[9px] bg-slate-100 text-slate-500 font-mono font-bold rounded-full px-2 py-0.5 mt-1 inline-block">
                              Horários: {med._count?.horarios || 0}
                            </span>
                          </div>

                          <button
                            onClick={() => handleExcluirMedico(med.id)}
                            className="absolute top-4 right-4 text-slate-300 hover:text-red-500 p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Remover Médico"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Foto do Médico (Opcional)</label>
                    <input
                      type="file"
                      id="foto-upload"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setNovoMedicoFotoFicheiro(file || null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 focus:border-[#0A2B2A] focus:bg-white outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-[#0A2B2A] file:text-white hover:file:bg-[#134241] cursor-pointer"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full bg-[#0A2B2A] hover:bg-[#134241] text-[#FAF8F5] py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {!isUploading && <Plus className="w-4 h-4" />}
                    <span>{isUploading ? 'Salvando e enviando foto...' : 'Adicionar Profissional'}</span>
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
    </div>
  );
};
