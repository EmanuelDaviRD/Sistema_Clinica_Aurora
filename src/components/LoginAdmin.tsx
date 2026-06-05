import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Lock, Mail, AlertCircle } from 'lucide-react';

interface LoginResponse {
  token: string;
  admin: {
    id: number;
    email: string;
  };
}

export const LoginAdmin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      let data: any;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      if (!response.ok) {
        throw new Error(data.message || 'Falha na autenticação do administrador.');
      }

      // Salva com segurança o token jwt e o identificador do administrador no localStorage
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.admin));

      // Redireciona para o painel de controle
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error('Erro de login:', err);
      setError(err.message || 'Ocorreu um erro ao conectar com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4 font-sans" id="login-admin-view">
      <div className="w-full max-w-md bg-white border border-[#C5A880]/20 rounded-2xl shadow-xl overflow-hidden p-8">
        
        {/* Cabeçalho de Segurança */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#0A2B2A]/5 text-[#0A2B2A] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#0A2B2A] tracking-tight">Área Administrativa</h2>
          <p className="text-xs text-slate-500 mt-1">Insira suas credenciais para gerenciar a clínica</p>
        </div>

        {/* Feedback de Erro */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start space-x-3 text-red-700 text-xs" id="login-err-banner">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Erro de Acesso</p>
              <p className="mt-0.5 opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">E-mail Corporativo</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.nome@clinica.com"
                className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#0A2B2A] focus:bg-white text-slate-900 rounded-xl pl-10 pr-4 py-3 text-xs outline-none transition-all focus:ring-2 focus:ring-[#0A2B2A]/10"
                id="admin-login-email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Senha Secreta</label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#0A2B2A] focus:bg-white text-slate-900 rounded-xl pl-10 pr-4 py-3 text-xs outline-none transition-all focus:ring-2 focus:ring-[#0A2B2A]/10"
                id="admin-login-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#0A2B2A] hover:bg-[#134241] disabled:bg-slate-400 text-[#FAF8F5] py-3 px-4 rounded-xl text-xs font-bold transition-all transform active:scale-98 flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/10"
            id="admin-login-submit"
          >
            {isLoading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Rodapé informativo */}
        <div className="mt-6 text-center border-t border-slate-100 pt-5">
          <p className="text-[10px] text-slate-400 font-mono">Espaço Reabilitar • Conexão PostgreSQL Ativa</p>
          <button
            onClick={() => navigate('/')}
            className="text-[10px] font-bold text-[#0A2B2A]/70 hover:text-[#0A2B2A] underline transition-all mt-3 block mx-auto"
          >
            Voltar para o Site Principal
          </button>
        </div>

      </div>
    </div>
  );
};
