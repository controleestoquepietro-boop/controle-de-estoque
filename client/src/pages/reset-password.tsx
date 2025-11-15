import { useState, useEffect } from 'react';
// usar navegação via hash para compatibilidade com SimpleHashRouter
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import logoPrieto from '@assets/LOGO-PRIETO_1761688931089.png';
import { supabase } from '@/lib/supabaseClient';
import { apiRequest } from '@/lib/queryClient';

export default function ResetPassword() {
  const setLocation = (to: string) => {
    if (!to.startsWith('#')) to = `#${to}`;
    window.location.hash = to;
  };
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    // Se houver token na hash (ex: #reset-password?token=...), usaremos
    // o fluxo por token. Caso contrário, tentamos validar sessão Supabase
    const hash = (window.location.hash || '').replace('#', '');
    const [, query] = hash.split('?');
    const params = new URLSearchParams(query || '');
    const token = params.get('token');

    if (token) {
      setToken(token);
      setIsValidSession(true);
      return;
    }

    // Fallback: verificar sessão Supabase (fluxo gerado pelo Supabase)
    const checkSession = async () => {
      // Também aceitar token enviado pelo Supabase como query string (ex: ?access_token=...&type=recovery)
      const searchParams = new URLSearchParams(window.location.search || '');
      const accessToken = searchParams.get('access_token') || searchParams.get('token');
      if (accessToken) {
        // Em alguns fluxos o Supabase redireciona com access_token; podemos tentar criar sessão local
        try {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: '' } as any);
          setIsValidSession(true);
          return;
        } catch (e) {
          console.warn('Falha ao definir sessão a partir de access_token:', e);
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsValidSession(false);
        toast({ title: 'Link inválido', description: 'O link de recuperação é inválido ou expirou. Por favor, solicite um novo link.', variant: 'destructive' });
        setTimeout(() => setLocation('/login'), 3000);
        return;
      }
      setIsValidSession(true);
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidSession) {
      toast({
        title: 'Erro',
        description: 'Sessão inválida. Por favor, solicite um novo link de recuperação.',
        variant: 'destructive',
      });
  setLocation('/login');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (token) {
        // Fluxo via token: chamar endpoint do servidor
        await apiRequest('POST', '/api/auth/reset-password', { token, newPassword });
        setIsSuccess(true);
        toast({ title: 'Senha alterada!', description: 'Sua senha foi alterada com sucesso.' });
        setTimeout(() => setLocation('/login'), 3000);
        return;
      }

      // Fluxo Supabase: atualizar senha usando sessão atual
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setIsSuccess(true);
      toast({ title: 'Senha alterada!', description: 'Sua senha foi alterada com sucesso.' });
      await supabase.auth.signOut();
      setTimeout(() => setLocation('/login'), 3000);
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      toast({ title: 'Erro', description: error.message || 'Erro ao redefinir senha', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logoPrieto} alt="Prieto" className="h-16 w-auto" />
            </div>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle>Senha Redefinida!</CardTitle>
            <CardDescription>
              Sua senha foi redefinida com sucesso. Você será redirecionado para a página de login.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoPrieto} alt="Prieto" className="h-16 w-auto" data-testid="img-logo" />
          </div>
          <CardTitle>Redefinir Senha</CardTitle>
          <CardDescription>
            Digite sua nova senha abaixo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <div className="relative">
                <Input
                  id="newPassword"
                  data-testid="input-new-password"
                  type={showNew ? 'text' : 'password'}
                  placeholder="Digite sua nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  aria-label={showNew ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1"
                  onClick={() => setShowNew((s) => !s)}
                >
                  {showNew ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <div className="relative">
                <Input
                  id="confirmPassword"
                  data-testid="input-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirme sua nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1"
                  onClick={() => setShowConfirm((s) => !s)}
                >
                  {showConfirm ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                </button>
                </div>
              </div>
            </div>

            <Button
              data-testid="button-reset-password"
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Redefinindo...' : 'Redefinir Senha'}
            </Button>

            <Button
              data-testid="button-back-to-login"
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setLocation('/login')}
            >
              Voltar para o login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
