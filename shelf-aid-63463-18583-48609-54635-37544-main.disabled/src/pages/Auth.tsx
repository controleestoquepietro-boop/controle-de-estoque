import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import logo from '@/assets/logo-prieto.png';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const success = await login(email, senha);
        if (success) {
          toast.success('Login realizado com sucesso!');
          navigate('/');
        } else {
          toast.error('Email ou senha incorretos');
        }
      } else {
        if (!nome.trim()) {
          toast.error('Por favor, preencha seu nome');
          setLoading(false);
          return;
        }
        const success = await register(nome, email, senha);
        if (success) {
          toast.success('Cadastro realizado com sucesso!');
          navigate('/');
        } else {
          toast.error('Este email já está cadastrado');
        }
      }
    } catch (error) {
      toast.error('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <img src={logo} alt="Logo Prieto" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl">
            {isLogin ? 'Entrar no Sistema' : 'Criar Conta'}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? 'Entre com suas credenciais para acessar o sistema'
              : 'Crie sua conta para começar a usar o sistema'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Usuário</Label>
                <Input
                  id="nome"
                  type="text"
                  placeholder="Seu nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail de Login</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Registrar'}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline"
              >
                {isLogin
                  ? 'Não tem conta? Registre-se'
                  : 'Já tem conta? Faça login'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
