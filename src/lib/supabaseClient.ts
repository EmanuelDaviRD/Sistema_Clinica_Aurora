import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar configuradas no seu .env.
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase: any = null;

// Lazy initialization para evitar erro no startup se variáveis não estão configuradas
try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  } else {
    console.warn("Aviso: SUPABASE_URL ou SUPABASE_SERVICE_KEY não estão definidas. Cliente Supabase não inicializado.");
  }
} catch (error: any) {
  console.warn("Aviso: Erro ao inicializar cliente Supabase:", error.message);
}

export { supabase };
