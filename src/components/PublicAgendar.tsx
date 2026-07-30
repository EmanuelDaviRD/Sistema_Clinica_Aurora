import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useSWR from 'swr';
import { 
  Calendar, Clock, User, Phone, ChevronRight, Stethoscope, 
  ArrowLeft, CheckCircle, AlertCircle, MessageCircle, Activity, HeartPulse
} from 'lucide-react';
import { getWhatsAppLink } from '../utils/whatsapp';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Falha ao buscar dados');
  return res.json();
});

export const PublicAgendar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Parsers de URL
  const queryParams = new URLSearchParams(location.search);
  const initialType = queryParams.get('tipo');
  const initialCheckupId = queryParams.get('checkupId');

  const { data: medicos, isLoading: isLoadingMedicos } = useSWR('/api/medicos', fetcher);
  const { data: horariosDisponiveis, isLoading: isLoadingHorarios } = useSWR('/api/horarios?apenas_disponiveis=true', fetcher);
  const { data: checkups, isLoading: isLoadingCheckups } = useSWR('/api/checkups', fetcher);
  const { data: examesImagem, isLoading: isLoadingImagens } = useSWR('/api/exames/imagem', fetcher);

  const isLoading = isLoadingMedicos || isLoadingHorarios || isLoadingCheckups || isLoadingImagens;

  // Estados de Fluxo
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState<string | null>(null); // 'CONSULTA_MEDICA', 'EXAME_IMAGEM', 'EXAME_LABORATORIAL'
  const [medicoSelecionado, setMedicoSelecionado] = useState<any>(null);
  const [exameSelecionado, setExameSelecionado] = useState<any>(null);
  
  const [horarioSelecionado, setHorarioSelecionado] = useState<any>(null);
  const [dataPreferencial, setDataPreferencial] = useState('');
  const [nomePaciente, setNomePaciente] = useState('');
  const [telefone, setTelefone] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [agendamentoSucesso, setAgendamentoSucesso] = useState<any>(null);

  // Inicialização via URL
  useEffect(() => {
    if (initialType === 'EXAME_LABORATORIAL' && initialCheckupId && checkups) {
      const chk = checkups.find((c: any) => c.id === Number(initialCheckupId) || c.id === initialCheckupId);
      if (chk) {
        setServiceType('EXAME_LABORATORIAL');
        setExameSelecionado(chk);
        setStep(3); // Pula direto para coleta de dados
      }
    }
  }, [initialType, initialCheckupId, checkups]);

  const horariosDoMedico = (horariosDisponiveis || []).filter(
    (h: any) => !medicoSelecionado || h.medico_id === medicoSelecionado.id
  );

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
    if (!nomePaciente || !telefone) return;
    if (serviceType === 'CONSULTA_MEDICA' && !horarioSelecionado) return;
    if (serviceType !== 'CONSULTA_MEDICA' && !dataPreferencial) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: any = {
      nome_paciente: nomePaciente,
      telefone,
      serviceType
    };

    if (serviceType === 'CONSULTA_MEDICA') {
      payload.horario_id = horarioSelecionado.id;
    } else {
      payload.data_preferencial = dataPreferencial;
      if (serviceType === 'EXAME_LABORATORIAL') {
        payload.checkup_id = exameSelecionado.id;
      } else if (serviceType === 'EXAME_IMAGEM') {
        payload.exame_imagem_id = exameSelecionado.id;
      }
    }

    try {
      const response = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Falha ao agendar.');

      setAgendamentoSucesso(data.agendamento);
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar agendamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatarData = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
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

  if (isLoading && step < 4) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="bg-white border border-[#C5A880]/20 rounded-2xl shadow-xl overflow-hidden p-6 w-full max-w-xl animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-slate-100 rounded w-1/2 mb-8"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-12 px-4 md:px-8 font-sans">
      <div className="max-w-xl mx-auto bg-white border border-[#C5A880]/20 rounded-2xl shadow-xl overflow-hidden p-6 md:p-8">
        
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
            <div className="mt-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#0A2B2A]">Agendamento Online</h2>
                <p className="text-xs text-slate-500 mt-1">Siga os passos para concluir sua reserva</p>
              </div>
              <span className="text-xs font-mono font-bold bg-[#0A2B2A]/5 text-[#0A2B2A] px-3 py-1.5 rounded-full">
                Etapa {step} de 3
              </span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start space-x-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* ETAPA 1: O QUE DESEJA AGENDAR */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">O que você deseja agendar?</h3>
            <div className="space-y-3">
              <button onClick={() => { setServiceType('CONSULTA_MEDICA'); setStep(2); }} className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-[#0A2B2A] flex items-center justify-between transition-all">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center"><Stethoscope className="w-6 h-6"/></div>
                  <div><p className="font-bold text-[#0A2B2A]">Consultas Médicas</p><p className="text-xs text-slate-500">Com especialistas da clínica</p></div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
              
              <button onClick={() => { setServiceType('EXAME_LABORATORIAL'); setStep(2); }} className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-[#0A2B2A] flex items-center justify-between transition-all">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><Activity className="w-6 h-6"/></div>
                  <div><p className="font-bold text-[#0A2B2A]">Exames Laboratoriais</p><p className="text-xs text-slate-500">Check-ups e exames de sangue</p></div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>

              <button onClick={() => { setServiceType('EXAME_IMAGEM'); setStep(2); }} className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-[#0A2B2A] flex items-center justify-between transition-all">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center"><HeartPulse className="w-6 h-6"/></div>
                  <div><p className="font-bold text-[#0A2B2A]">Exames de Imagem</p><p className="text-xs text-slate-500">Ultrassonografias e Raios-X</p></div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 2: ESCOLHER PROFISSIONAL OU EXAME */}
        {step === 2 && serviceType === 'CONSULTA_MEDICA' && (
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Escolha o Médico</h3>
            <div className="space-y-3">
              {(medicos || []).map((med: any) => (
                <button
                  key={med.id}
                  onClick={() => { setMedicoSelecionado(med); setStep(3); }}
                  className="w-full text-left p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:bg-[#FAF8F5]"
                >
                  <div className="flex items-center space-x-3.5">
                    {med.foto_url ? <img src={med.foto_url} alt={med.nome} className="w-12 h-12 rounded-full object-cover"/> : <div className="w-12 h-12 bg-slate-100 rounded-full"/>}
                    <div>
                      <p className="text-sm font-bold text-[#0A2B2A]">{med.nome}</p>
                      <p className="text-xs text-[#C5A880]">{med.especialidade}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && serviceType === 'EXAME_LABORATORIAL' && (
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Escolha o Pacote de Check-up</h3>
            <div className="space-y-3">
              {(checkups || []).map((chk: any) => (
                <button
                  key={chk.id}
                  onClick={() => { setExameSelecionado(chk); setStep(3); }}
                  className="w-full text-left p-4 rounded-2xl border border-slate-200 flex flex-col hover:bg-[#FAF8F5]"
                >
                  <p className="text-sm font-bold text-[#0A2B2A]">{chk.nome}</p>
                  <p className="text-xs text-slate-500 mt-1">{chk.preco}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && serviceType === 'EXAME_IMAGEM' && (
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Escolha o Exame de Imagem</h3>
            <div className="space-y-3">
              {(examesImagem || []).map((ex: any) => (
                <button
                  key={ex.id}
                  onClick={() => { setExameSelecionado(ex); setStep(3); }}
                  className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:bg-[#FAF8F5]"
                >
                  <p className="text-sm font-bold text-[#0A2B2A]">{ex.nome}</p>
                </button>
              ))}
              {(!examesImagem || examesImagem.length === 0) && <p className="text-sm text-slate-400 text-center py-4">Nenhum exame de imagem disponível.</p>}
            </div>
          </div>
        )}

        {/* ETAPA 3: DATA E DADOS PESSOAIS */}
        {step === 3 && (
          <form onSubmit={handleAgendar} className="space-y-6">
            
            {serviceType === 'CONSULTA_MEDICA' && (
              <div>
                <h3 className="text-xs font-extrabold text-slate-700 uppercase mb-2">Selecione o Horário</h3>
                <div className="grid grid-cols-2 gap-2.5 max-h-[200px] overflow-y-auto">
                  {horariosDoMedico.map((hor: any) => (
                    <button
                      key={hor.id} type="button"
                      onClick={() => setHorarioSelecionado(hor)}
                      className={`p-3 rounded-xl border text-center ${horarioSelecionado?.id === hor.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}
                    >
                      <p className="text-xs font-bold text-slate-800">{formatarData(hor.data_hora)}</p>
                      <p className="text-xs text-slate-600">{formatarHora(hor.data_hora)} hs</p>
                    </button>
                  ))}
                  {horariosDoMedico.length === 0 && <p className="text-xs text-slate-500 col-span-2">Nenhum horário disponível.</p>}
                </div>
              </div>
            )}

            {serviceType !== 'CONSULTA_MEDICA' && (
              <div>
                <h3 className="text-xs font-extrabold text-slate-700 uppercase mb-2">Data Preferencial</h3>
                <input
                  type="date"
                  required
                  value={dataPreferencial}
                  onChange={(e) => setDataPreferencial(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-[#0A2B2A]"
                />
                <p className="text-[10px] text-slate-500 mt-1">* A clínica entrará em contato para confirmar o horário exato.</p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase">Seus Dados</h3>
              <div>
                <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Nome Completo *</label>
                <input type="text" required value={nomePaciente} onChange={(e) => setNomePaciente(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none" />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-600 font-bold block mb-1">Celular / WhatsApp *</label>
                <input type="tel" required value={telefone} onChange={handleTelefoneChange} maxLength={15} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none" />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-md">
              {isSubmitting ? 'Aguarde...' : 'Confirmar Agendamento'}
            </button>
          </form>
        )}

        {/* ETAPA 4: SUCESSO E INSTRUÇÕES */}
        {step === 4 && agendamentoSucesso && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#0A2B2A]">Agendamento Concluído!</h2>
            
            <div className="bg-[#FAF8F5]/70 border border-[#C5A880]/30 rounded-2xl p-5 mt-6 text-left text-xs space-y-2">
              <p className="border-b pb-1 font-bold text-slate-700 uppercase">Resumo</p>
              <p><strong>Paciente:</strong> {agendamentoSucesso.nome_paciente}</p>
              <p><strong>Serviço:</strong> {serviceType === 'CONSULTA_MEDICA' ? 'Consulta Médica' : serviceType === 'EXAME_LABORATORIAL' ? 'Exame Laboratorial / Check-up' : 'Exame de Imagem'}</p>
              
              {serviceType === 'CONSULTA_MEDICA' && (
                <>
                  <p><strong>Médico:</strong> {agendamentoSucesso.horario?.medico?.nome}</p>
                  <p><strong>Data & Hora:</strong> {formatarData(agendamentoSucesso.horario?.data_hora)} às {formatarHora(agendamentoSucesso.horario?.data_hora)} hs</p>
                </>
              )}
              
              {serviceType !== 'CONSULTA_MEDICA' && (
                <>
                  <p><strong>Exame Escolhido:</strong> {exameSelecionado?.nome}</p>
                  <p><strong>Data Preferencial:</strong> {formatarData(agendamentoSucesso.data_preferencial)}</p>
                </>
              )}
            </div>

            {(agendamentoSucesso.checkup?.instrucoes_preparo || agendamentoSucesso.exame_imagem?.instrucoes_preparo || exameSelecionado?.instrucoes_preparo) && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mt-4 text-left text-xs space-y-2">
                <p className="font-bold text-blue-800 uppercase flex items-center space-x-1"><AlertCircle className="w-4 h-4"/> <span>Instruções de Preparo</span></p>
                <p className="text-blue-900 leading-relaxed">
                  {agendamentoSucesso.checkup?.instrucoes_preparo || agendamentoSucesso.exame_imagem?.instrucoes_preparo || exameSelecionado?.instrucoes_preparo}
                </p>
              </div>
            )}

            <a
              href={getWhatsAppLink('5588996248427', `Olá! Gostaria de confirmar meu agendamento de ${serviceType === 'CONSULTA_MEDICA' ? 'Consulta' : 'Exame'}. Nome: ${agendamentoSucesso.nome_paciente}`)}
              target="_blank" rel="noopener noreferrer"
              className="mt-6 w-full bg-emerald-500 text-white py-3 px-6 rounded-xl font-bold text-xs flex justify-center items-center space-x-2"
            >
              <MessageCircle className="w-5 h-5" /> <span>Confirmar pelo WhatsApp</span>
            </a>
            
            <button onClick={() => navigate('/')} className="mt-3 w-full bg-[#0A2B2A] text-[#FAF8F5] py-3 rounded-xl font-bold text-xs">
              Voltar para Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
