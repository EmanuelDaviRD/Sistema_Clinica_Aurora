import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, User, Phone, ChevronRight, Stethoscope, 
  ArrowLeft, CheckCircle, RefreshCw, AlertCircle 
} from 'lucide-react';

interface Medico {
  id: number;
  nome: string;
  especialidade: string;
  foto_url?: string;
}

interface Horario {
  id: number;
  data_hora: string;
  medico_id: number;
  status_disponivel: boolean;
  medico: {
    nome: string;
    foto_url?: string;
    especialidade: string;
  };
}

export const PublicAgendar: React.FC = () => {
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<Horario[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Seleções do fluxo de agendamento
  const [medicoSelecionado, setMedicoSelecionado] = useState<Medico | null>(null);
  const [horarioSelecionado, setHorarioSelecionado] = useState<Horario | null>(null);
  const [nomePaciente, setNomePaciente] = useState('');
  const [telefone, setTelefone] = useState('');

  // Estados de controle de fluxo e feedback
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [agendamentoSucesso, setAgendamentoSucesso] = useState<any>(null);

  // Inicializa dados trazendo os registros ativos do banco de dados
  useEffect(() => {
    const loadBookingData = async () => {
      try {
        const [resMedicos, resHorarios] = await Promise.all([
          fetch('/api/medicos'),
          fetch('/api/horarios?apenas_disponiveis=true')
        ]);

        if (resMedicos.ok) setMedicos(await resMedicos.json());
        if (resHorarios.ok) setHorariosDisponiveis(await resHorarios.json());
      } catch (err) {
        console.error('Falha ao conectar com o banco de dados:', err);
        setErrorMsg('Serviços temporariamente indisponíveis. Por favor, tente novamente mais tarde.');
      } finally {
        setIsLoading(false);
      }
    };
    loadBookingData();
  }, []);

  // Lista de horários filtrada de acordo com o médico que o paciente escolheu
  const horariosDoMedico = horariosDisponiveis.filter(
    (h) => !medicoSelecionado || h.medico_id === medicoSelecionado.id
  );

  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomePaciente || !telefone || !horarioSelecionado) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome_paciente: nomePaciente,
          telefone,
          horario_id: horarioSelecionado.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Desculpe, ocorreu uma falha ao consolidar o agendamento.');
      }

      setAgendamentoSucesso(data.agendamento);
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || 'Não fomos capazes de processar o agendamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatarData = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  const formatarHora = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-[#0A2B2A] mx-auto mb-4" />
          <p className="text-xs text-slate-500 font-mono">Carregando médicos e horários disponíveis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-12 px-4 md:px-8 font-sans" id="public-booking-view">
      <div className="max-w-xl mx-auto bg-white border border-[#C5A880]/20 rounded-2xl shadow-xl overflow-hidden p-6 md:p-8">
        
        {/* Topo do Formulário */}
        {step < 4 && (
          <div className="mb-8">
            <button 
              onClick={() => {
                if (step > 1) {
                  setStep(step - 1);
                } else {
                  navigate('/');
                }
              }}
              className="flex items-center space-x-1.5 text-xs font-bold text-[#0A2B2A] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{step === 1 ? 'Voltar para Home' : 'Voltar Etapa'}</span>
            </button>
            
            <div className="mt-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif font-bold text-[#0A2B2A]">Agendar Consulta Online</h2>
                <p className="text-[11px] text-slate-400 font-medium">Preencha os passos abaixo para reservar sua consulta</p>
              </div>
              <span className="text-xs font-mono font-bold bg-[#0A2B2A]/5 text-[#0A2B2A] px-2.5 py-1 rounded-full">
                Etapa {step} de 3
              </span>
            </div>

            {/* Barra de Progresso Visual */}
            <div className="w-full h-1 bg-slate-100 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Feedback de erro */}
        {errorMsg && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start space-x-3 text-red-700 text-xs" id="booking-error-panel">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Erro de Agendamento</p>
              <p className="mt-0.5 opacity-90">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* ETAPA 1: SELECIONAR MÉDICO */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">1. Escolha o Médico</h3>
            
            {medicos.length === 0 ? (
              <p className="text-center py-10 text-xs text-slate-400 font-mono">Nenhum médico disponível para agendamento no momento.</p>
            ) : (
              <div className="space-y-3">
                {medicos.map((med) => (
                  <button
                    key={med.id}
                    onClick={() => {
                      setMedicoSelecionado(med);
                      setStep(2);
                    }}
                    className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all hover:bg-[#FAF8F5] ${
                      medicoSelecionado?.id === med.id 
                        ? 'border-[#0A2B2A] bg-[#FAF8F5]/50 ring-2 ring-[#0A2B2A]/10' 
                        : 'border-slate-100 bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {med.foto_url ? (
                        <img 
                          src={med.foto_url} 
                          alt={med.nome} 
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-100"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[#0A2B2A]/5 text-[#0A2B2A] rounded-full flex items-center justify-center">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-[#0A2B2A]">{med.nome}</p>
                        <p className="text-[10px] text-[#C5A880] flex items-center mt-0.5">
                          <Stethoscope className="w-3 h-3 mr-1 shrink-0" />
                          <span>{med.especialidade}</span>
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ETAPA 2: ESCOLHER HORÁRIO */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">2. Selecione o Horário Vago</h3>
              {medicoSelecionado && (
                <span className="text-[10px] text-slate-500 font-medium">Médico: {medicoSelecionado.nome}</span>
              )}
            </div>

            {horariosDoMedico.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed text-slate-400 border-slate-200">
                <p className="text-xs font-mono mb-2">Nenhum horário disponível para este profissional.</p>
                <button 
                  onClick={() => {
                    setMedicoSelecionado(null);
                    setStep(1);
                  }}
                  className="text-xs text-[#0A2B2A] font-bold underline"
                >
                  Escolher outro profissional
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                {horariosDoMedico.map((hor) => (
                  <button
                    key={hor.id}
                    onClick={() => {
                      setHorarioSelecionado(hor);
                      setStep(3);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      horarioSelecionado?.id === hor.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-100 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="text-xs font-bold flex items-center justify-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatarData(hor.data_hora)}</span>
                    </p>
                    <p className="text-[11px] font-mono font-medium text-slate-600 mt-1 flex items-center justify-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatarHora(hor.data_hora)} hs</span>
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ETAPA 3: DADOS COMPLEMENTARES E SUBMISSÃO */}
        {step === 3 && (
          <form onSubmit={handleAgendar} className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">3. Suas Informações</h3>
            
            {/* Revisão do Horário Selecionado */}
            {horarioSelecionado && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2 mb-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Resumo Clínico da Consulta</p>
                <div className="text-xs space-y-1">
                  <p className="text-slate-800"><strong className="text-slate-550">Profissional:</strong> {horarioSelecionado.medico?.nome}</p>
                  <p className="text-slate-800"><strong className="text-slate-550">Especialidade:</strong> {horarioSelecionado.medico?.especialidade}</p>
                  <p className="text-slate-800"><strong className="text-slate-550">Data & Hora:</strong> {formatarData(horarioSelecionado.data_hora)} às {formatarHora(horarioSelecionado.data_hora)} hs</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-550 font-bold block">Nome Completo</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={nomePaciente}
                  onChange={(e) => setNomePaciente(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-3 focus:border-[#0A2B2A] focus:bg-white outline-none"
                />
              </div>
            </div>

            <div className="space-y-1 font-sans">
              <label className="text-[10px] uppercase tracking-wider text-slate-550 font-bold block">Celular / WhatsApp</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(88) 99624-8427"
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-3 focus:border-[#0A2B2A] focus:bg-white outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white py-3 px-4 rounded-xl text-xs font-bold transition-all transform active:scale-98 flex items-center justify-center space-x-1.5 shadow-md mt-6"
            >
              {isSubmitting ? (
                <span>Agendando, por favor aguarde...</span>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <span>Confirmar Agendamento</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ETAPA 4: SUCESSO COGNITIVO */}
        {step === 4 && agendamentoSucesso && (
          <div className="text-center py-6" id="booking-success-screen">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-serif font-bold text-[#0A2B2A] tracking-tight">Consulta Agendada!</h2>
            <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
              Sua consulta com o <strong>{agendamentoSucesso.horario?.medico?.nome}</strong> foi registrada no banco de nossa Clínica com absoluto sucesso.
            </p>

            <div className="bg-[#FAF8F5]/70 border border-dashed border-[#C5A880]/30 rounded-2xl p-5 mt-6 max-w-sm mx-auto text-left text-xs space-y-1.5">
              <p className="border-b pb-1 mb-2 font-bold text-slate-700 uppercase tracking-wider text-[10px]">Detalhes do Agendamento</p>
              <p><strong className="text-slate-500">Paciente:</strong> {agendamentoSucesso.nome_paciente}</p>
              <p><strong className="text-slate-500">Médico:</strong> {agendamentoSucesso.horario?.medico?.nome}</p>
              <p><strong className="text-slate-500">Data:</strong> {formatarData(agendamentoSucesso.horario?.data_hora)} às {formatarHora(agendamentoSucesso.horario?.data_hora)} hs</p>
              <p><strong className="text-slate-500">Vínculo:</strong> Protocolo #{agendamentoSucesso.id}</p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/')}
                className="bg-[#0A2B2A] hover:bg-[#134241] text-[#FAF8F5] px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Voltar para Home
              </button>
              
              <button
                onClick={() => {
                  setNomePaciente('');
                  setTelefone('');
                  setHorarioSelecionado(null);
                  setMedicoSelecionado(null);
                  setStep(1);
                }}
                className="bg-white border hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                Agendar outro horário
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
