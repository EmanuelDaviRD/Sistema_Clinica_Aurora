import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar configuradas no seu .env.
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn("Aviso: SUPABASE_URL ou SUPABASE_SERVICE_KEY não estão definidas.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
