import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { supabase } from '@/lib/supabaseClient';
import logoPrieto from '@assets/LOGO-PRIETO_1761688931089.png';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState<boolean | null>(null);
  const [verified, setVerified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // limpar estado anterior para evitar mostrar botão residual
    setResetLink(null);
    setVerified(false);
    setIsLoading(true);

    try {
      const check = await apiRequest('POST', '/api/auth/check-email', { email });
      setEmailExists(!!check.exists);
      setEmailConfirmed(!!check.confirmed);

      if (!check.exists) {
        // garantir que não haja botão visível a partir de verificações anteriores
        setResetLink(null);
        setVerified(false);
        toast({ title: 'Usuário não autenticado', description: 'Usuário não cadastrado. Procure o administrador.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      if (!check.confirmed) {
        setResetLink(null);
        setVerified(false);
        toast({ title: 'Email não confirmado', description: 'Este email ainda não foi confirmado. Verifique sua caixa de entrada.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Tentar gerar resetUrl no servidor (apenas para desenvolvimento/testes).
      try {
        const response = await apiRequest('POST', '/api/auth/forgot-password', { email });
        if (response && response.resetUrl) setResetLink(response.resetUrl);
      } catch (genErr) {
        console.warn('Não foi possível gerar resetUrl no servidor:', genErr);
      }

      setVerified(true);
    } catch (error: any) {
      console.error('Erro ao verificar email:', error);
      toast({ title: 'Erro', description: error.message || 'Erro ao verificar email', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
      <Card className="w-full max-w-md shadow-lg rounded-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoPrieto} alt="Prieto" className="h-16 w-auto" data-testid="img-logo" />
          </div>
          <CardTitle>Recuperar Senha</CardTitle>
          <CardDescription>
            Digite seu email abaixo para verificar e liberar o botão de redefinição.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="input-email"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-recover"
            >
              {isLoading ? 'Verificando...' : 'Verificar Email'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => (window.location.hash = '#/login')}
              data-testid="button-back"
            >
              Voltar para o Login
            </Button>
          </form>

          {verified && resetLink && (
            <div className="bg-white border border-emerald-100 rounded-lg p-4 space-y-3 mt-4 shadow-sm">
              <div className="flex items-start gap-2">
                <div className="text-emerald-700 mt-0.5">🔧</div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Verificação concluída</p>
                  <p className="text-xs text-emerald-800">Link de redefinição disponível. Clique para abrir.</p>
                </div>
              </div>
              <div className="mt-2">
                <Button
                  onClick={() => { window.location.href = resetLink as string; }}
                  data-testid="reset-button"
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Ir para a redefinição de senha
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}