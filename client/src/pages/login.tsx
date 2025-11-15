import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Eye, EyeOff } from 'lucide-react';
import { loginSchema, insertUserSchema, type LoginData, type InsertUser } from '@shared/schema';
import logoPrieto from '@assets/LOGO-PRIETO_1761688931089.png';

export default function Login() {
  // Not using wouter Router in production build; use hash navigation helper
  const setLocation = (to: string) => {
    // Remove o # se existir e adiciona novamente para garantir consistência
    to = to.replace(/^#/, '');
    window.location.hash = `#${to}`;
  };
  const { toast } = useToast();
  const [showRegisterLinkOnly] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // registerForm removed: registration has a dedicated page at #/register

  // Navegar para a página de recuperação de senha
  const handleForgotPassword = () => {
  setLocation('/forgot-password');
  };

  // 🔹 Login via Supabase
  const handleLogin = async (data: LoginData) => {
    try {
      console.log('Tentando login com:', data.email); // Debug log

      // Primeiro, tentar autenticar diretamente com o Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        console.error('Erro na autenticação Supabase:', authError);
        throw authError;
      }

      // Verificar se o e-mail do usuário foi confirmado no Supabase
      const remoteUser = authData?.user;
      const confirmed = remoteUser && (remoteUser.email_confirmed_at || remoteUser.confirmed_at || remoteUser.confirmed);
      if (!confirmed) {
        // Forçar sign-out local para evitar sessão pendente no cliente
        try { await supabase.auth.signOut(); } catch (_) {}
        toast({ title: 'Confirme seu e-mail', description: 'Conta não confirmada. Verifique sua caixa de entrada e confirme seu e-mail antes de acessar o sistema.', variant: 'destructive' });
        return;
      }

      if (authData?.user) {
        console.log('Login Supabase bem sucedido, sincronizando com servidor...'); // Debug log

        // Tenta sincronizar com o servidor para criar a sessão. Em builds empacotados
        // sem o servidor interno esse endpoint pode não existir (fetch falhará com
        // ERR_FILE_NOT_FOUND). Capturamos esse erro e seguimos sem bloquear o fluxo
        // — o usuário já está autenticado no Supabase.
        try {
          await apiRequest('POST', '/api/auth/login', { email: data.email, password: data.password });
          // Invalida queries apenas se a sincronização com o servidor tiver ocorrido
          await queryClient.invalidateQueries();
          await queryClient.invalidateQueries({ queryKey: ['auth/session'] });
        } catch (syncErr) {
          console.warn('Falha ao sincronizar com o servidor interno (ignorado):', syncErr);
          // Continua mesmo se o servidor interno não existir
        }

          toast({ title: 'Sucesso', description: 'Login realizado com sucesso!' });

          // Usar window.location.href para forçar recarregamento completo
          window.location.href = '#/dashboard';
          window.location.reload();
      } else {
        throw new Error('Falha na autenticação');
      }
    } catch (error: any) {
      console.error('Erro de login:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Email ou senha incorretos',
        variant: 'destructive',
      });
    }
  };

  // 🔹 Registro via backend (session cookie)
  const handleRegister = async (data: InsertUser) => {
    try {
      try {
        await apiRequest('POST', '/api/auth/register', data);
      } catch (syncErr) {
        console.warn('Falha ao comunicar-se com o servidor interno durante registro (ignorado):', syncErr);
        // Continua — em ambientes empacotados o servidor interno pode não existir
      }

      toast({
        title: 'Sucesso',
        description: 'Cadastro realizado com sucesso. Verifique seu e-mail (incluindo a caixa de spam) para confirmar sua conta. Após confirmar, volte e efetue o login.',
      });
      setLocation('/login');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao registrar usuário',
        variant: 'destructive',
      });
    }
  };

  // Interface já está mais enxuta com página dedicada para recuperação de senha

  // 🔹 Tela de login / registro
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <img src={logoPrieto} alt="Prieto" className="h-20 mx-auto mb-2" />
          <CardTitle>Entrar no Sistema</CardTitle>
          <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={loginForm.handleSubmit(handleLogin)}
            className="space-y-4"
          >
            <div>
              <Label>Email</Label>
              <Input type="email" {...loginForm.register('email')} placeholder="seu@email.com" />
            </div>
            <div>
              <Label>Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  {...loginForm.register('password')}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-primary hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>

            <Button type="submit" className="w-full">
              Entrar
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setLocation('/register')}
                className="text-primary hover:underline"
              >
                Não tem conta? Registre-se
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
