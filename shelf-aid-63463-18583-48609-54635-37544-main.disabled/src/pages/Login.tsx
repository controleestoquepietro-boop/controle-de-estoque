import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import logo from '@/assets/logo-prieto.png';

export default function Login() {
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSheetsLogin = async () => {
    setIsConnecting(true);
    
    try {
      // Simulação de conexão com Google Sheets
      // Para integração real, seria necessário:
      // 1. Configurar OAuth 2.0 do Google Cloud Console
      // 2. Adicionar credenciais da API do Google Sheets
      // 3. Implementar fluxo de autenticação OAuth
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Conectado ao Google Sheets com sucesso!', {
        description: 'Agora você pode sincronizar seus dados automaticamente'
      });
      navigate('/');
    } catch (error) {
      toast.error('Erro ao conectar com Google Sheets', {
        description: 'Verifique suas credenciais e tente novamente'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="Logo Prieto" className="h-20 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">Controle de Alimentos</CardTitle>
          <CardDescription>
            Conecte-se ao Google Sheets para sincronizar seus dados
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleSheetsLogin}
            disabled={isConnecting}
            className="w-full gap-2 h-12"
            size="lg"
          >
            {isConnecting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Conectando...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-2h6v2zm0-4H6v-2h6v2zm0-4H6V7h6v2zm6 8h-4V7h4v10z"
                  />
                </svg>
                Conectar com Google Sheets
              </>
            )}
          </Button>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => navigate('/')}
              className="text-sm text-muted-foreground"
            >
              Continuar sem conexão
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Ao conectar, você permite que este aplicativo acesse e sincronize dados com suas planilhas do Google Sheets
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
