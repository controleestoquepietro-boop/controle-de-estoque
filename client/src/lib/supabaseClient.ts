import { createClient } from '@supabase/supabase-js';

// Tenta obter as variáveis de ambiente do Vite ou usa fallback
const getEnvVar = (key: string) => {
  // Em desenvolvimento, usa as variáveis do Vite (via .env.local)
  if (import.meta.env[`VITE_${key}`]) {
    return import.meta.env[`VITE_${key}`];
  }
  
  // Valores de fallback - Credenciais corretas do projeto Supabase
  const fallbackValues: Record<string, string> = {
    SUPABASE_URL: 'https://xppfzlscfkrhocmkdjsn.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwcGZ6bHNjZmtyaG9jbWtkanNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTQ1MzgsImV4cCI6MjA3NzE3MDUzOH0.SQ8Do7KEAbW-E4trrANOtFPbwgt9vJD5npTH32nw1Lg'
  };
  
  return fallbackValues[key];
};

const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Credenciais do Supabase não encontradas!');
}

// Usar localStorage (padrão de navegadores) para persistência de sessão
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // força persistência da sessão (usa localStorage no navegador)
    persistSession: true,
    // storage padrão do navegador (localStorage)
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
