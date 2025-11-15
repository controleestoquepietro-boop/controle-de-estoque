import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import * as XLSX from 'xlsx';
import type { InsertAlimento } from '@shared/schema';

interface ImportExcelDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ImportExcelDialog({ open, onClose }: ImportExcelDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [processedData, setProcessedData] = useState<InsertAlimento[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const importMutation = useMutation({
    mutationFn: async (alimentos: InsertAlimento[]) => {
      const result = await apiRequest('POST', '/api/alimentos/import', { alimentos });
      return result;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['alimentos'] });

      if (data.errors && data.errors.length > 0) {
        setErrors(data.errors);
        toast({
          title: 'Importação com avisos',
          description: `${data.imported || 0} importados, ${data.errors.length} linhas com problemas.`,
          variant: 'default',
        });
        // manter o modal aberto para que o usuário veja os erros
        return;
      }

      toast({
        title: 'Importação concluída',
        description: `${data.imported || 0} alimentos importados com sucesso!`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro na importação',
        description: error.message || 'Erro ao importar alimentos',
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Validar e processar dados
      const processedDataLocal: InsertAlimento[] = [];
      const validationErrors: string[] = [];

      jsonData.forEach((row: any, index: number) => {
        try {
          // Extrair código do produto (múltiplas variações de nomes de coluna)
          let codigoProduto = String(
            row['Código Produto'] || 
            row['codigoProduto'] || 
            row['Código'] || 
            row['código'] || 
            row['Z06_COD'] || 
            row['Codigo'] || 
            row['CODIGO'] || 
            row['SKU'] || 
            row['sku'] ||
            row['Prod_Code'] ||
            row['PROD_CODE'] ||
            ''
          ).trim();
          
          // Extrair nome/descrição do produto
          let nome = String(
            row['Nome'] || 
            row['nome'] || 
            row['Descrição'] || 
            row['descrição'] || 
            row['DESCRIÇÃO'] ||
            row['Descricao'] ||
            row['DESCRICAO'] || 
            row['Z06_DESC'] || 
            row['Desc'] ||
            row['DESC'] ||
            row['Product Name'] ||
            row['PRODUCT_NAME'] ||
            row['Produto'] ||
            row['PRODUTO'] ||
            ''
          ).trim();
          
          // Extrair temperatura
          let temperatura = String(
            row['Temperatura'] || 
            row['temperatura'] || 
            row['TEMPERATURA'] ||
            row['Temp'] ||
            row['TEMP'] ||
            row['Z06_ARMA'] || 
            row['Armazenamento'] ||
            row['ARMAZENAMENTO'] ||
            row['Storage'] ||
            row['STORAGE'] ||
            ''
          ).trim();
          
          // Extrair lote
          let lote = String(
            row['Lote'] || 
            row['lote'] || 
            row['LOTE'] ||
            row['Batch'] ||
            row['BATCH'] ||
            row['Lot'] ||
            row['LOT'] ||
            row['Z06_LOTE'] ||
            'LOTE-01'
          ).trim();
          
          let dataFabricacao = row['Data Fabricação'] || row['dataFabricacao'] || row['Data Fabricacao'] || row['Data de Fabricacao'];
          if (typeof dataFabricacao === 'number') {
            const date = new Date((dataFabricacao - 25569) * 86400 * 1000);
            dataFabricacao = date.toISOString().split('T')[0];
          }

          let dataValidade = row['Data Validade'] || row['dataValidade'] || row['Data de Validade'];
                    if (dataValidade === undefined && (row['Vencimento'] || row['vencimento'] || row['Expiration'] || row['EXPIRATION'])) {
                      dataValidade = row['Vencimento'] || row['vencimento'] || row['Expiration'] || row['EXPIRATION'];
                    }
          if (typeof dataValidade === 'number') {
            const date = new Date((dataValidade - 25569) * 86400 * 1000);
            dataValidade = date.toISOString().split('T')[0];
          }
          
          // Extrair shelf life
          const shelfLife = Number(
            row['Shelf Life (dias)'] || 
            row['shelfLife'] || 
            row['Shelf Life'] ||
            row['SHELF_LIFE'] ||
            row['Dias Validade'] ||
            row['dias_validade'] ||
            row['Z06_PRAZO'] || 
            row['Prazo'] ||
            row['PRAZO'] ||
            row['Validade (dias)'] ||
            365
          );

          if (!dataFabricacao) {
            dataFabricacao = new Date().toISOString().split('T')[0];
          }
          
          if (!dataValidade && dataFabricacao && shelfLife) {
            const fab = new Date(dataFabricacao);
            fab.setDate(fab.getDate() + Number(shelfLife));
            dataValidade = fab.toISOString().split('T')[0];
          }
          
          // Extrair quantidade
          const quantidade = Number(
            row['Quantidade'] || 
            row['quantidade'] || 
            row['Qtd'] || 
            row['QTD'] ||
            row['Quantity'] ||
            row['QUANTITY'] ||
            row['Quantidade (kg)'] ||
            row['quantidade (kg)'] ||
            row['Z06_QTD'] ||
            0
          );
          
          // Extrair peso por caixa
          const pesoPorCaixaValue =
            row['Peso por Caixa (kg)'] ||
            row['pesoPorCaixa'] ||
            row['Peso Caixa'] ||
            row['PESO_CAIXA'] ||
            row['Weight per Box'] ||
            row['Z06_TRCX'] ||
            row['Peso Unitário'] ||
            row['peso_unitario'] ||
            row['Weight'];

          const pesoPorCaixa = pesoPorCaixaValue ? Number(pesoPorCaixaValue) : undefined;

          // Extrair unidade de medida
          const unidade = String(
            row['Unidade'] || 
            row['unidade'] || 
            row['Unit'] ||
            row['UNIT'] ||
            row['Unidade Medida'] ||
            row['unidade_medida'] ||
            row['Z06_UNI'] ||
            'kg'
          ).toLowerCase();

          const alimento = {
            codigoProduto,
            nome,
            unidade: (unidade === 'caixa' || unidade === 'cx') ? 'caixa' : 'kg',
            lote,
            dataFabricacao: String(dataFabricacao),
            dataValidade: String(dataValidade),
            quantidade,
            pesoPorCaixa,
            temperatura,
            shelfLife,
            alertasConfig: {
              contarAPartirFabricacaoDias: 10,
              avisoQuandoUmTercoValidade: true,
              popUpNotificacoes: true,
            },
            // manter referência à linha original para mensagens de erro/cross-check no servidor
            _rowIndex: index + 2,
          } as unknown as InsertAlimento;

          if (!alimento.codigoProduto || !alimento.nome) {
            validationErrors.push(`Linha ${index + 2}: Faltam campos obrigatórios (Código ou Nome)`);
          } else {
            processedDataLocal.push(alimento);
          }
        } catch (error) {
          validationErrors.push(`Linha ${index + 2}: Erro ao processar dados - ${error}`);
        }
      });

      setProcessedData(processedDataLocal);
      setPreview(processedDataLocal.slice(0, 5)); // Mostrar apenas primeiros 5 para preview
      setErrors(validationErrors);

      if (validationErrors.length > 0) {
        toast({
          title: 'Avisos na importação',
          description: `${validationErrors.length} linhas com problemas`,
          variant: 'default',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Verifique se o arquivo é um Excel válido',
        variant: 'destructive',
      });
    }
  };

  const handleImport = () => {
    if (processedData.length > 0) {
      importMutation.mutate(processedData);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setErrors([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Alimentos via Excel</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo Excel (.xlsx, .xls) com os dados das entradas de estoque (alimentos/lotes).
            <br />
            <span className="text-sm font-medium mt-2 block">
              Importar alimentos cria registros de estoque (cada linha é uma entrada com lote, quantidade, datas). Use
              "Importar Modelos" para carregar o catálogo de produtos (códigos/descritivos) que ajudam no auto-preenchimento.
            </span>
            <span className="text-sm font-medium mt-2 block">
              Auto-preenchimento: Se informar Data de Fabricação e Shelf Life, a Data de Validade será calculada automaticamente.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover-elevate">
            <div className="flex flex-col items-center gap-4">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
              <div>
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-base font-medium text-primary hover:underline">
                    Clique para selecionar um arquivo
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Aceita arquivos .xlsx e .xls
                  </div>
                </Label>
                <input
                  data-testid="input-file-upload"
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {file && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{file.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Erros */}
          {errors.length > 0 && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-destructive mb-2">Problemas encontrados:</h4>
                  <ul className="text-sm space-y-1">
                    {errors.slice(0, 5).map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {errors.length > 5 && (
                      <li className="text-muted-foreground">
                        ... e mais {errors.length - 5} problemas
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Preview ({preview.length} alimentos):</h4>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-semibold">Código</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold">Nome</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold">Lote</th>
                        <th className="px-2 py-2 text-right text-xs font-semibold">Qtd</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold">Un.</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold">Fab.</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold">Validade</th>
                        <th className="px-2 py-2 text-right text-xs font-semibold">Dias</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold">Temp.</th>
                        <th className="px-2 py-2 text-right text-xs font-semibold">Peso/Cx</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.map((item, i) => (
                        <tr key={i} className="hover:bg-muted/50 transition-colors">
                          <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{item.codigoProduto || '—'}</td>
                          <td className="px-2 py-2 text-sm font-medium truncate max-w-xs">{item.nome}</td>
                          <td className="px-2 py-2 font-mono text-xs">{item.lote}</td>
                          <td className="px-2 py-2 text-right text-xs">{item.quantidade || 0}</td>
                          <td className="px-2 py-2 text-xs uppercase text-muted-foreground">{item.unidade}</td>
                          <td className="px-2 py-2 font-mono text-xs">{item.dataFabricacao || '—'}</td>
                          <td className="px-2 py-2 font-mono text-xs font-semibold">{item.dataValidade || '—'}</td>
                          <td className="px-2 py-2 text-right text-xs text-muted-foreground">{item.shelfLife || 0}</td>
                          <td className="px-2 py-2 text-xs">{item.temperatura || '—'}</td>
                          <td className="px-2 py-2 text-right text-xs text-muted-foreground">{item.pesoPorCaixa ? `${item.pesoPorCaixa} kg` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button data-testid="button-cancel-import" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              data-testid="button-confirm-import"
              onClick={handleImport}
              disabled={preview.length === 0 || importMutation.isPending}
            >
              {importMutation.isPending ? 'Importando...' : `Importar ${preview.length} alimentos`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
