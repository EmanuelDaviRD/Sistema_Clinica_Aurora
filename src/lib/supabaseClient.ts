import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar configuradas no seu .env.
let supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

const isValidSupabaseUrl = (url: string) => {
  return url.startsWith('http://') || url.startsWith('https://');
};

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Aviso: SUPABASE_URL ou SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY não estão definidas. Cliente Supabase não inicializado.'
  );
}

if (supabaseUrl.includes('/rest/v1')) {
  console.warn('Aviso: SUPABASE_URL não deve incluir o caminho /rest/v1; será usado apenas o domínio base do projeto Supabase.');
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '');
}

if (supabaseUrl && !isValidSupabaseUrl(supabaseUrl)) {
  console.warn('Aviso: SUPABASE_URL não é uma URL válida. Verifique o valor em suas variáveis de ambiente.');
}

let supabase: any = null;

try {
  if (supabaseUrl && supabaseKey && isValidSupabaseUrl(supabaseUrl)) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (error: any) {
  console.warn('Aviso: Erro ao inicializar cliente Supabase:', error.message);
}

export { supabase };