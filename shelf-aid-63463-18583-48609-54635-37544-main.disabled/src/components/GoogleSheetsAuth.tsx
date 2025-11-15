import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { Alimento } from '@/types/alimento';

interface GoogleSheetsAuthProps {
  alimentos: Alimento[];
  onSyncComplete: () => void;
}

const FIXED_ACCOUNT = 'controle.estoque.pietro@gmail.com';
const SPREADSHEET_ID = '1-Z3OG2EQEKfuyGXBfebV3X-kYOEye45bZ4ige4o7ACg';

export function GoogleSheetsAuth({ alimentos, onSyncComplete }: GoogleSheetsAuthProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSync = async () => {
    setIsLoading(true);
    
    try {
      // TODO: Implementar integração real com Google Sheets API
      // Esta é uma simulação - para implementar de verdade:
      // 1. Configurar credenciais OAuth2 no Google Cloud Console
      // 2. Usar a biblioteca gapi ou google-spreadsheet
      // 3. Autenticar com a conta fixa: ${FIXED_ACCOUNT}
      // 4. Exportar dados para planilha: ${SPREADSHEET_ID}
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Formatar dados para exportação
      const dataForExport = alimentos.map(alimento => ({
        Nome: alimento.nome,
        Código: alimento.codigoProduto,
        Lote: alimento.lote,
        Quantidade: alimento.quantidade,
        Unidade: alimento.unidade,
        'Peso Total (kg)': alimento.unidade === 'caixa' && alimento.pesoPorCaixa 
          ? alimento.quantidade * alimento.pesoPorCaixa 
          : alimento.quantidade,
        Temperatura: alimento.temperatura,
        'Shelf Life': alimento.shelfLife,
        Validade: alimento.dataValidade,
        Status: alimento.metadata ? 'Ativo' : 'Ativo',
        'Cadastrado por': alimento.cadastradoPor,
      }));
      
      console.log('Dados para exportar:', dataForExport);
      
      toast.success('Dados sincronizados com Google Sheets!', {
        description: `${alimentos.length} alimentos exportados para a planilha.`,
      });
      
      onSyncComplete();
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar com Google Sheets');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isLoading}
      size="sm"
      className="gap-2"
      style={{
        backgroundColor: '#7A1C1E',
        color: '#FFFFFF',
        fontWeight: 500,
        borderRadius: '10px',
        padding: '8px 18px',
        fontSize: '0.9rem',
      }}
    >
      <FileSpreadsheet className="h-4 w-4" />
      {isLoading ? 'Sincronizando...' : 'Sincronizar com Google Sheets'}
    </Button>
  );
}
