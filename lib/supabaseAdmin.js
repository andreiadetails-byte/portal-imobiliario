import { createClient } from '@supabase/supabase-js';

// ATENÇÃO: este ficheiro usa a service_role key, que tem acesso total à base de dados.
// Só pode ser usado em código que corre no servidor (API routes), NUNCA em componentes 'use client'.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
