import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { 
  Calendar, Clock, User, Phone, ChevronRight, Stethoscope, 
  ArrowLeft, CheckCircle, AlertCircle, MessageCircle 
} from 'lucide-react';
import { getWhatsAppLink } from '../utils/whatsapp';

interface Medico {
  id: number;
  nome: string;
  especialidade: string;
  foto_url?: string;
  _count?: { horarios: number };
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

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Falha ao buscar dados');
  return res.json();
});

export const PublicAgendar: React.FC = () => {
  const navigate = useNavigate();
  
  // Utilizando SWR para Cache e Deduplicação de requisições
  const { data: medicos, error: errorMedicos, isLoading: isLoadingMedicos } = useSWR<Medico[]>(
    '/api/medicos', 
    fetcher, 
    { dedupingInterval: 300000, revalidateOnFocus: false }
  );
  
  const { data: horariosDisponiveis, error: errorHorarios, isLoading: isLoadingHorarios } = useSWR<Horario[]>(
    '/api/horarios?apenas_disponiveis=true', 
    fetcher, 
    { dedupingInterval: 300000, revalidateOnFocus: false }
  );

  const isLoading = isLoadingMedicos || isLoadingHorarios;
  const isError = errorMedicos || errorHorarios;

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

  // Lista de horários filtrada de acordo com o médico escolhido
  const horariosDoMedico = (horariosDisponiveis || []).filter(
    (h) => !medicoSelecionado || h.medico_id === medicoSelecionado.id
  );

  // Máscara de telefone (XX) 9XXXX-XXXX com limite de 11 dígitos numéricos
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = rawDigits;
    if (rawDigits.length > 0) {
      if (rawDigits.length <= 2) {
        formatted = `(${rawDigits}`;
      } else if (rawDigits.length <= 6) {
        formatted = `(${rawDigits.slice(0, 2)}) ${rawDigits.slice(2)}`;
      } else if (rawDigits.length <= 10) {
        formatted = `(${rawDigits.slice(0, 2)}) ${rawDigits.slice(2, 6)}-${rawDigits.slice(6)}`;
      } else {
        formatted = `(${rawDigits.slice(0, 2)}) ${rawDigits.slice(2, 7)}-${rawDigits.slice(7)}`;
      }
    }
    setTelefone(formatted);
  };

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

  // Skeleton Loading Elegante para a Tabela de Médicos
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="bg-white border border-[#C5A880]/20 rounded-2xl shadow-xl overflow-hidden p-6 md:p-8 w-full max-w-xl animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-slate-100 rounded w-1/2 mb-8"></div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((skeleton) => (
              <div key={skeleton} className="flex items-center space-x-4 p-4 border border-slate-100 rounded-xl">
                <div className="w-12 h-12 bg-slate-200 rounded-full shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Graceful Degradation / Fallback no caso da API Falhar (Offline/Erro de DB)
  if (isError) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-serif text-[#0A2B2A] font-bold">Serviço Indisponível</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">Infelizmente não foi possível carregar os horários. Verifique sua conexão ou tente novamente mais tarde.</p>
          <button onClick={() => navigate('/')} className="bg-[#0A2B2A] text-white px-6 py-2 rounded-xl text-xs font-bold">
            Voltar ao Início
          </button>
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
              className="flex items-center space-x-2 text-sm font-bold text-[#0A2B2A] hover:underline py-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{step === 1 ? 'Voltar para Home' : 'Voltar Etapa'}</span>
            </button>
            
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0A2B2A]">Agendar Consulta Online</h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Preencha os passos abaixo para reservar sua consulta</p>
              </div>
              <span className="text-xs font-mono font-bold bg-[#0A2B2A]/5 text-[#0A2B2A] px-3 py-1.5 rounded-full w-fit">
                Etapa {step} de 3
              </span>
            </div>

            {/* Barra de Progresso Visual */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Feedback de erro */}
        {errorMsg && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start space-x-3 text-red-700 text-sm" id="booking-error-panel">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Erro de Agendamento</p>
              <p className="mt-0.5 opacity-90 text-xs sm:text-sm">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* ETAPA 1: SELECIONAR MÉDICO */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">1. Escolha o Médico</h3>
            
            {(!medicos || medicos.length === 0) ? (
              <p className="text-center py-10 text-sm text-slate-400 font-mono">Nenhum médico disponível para agendamento no momento.</p>
            ) : (
              <div className="space-y-3">
                {medicos.map((med) => (
                  <button
                    key={med.id}
                    onClick={() => {
                      setMedicoSelecionado(med);
                      setStep(2);
                    }}
                    className={`w-full text-left p-4 rounded-2xl border flex items-center justify-between transition-all hover:bg-[#FAF8F5] min-h-[56px] active:scale-[0.99] ${
                      medicoSelecionado?.id === med.id 
                        ? 'border-[#0A2B2A] bg-[#FAF8F5]/50 ring-2 ring-[#0A2B2A]/10' 
                        : 'border-slate-200/80 bg-white shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      {med.foto_url ? (
                        <img 
                          src={med.foto_url} 
                          alt={med.nome} 
                          className="w-12 h-12 rounded-full object-cover shrink-0 border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-[#0A2B2A]/5 text-[#0A2B2A] rounded-full flex items-center justify-center shrink-0">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-[#0A2B2A]">{med.nome}</p>
                        <p className="text-xs text-[#C5A880] font-medium flex items-center mt-0.5">
                          <Stethoscope className="w-3.5 h-3.5 mr-1 shrink-0" />
                          <span>{med.especialidade}</span>
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ETAPA 2: ESCOLHER HORÁRIO */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">2. Selecione o Horário Vago</h3>
              {medicoSelecionado && (
                <span className="text-xs text-slate-600 font-semibold">Médico: {medicoSelecionado.nome}</span>
              )}
            </div>

            {horariosDoMedico.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed text-slate-400 border-slate-200 p-4">
                <p className="text-sm font-mono mb-3">Nenhum horário disponível para este profissional.</p>
                <button 
                  onClick={() => {
                    setMedicoSelecionado(null);
                    setStep(1);
                  }}
                  className="text-xs sm:text-sm text-[#0A2B2A] font-bold underline py-2"
                >
                  Escolher outro profissional
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                {horariosDoMedico.map((hor) => (
                  <button
                    key={hor.id}
                    onClick={() => {
                      setHorarioSelecionado(hor);
                      setStep(3);
                    }}
                    className={`p-3.5 rounded-2xl border text-center transition-all min-h-[52px] active:scale-[0.98] ${
                      horarioSelecionado?.id === hor.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <p className="text-xs sm:text-sm font-bold flex items-center justify-center space-x-1 text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatarData(hor.data_hora)}</span>
                    </p>
                    <p className="text-xs font-mono font-medium text-slate-600 mt-1 flex items-center justify-center space-x-1">
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
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">3. Suas Informações</h3>
            
            {/* Revisão do Horário Selecionado */}
            {horarioSelecionado && (
              <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-2 mb-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Resumo do Agendamento</p>
                <div className="text-xs sm:text-sm space-y-1">
                  <p className="text-slate-800"><strong className="text-slate-600">Profissional:</strong> {horarioSelecionado.medico?.nome}</p>
                  <p className="text-slate-800"><strong className="text-slate-600">Especialidade:</strong> {horarioSelecionado.medico?.especialidade}</p>
                  <p className="text-slate-800"><strong className="text-slate-600">Data & Hora:</strong> {formatarData(horarioSelecionado.data_hora)} às {formatarHora(horarioSelecionado.data_hora)} hs</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-slate-600 font-bold block">Nome Completo *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={nomePaciente}
                  onChange={(e) => setNomePaciente(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl pl-10 pr-3.5 py-3.5 focus:border-[#0A2B2A] focus:bg-white outline-none font-medium min-h-[48px]"
                />
              </div>
            </div>

            <div className="space-y-1 font-sans">
              <label className="text-xs uppercase tracking-wider text-slate-600 font-bold block">Celular / WhatsApp *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  required
                  value={telefone}
                  onChange={handleTelefoneChange}
                  maxLength={15}
                  placeholder="(88) 99624-8427"
                  className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl pl-10 pr-3.5 py-3.5 focus:border-[#0A2B2A] focus:bg-white outline-none font-medium min-h-[48px]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white py-3.5 px-5 rounded-xl text-sm font-bold transition-all transform active:scale-98 flex items-center justify-center space-x-2 shadow-md mt-6 min-h-[50px] cursor-pointer"
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

        {/* ETAPA 4: CONFIRMAÇÃO DE SUCESSO E WHATSAPP */}
        {step === 4 && agendamentoSucesso && (
          <div className="text-center py-6" id="booking-success-screen">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-serif font-bold text-[#0A2B2A] tracking-tight">Consulta Agendada!</h2>
            <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
              Sua consulta com o <strong>{agendamentoSucesso.horario?.medico?.nome || medicoSelecionado?.nome}</strong> foi registrada no banco de nossa Clínica com sucesso.
            </p>

            <div className="bg-[#FAF8F5]/70 border border-dashed border-[#C5A880]/30 rounded-2xl p-5 mt-6 max-w-sm mx-auto text-left text-xs space-y-1.5">
              <p className="border-b pb-1 mb-2 font-bold text-slate-700 uppercase tracking-wider text-[10px]">Resumo do Agendamento</p>
              <p><strong className="text-slate-500">Paciente:</strong> {agendamentoSucesso.nome_paciente}</p>
              <p><strong className="text-slate-500">Médico:</strong> {agendamentoSucesso.horario?.medico?.nome || medicoSelecionado?.nome}</p>
              <p><strong className="text-slate-500">Especialidade:</strong> {agendamentoSucesso.horario?.medico?.especialidade || medicoSelecionado?.especialidade}</p>
              <p><strong className="text-slate-500">Data & Hora:</strong> {formatarData(agendamentoSucesso.horario?.data_hora || horarioSelecionado?.data_hora)} às {formatarHora(agendamentoSucesso.horario?.data_hora || horarioSelecionado?.data_hora)} hs</p>
            </div>

            {/* Botão em Destaque do WhatsApp */}
            <a
              href={getWhatsAppLink(
                '5588996248427',
                `Olá! Acabei de realizar um agendamento de consulta online no site da clínica.\n\n*Nome do Paciente:* ${agendamentoSucesso.nome_paciente}\n*Médico:* ${agendamentoSucesso.horario?.medico?.nome || medicoSelecionado?.nome || ''}\n*Especialidade:* ${agendamentoSucesso.horario?.medico?.especialidade || medicoSelecionado?.especialidade || ''}\n*Data e Horário:* ${formatarData(agendamentoSucesso.horario?.data_hora || horarioSelecionado?.data_hora)} às ${formatarHora(agendamentoSucesso.horario?.data_hora || horarioSelecionado?.data_hora)} hs\n\nGostaria de confirmar meu agendamento.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 w-full max-w-sm mx-auto bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 px-6 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <MessageCircle className="w-5 h-5 shrink-0" />
              <span>Confirmar Agendamento pelo WhatsApp</span>
            </a>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-[#0A2B2A] hover:bg-[#134241] text-[#FAF8F5] px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
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
                className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded-xl text-xs font-bold transition-all"
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
