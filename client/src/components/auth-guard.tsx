import { useQuery } from "@tanstack/react-query";
import { PropsWithChildren } from "react";
import { supabase } from "@/lib/supabaseClient";
import Login from "@/pages/login";

export function AuthGuard({ children }: PropsWithChildren) {
  console.log('AuthGuard renderizando...'); // Debug log
  
  const isAuthenticated = useQuery({
    queryKey: ['auth/session'],
    queryFn: async () => {
      console.log('Verificando sessão...'); // Debug log
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Resultado da sessão:', session, error); // Debug log
      if (error) throw error;
      return session;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  if (isAuthenticated.isLoading) {
    console.log('AuthGuard: Carregando...'); // Debug log
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated.data) {
    console.log('AuthGuard: Não autenticado!'); // Debug log
    // Usar um estado local para evitar loop de renderização
    if (window.location.hash !== '#/login') {
      console.log('Redirecionando para login...'); // Debug log
      window.location.hash = '#/login';
    }
    return <Login />;
  }

  console.log('AuthGuard: Autenticado, renderizando children'); // Debug log

  return <>{children}</>;
}