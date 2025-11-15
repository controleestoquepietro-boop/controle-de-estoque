import { createClient } from '@supabase/supabase-js';

// Tenta obter as variáveis de ambiente do Vite ou usa fallback
const getEnvVar = (key: string) => {
  // Em desenvolvimento, usa as variáveis do Vite (via .env.local)
  if (import.meta.env[`VITE_${key}`]) {
    return import.meta.env[`VITE_${key}`];
  }
  
  // Valores de fallback (redundância para desenvolvimento sem .env)
  const fallbackValues: Record<string, string> = {
    SUPABASE_URL: 'https://qlfxvogcgcyiohjcfykq.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZnh2b2djZ2N5aW9oamNmeWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI5MzYxNjQsImV4cCI6MjAxODUxMjE2NH0.OsVVrnMkxhLLsZVw1CGK5YQz5SM5jhmCEj3jgOXd8VU'
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
