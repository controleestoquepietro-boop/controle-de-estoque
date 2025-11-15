import { QueryClient, QueryFunctionContext } from "@tanstack/react-query";
import { supabase } from './supabaseClient';

// Função auxiliar para verificar a autenticação via Supabase client
export async function checkAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

// Função auxiliar para fazer requests. Retorna o corpo JSON (ou dados do supabase)
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  try {
    // Se a URL for uma rota de API interna (/api/...) devemos encaminhar
    // a requisição ao servidor Express (para preservar cookies/sessões).
    if (url.startsWith('/api/')) {
      const opts: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        // usar 'include' para garantir que cookies sejam enviados
        // (persistência de sessão entre frontend e backend)
        credentials: 'include',
      };

      if (method.toUpperCase() !== 'GET' && typeof data !== 'undefined') {
        opts.body = JSON.stringify(data);
      }

      const res = await fetch(url, opts);
      // Se não OK, tentar extrair mensagem do corpo e lançar erro
      if (!res.ok) {
        let bodyText = '';
        try {
          const json = await res.json();
          bodyText = json?.message || JSON.stringify(json);
        } catch (_) {
          bodyText = await res.text();
        }
        const err = new Error(bodyText || `HTTP ${res.status} ${res.statusText}`);
        (err as any).status = res.status;
        throw err;
      }

      // Retornar o JSON do backend (parsed)
      try {
        return await res.json();
      } catch (_) {
        return null;
      }
    }

    // Caso não seja uma rota /api/* tratamos como operação direta no Supabase
    // Remove o prefixo e pega o recurso (nome da tabela)
    const resource = url.replace(/^\/*/, '').split('/').pop() || '';

    switch (method.toUpperCase()) {
      case 'GET': {
        const { data: getData, error: getError } = await supabase
          .from(resource)
          .select('*');
        if (getError) throw getError;
        return getData;
      }

      default:
        throw new Error(`Método ${method} não suportado para recurso direto: ${method}`);
    }
  } catch (error: any) {
    console.error('Erro na requisição:', error);
    throw error;
  }
}

// Default queryFn usado quando useQuery é chamado apenas com queryKey
export const defaultQueryFn = async ({ queryKey }: QueryFunctionContext) => {
  let url = (queryKey as any)[0];
  if (typeof url !== 'string') throw new Error('Invalid queryKey for defaultQueryFn');
  
  // Se a queryKey tem mais elementos, eles podem ser parâmetros (ex: ['/api/modelos-produtos', codigo])
  // Construir URL dinamicamente
  if (queryKey.length > 1) {
    const params = queryKey.slice(1);
    // Adicionar parâmetros à URL (simples concatenação para URLs como /api/modelos-produtos/:codigo)
    for (const param of params) {
      if (param) {
        url = url.endsWith('/') ? url + param : url + '/' + param;
      }
    }
  }
  
  // assumimos GET para queries de leitura
  return await apiRequest('GET', url);
};

// Configure o queryClient com as opções padrão e defaultQueryFn
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 segundos
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
