import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logoPrieto from '@assets/LOGO-PRIETO_1761688931089.png';

type RegisterState = 'form' | 'success' | 'email-exists';

export default function Register() {
  const { toast, dismiss } = useToast();
  const [state, setState] = useState<RegisterState>('form');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  // Form state
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Verificar confirmação de email a cada 3 segundos quando estiver no estado 'success'
  
  // Debug: log de render e estado do formulário para diagnosticar campo extra
  useEffect(() => {
    try {
      // Evitar poluir em produção — esse log ajuda a localizar renderizações inesperadas
      console.debug('Register render', {
        state,
        nome,
        email,
        password: password ? '***' : '',
        registeredEmail,
        isChecking,
      });
    } catch (_) {}
  }, [state, nome, email, password, registeredEmail, isChecking]);

  useEffect(() => {
    if (state !== 'success' || !registeredEmail) return;

    const checkEmailConfirmation = async () => {
      try {
        setIsChecking(true);
        const result = await apiRequest('POST', '/api/auth/check-email', { email: registeredEmail });

        if (result?.confirmed) {
          console.log('✅ Email confirmado, redirecionando para login...');
          setIsChecking(false);
          // fechar qualquer toast pendente antes do redirecionamento
          try { dismiss(); } catch (_) {}
          // Aguardar 2 segundos para o usuário ler a mensagem
          await new Promise((r) => setTimeout(r, 2000));
          window.location.hash = '#/login';
        } else {
          setIsChecking(false);
        }
      } catch (e) {
        console.warn('Erro ao verificar confirmação:', e);
        setIsChecking(false);
      }
    };

    // Verificar imediatamente
    checkEmailConfirmation();
    // E depois a cada 3 segundos
    const interval = setInterval(checkEmailConfirmation, 3000);
    return () => clearInterval(interval);
  }, [state, registeredEmail]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiRequest('POST', '/api/auth/register', { nome, email, password });
      // Sucesso: mostrar tela de "Sucesso!"
      setRegisteredEmail(email);
      setState('success');
      toast({ title: 'Cadastro realizado com sucesso' });
    } catch (err: any) {
      const errorMessage = err?.message || String(err);

      // Se for "Email já cadastrado", mostrar tela especial
      if (errorMessage.toLowerCase().includes('já cadastrado')) {
        setRegisteredEmail(email);
        setState('email-exists');
        toast({
          title: 'Email já cadastrado',
          description: 'Este email já possui uma conta registrada.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao cadastrar',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    }

    setLoading(false);
  };

  // ✅ TELA: Email já cadastrado
  if (state === 'email-exists') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
        <Card className="w-full max-w-md shadow-lg rounded-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logoPrieto} alt="Prieto" className="h-16 w-auto" />
            </div>
            <CardTitle>Email já cadastrado</CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-6">
            <p className="text-center text-sm text-muted-foreground mb-4">
              Este email já possui uma conta registrada. Faça login para acessar sua conta.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => (window.location.hash = '#/login')}
                className="w-full"
              >
                Ir para o Login
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setState('form');
                  setNome('');
                  setEmail('');
                  setPassword('');
                }}
              >
                Voltar para o Registro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ TELA: Sucesso (aguardando confirmação de email)
  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
        <Card className="w-full max-w-md shadow-lg rounded-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logoPrieto} alt="Prieto" className="h-16 w-auto" />
            </div>
            <CardTitle>Sucesso!</CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-6 text-center space-y-4">
            <p className="text-sm font-medium text-foreground">Cadastro realizado com sucesso.</p>
            <p className="text-xs text-muted-foreground">
              Verifique seu e-mail <strong>{registeredEmail}</strong> (inclusive a caixa de spam) para confirmar sua conta.
            </p>
            <div className="bg-white border border-emerald-100 rounded-lg p-4 space-y-3 mt-6 shadow-sm">
              <p className="text-xs text-emerald-800">
                {isChecking ? '🔄 Verificando confirmação...' : '⏳ Aguardando confirmação do email...'}
              </p>
              <p className="text-xs text-muted-foreground">Você será redirecionado para o login automaticamente.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ TELA: Formulário de Registro
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
      <Card className="w-full max-w-md shadow-lg rounded-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoPrieto} alt="Prieto" className="h-16 w-auto" />
          </div>
          <CardTitle>Criar Conta</CardTitle>
          <CardDescription>Preencha os dados abaixo para se registrar</CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-6">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Digite seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Cadastrando...' : 'Registrar'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => (window.location.hash = '#/login')}
            >
              Já tem conta? Faça login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
