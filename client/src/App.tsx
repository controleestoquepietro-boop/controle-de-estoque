import { useEffect, useState } from "react";
import { Toaster } from "./components/ui/toaster";
import ErrorBoundary from './components/error-boundary';
import NotFound from "./pages/not-found";
import Login from "./pages/login";
import Register from "./pages/register";
import Dashboard from "./pages/dashboard";
import ResetPassword from "./pages/reset-password";
import ForgotPassword from "./pages/forgot-password";
import Produtos from './pages/produtos';
import { AuthGuard } from "./components/auth-guard";

function SimpleHashRouter() {
  const normalizeHash = (rawHash: string) => {
    const h = (rawHash || '').replace('#', '');
    if (!h) return '#/';
    // Já está no formato /route
    if (h.startsWith('/')) return `#${h}`;
    // Caso comum do Supabase: hash começa com access_token=...&type=recovery
    if (h.includes('access_token=') || h.includes('type=recovery') || h.includes('refresh_token=')) {
      return `#/reset-password?${h}`;
    }
    // Se veio como reset-password?... sem slash, normalizar
    if (h.startsWith('reset-password')) {
      return `#/` + h;
    }
    // fallback: garantir slash
    return `#/${h}`;
  };

  // Iniciar com '/' para evitar leitura de `window` durante SSR.
  const [path, setPath] = useState<string>('/');

  useEffect(() => {
    // Determinar rota inicial a partir do hash (apenas no cliente).
    const rawHash = (typeof window !== 'undefined') ? window.location.hash : '';
    const initialRaw = normalizeHash(rawHash).replace('#', '') || '/';
    setPath(initialRaw.split('?')[0]);

    const onHash = () => {
      const raw = window.location.hash || '';
      const normalized = normalizeHash(raw);
      if (normalized !== raw) {
        // Atualiza o hash para o formato normalizado (isso disparará outro hashchange)
        window.location.hash = normalized;
        // também atualizar o path imediatamente para evitar piscar
        setPath(normalized.replace('#', '').split('?')[0]);
        return;
      }
      const newPath = ((raw || '').replace('#', '') || '/').split('?')[0];
      setPath(newPath);
    };

    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rotas públicas (usar startsWith para tolerar querystrings e variações)
  if (path === "/" || path.startsWith("/login")) return <Login />;
  if (path.startsWith("/register")) return <Register />;
  if (path.startsWith("/forgot-password")) return <ForgotPassword />;
  if (path.startsWith("/reset-password")) return <ResetPassword />;

  // Rotas protegidas - envoltas pelo AuthGuard
  if (path.startsWith("/dashboard")) return <AuthGuard><Dashboard /></AuthGuard>;
  if (path.startsWith("/produtos")) return <AuthGuard><Produtos /></AuthGuard>;

  return <NotFound />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <SimpleHashRouter />
      <Toaster />
    </ErrorBoundary>
  );
}
