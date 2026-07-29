import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar configuradas no seu .env.
const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzabcdefgh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'public-anon-key';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.warn("Aviso: SUPABASE_URL ou SUPABASE_SERVICE_KEY não estão definidas. Usando fallback stub.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
  