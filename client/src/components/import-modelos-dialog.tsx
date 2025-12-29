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
import type { InsertModeloProduto } from '@shared/schema';

interface ImportModelosDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ImportModelosDialog({ open, onClose }: ImportModelosDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [processedData, setProcessedData] = useState<InsertModeloProduto[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // Helper reuse: tenta converter worksheet em JSON mesmo com cabeçalhos deslocados
  const parseWorksheetToJson = (worksheet: XLSX.WorkSheet, expectedKeys: string[]) => {
    let jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    const looksLikeColumnLetters = (obj: any) => {
      if (!obj) return false;
      const keys = Object.keys(obj);
      if (keys.length === 0) return false;
      return keys.every(k => /^[A-Z]+$/.test(k) || /^\d+$/.test(k));
    };

    const normalize = (s: any) => {
      if (s === null || s === undefined) return '';
      return String(s)
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]/g, '');
    };

    // Ler como matriz sempre e tentar detectar cabeçalho por heurística
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    let headerIndex = -1;
    const normalizedExpected = expectedKeys.map(k => normalize(k));

    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i] || [];
      const found = row.some((cell: any) => {
        if (cell === null || cell === undefined) return false;
        const v = normalize(cell);
        return normalizedExpected.some(h => v.includes(h) || h.includes(v));
      });
      if (found) { headerIndex = i; break; }
    }

    if (headerIndex === -1) {
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i] || [];
        const nonEmptyCount = row.reduce((acc, cell) => acc + (cell !== null && cell !== undefined && String(cell).trim() !== '' ? 1 : 0), 0);
        if (nonEmptyCount >= 2) { headerIndex = i; break; }
      }
    }

    if (headerIndex >= 0) {
      const headers = rows[headerIndex].map((h: any) => (h === null || h === undefined) ? '' : String(h).trim());
      const out: any[] = [];
      for (let r = headerIndex + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.every((c: any) => c === null || c === undefined || String(c).trim() === '')) continue; // pular linhas vazias entre cabeçalho e dados
        const obj: any = {};
        for (let c = 0; c < headers.length; c++) {
          const key = headers[c] || `col_${c}`;
          obj[key] = row[c] !== undefined ? row[c] : null;
        }
        out.push(obj);
      }
      jsonData = out;
    } else {
      jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    }

    return jsonData;
  };

  const importMutation = useMutation({
    mutationFn: async (modelos: InsertModeloProduto[]) => {
          // Adiciona campos de sistema a todos os modelos
          const modelosComCamposSistema = modelos.map(modelo => ({
            ...modelo,
            cadastradoPor: 'SISTEMA',
          }));
          // `apiRequest` já retorna o JSON parseado para rotas internas (/api/...)
          // portanto não devemos chamar `.json()` sobre o resultado.
          // [FIX-IMPORT-CACHE-BUST-v2] 2025-11-25 23:00
          const data = await apiRequest('POST', '/api/modelos-produtos/import', { 
            modelos: modelosComCamposSistema 
          });
          console.log('✅ Import API response:', data);
      return data;
    },
    onSuccess: (data: any) => {
      // Invalidar queries para garantir que a fonte de verdade seja recarregada
      // do backend/Supabase. Evita exibir modelos que só existem localmente
      // (por exemplo, otimisticamente) quando a importação falhou parcialmente.
      try {
        queryClient.invalidateQueries({ queryKey: ['/api/modelos-produtos'] });
        // Também invalidar caches individuais por código (caso existam)
        (processedData || []).forEach((m) => {
          if (m && m.codigoProduto) queryClient.invalidateQueries({ queryKey: ['/api/modelos-produtos', m.codigoProduto] });
        });
      } catch (e) {
        // Silencioso - em último caso, forçar refetch global
        queryClient.invalidateQueries();
      }

      // Se o servidor retornou erros, exiba na UI para que o usuário possa revisar
      if (data.errors && data.errors.length > 0) {
        setErrors(data.errors);
        toast({
          title: 'Importação concluída com avisos',
            description: `Foram importados ${data.imported || 0} modelos e atualizados ${data.updated || 0}, porém ${data.errors.length} modelos tiveram problemas. Verifique os detalhes abaixo.`,
          variant: 'default',
        });
        // manter modal aberto para inspeção dos erros
        return;
      }

      toast({
        title: 'Importação concluída',
          description: `${data.imported || 0} modelos importados e ${data.updated || 0} atualizados com sucesso!`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro na importação',
        description: error.message || 'Erro ao importar modelos de produtos',
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
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const expectedHeaders = ['z06_cod','z0b_cod','cod','codigo','z06_desc','descricao','z06_arma','prazo','shelf','gtin'];
      const jsonData = parseWorksheetToJson(worksheet, expectedHeaders);

      const processedData: InsertModeloProduto[] = [];
      const validationErrors: string[] = [];

      jsonData.forEach((row: any, index: number) => {
        try {
              // Helper para reconhecer múltiplas variações de colunas possíveis, usando normalização
              const normalizeKey = (s: any) => {
                if (s === null || s === undefined) return '';
                return String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]/g, '');
              };
              const getCell = (aliases: string[]) => {
                const normalizedAliases = aliases.map(a => normalizeKey(a));
                for (const k of Object.keys(row)) {
                  const nk = normalizeKey(k);
                  const val = row[k];
                  if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) continue;
                  for (const a of normalizedAliases) {
                    if (nk.includes(a) || a.includes(nk)) return val;
                  }
                }
                return undefined;
              };

              const codigo = getCell(['Z0B_COD', 'Z06_COD', 'COD', 'CODIGO', 'Código', 'codigo', 'cod']);
              const descricao = getCell(['Z0B_DESC', 'Z06_DESC', 'DESC', 'DESCRICAO', 'Descrição', 'descricao', 'descricao do item']);
              const temperatura = getCell(['Z0B_ARMA', 'Z06_ARMA', 'ARMA', 'TEMPERATURA']);
              const shelfRaw = getCell(['Z0B_PRAZO', 'Z06_PRAZO', 'Z0B_GTIN', 'Z06_GTIN', 'PRAZO', 'SHELF']);
              const pesoPorCaixaRaw = getCell(['Z0B_TRCX', 'Z06_TRCX', 'TRCX']);
              const pesoEmbRaw = getCell(['Z0B_TREMB', 'Z06_TREMB', 'TREMB']);
              const gtinRaw = getCell(['Z0B_GTIN', 'Z06_GTIN', 'GTIN']);
              const empresaRaw = getCell(['Z0B_EMPRE', 'Z06_EMPRE', 'EMPRESA']);
              const pesoLiquidoRaw = getCell(['Z0B_PESOLI', 'Z06_PESOLI', 'PESOLI']);
              const tipoPesoRaw = getCell(['Z0B_TPPESO', 'Z06_TPPESO', 'TPPESO']);
              const qtdCxRaw = getCell(['Z0B_QTCX', 'Z06_QTCX', 'QTCX']);

              const modelo: InsertModeloProduto = {
                codigoProduto: String(codigo || '').trim(),
                descricao: String(descricao || '').trim(),
                temperatura: String(temperatura || '').trim(),
                shelfLife: Number(shelfRaw || 0),
                gtin: gtinRaw ? String(gtinRaw).trim() : null,
                pesoEmbalagem: pesoEmbRaw ? Number(pesoEmbRaw) : null,
                pesoPorCaixa: pesoPorCaixaRaw ? Number(pesoPorCaixaRaw) : null,
                empresa: empresaRaw ? String(empresaRaw).trim() : null,
                pesoLiquido: pesoLiquidoRaw ? Number(pesoLiquidoRaw) : null,
                tipoPeso: tipoPesoRaw ? String(tipoPesoRaw).trim() : null,
                quantidadePorCaixa: qtdCxRaw ? Number(qtdCxRaw) : null,
                unidadePadrao: 'kg',
              };

          // Validação detalhada dos campos
          const errors = [];
          if (!modelo.codigoProduto) errors.push('Código do Produto');
          if (!modelo.descricao) errors.push('Descrição');
          // Temperatura agora é opcional (alguns modelos não têm esse campo)
          if (!modelo.shelfLife) errors.push('Prazo de Validade');

          if (errors.length > 0) {
            validationErrors.push(`Linha ${index + 2}: Campos obrigatórios não preenchidos: ${errors.join(', ')}`);
          } else if (modelo.shelfLife <= 0) {
            validationErrors.push(`Linha ${index + 2}: Prazo de validade deve ser maior que zero`);
          } else {
            // Validar formato dos campos numéricos
            if (modelo.pesoPorCaixa !== null && (isNaN(modelo.pesoPorCaixa) || modelo.pesoPorCaixa <= 0)) {
              validationErrors.push(`Linha ${index + 2}: Peso por caixa deve ser um número positivo`);
            }
            if (modelo.quantidadePorCaixa !== null && (isNaN(modelo.quantidadePorCaixa) || modelo.quantidadePorCaixa <= 0)) {
              validationErrors.push(`Linha ${index + 2}: Quantidade por caixa deve ser um número positivo`);
            }
            
            // Se passou em todas as validações, adiciona à lista
            (modelo as any)._rowIndex = index + 2;
            processedData.push(modelo);
          }
        } catch (error) {
          validationErrors.push(`Linha ${index + 2}: Erro ao processar dados`);
        }
      });

      setProcessedData(processedData);
      setPreview(processedData.slice(0, 5));
      setErrors(validationErrors);

      if (validationErrors.length > 0) {
        toast({
          title: 'Avisos na importação',
          description: `${validationErrors.length} linhas com problemas`,
          variant: 'default',
        });
      }

      if (processedData.length > 0) {
        toast({
          title: 'Arquivo processado',
          description: `${processedData.length} modelos prontos para importar`,
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Verifique se o arquivo é um Excel válido no formato esperado',
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
    setProcessedData([]);
    setErrors([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Modelos de Produtos via Excel</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo Excel (.xlsx, .xls) com os modelos de produtos (catálogo).
            <br />
            <span className="text-sm font-medium mt-2 block">
              Importar modelos adiciona/atualiza o catálogo de produtos (código, descrição, temperatura, shelf life,
              etc). Isso é usado para auto-preenchimento quando você cadastra alimentos pelo código.
            </span>
            <span className="text-sm mt-2 block text-muted-foreground">
              O arquivo pode conter variações do formato Protheus. Aceitamos colunas como: Z06_*, Z0B_*,
              ou nomes comuns (COD, CODIGO, DESC, TEMPERATURA, PRAZO). O import tentará detectar automaticamente.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover-elevate">
            <div className="flex flex-col items-center gap-4">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
              <div>
                <Label htmlFor="file-upload-modelos" className="cursor-pointer">
                  <div className="text-base font-medium text-primary hover:underline">
                    Clique para selecionar um arquivo
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Aceita arquivos .xlsx, .xls e .xlsm (Formato Protheus)
                  </div>
                </Label>
                <input
                  data-testid="input-file-upload-modelos"
                  id="file-upload-modelos"
                  type="file"
                  accept=".xlsx,.xls,.xlsm,.xlsb"
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

          {errors.length > 0 && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-destructive mb-2">
                    Problemas encontrados ({errors.length} {errors.length === 1 ? 'erro' : 'erros'}):
                  </h4>
                  <div className="text-sm">
                    <div className="mb-2 text-muted-foreground">
                      Por favor, corrija os problemas abaixo antes de continuar com a importação:
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded border border-destructive/20 bg-background/50">
                      <ul className="space-y-1 p-2">
                        {errors.map((error, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-destructive">•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Dica: Verifique se todos os campos obrigatórios estão preenchidos e se os valores numéricos estão corretos.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {preview.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Preview ({preview.length} modelos):</h4>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Código</th>
                        <th className="px-3 py-2 text-left">Descrição</th>
                        <th className="px-3 py-2 text-left">Temperatura</th>
                        <th className="px-3 py-2 text-left">Shelf (dias)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs">{item.codigoProduto}</td>
                          <td className="px-3 py-2">{item.descricao}</td>
                          <td className="px-3 py-2 text-xs">{item.temperatura}</td>
                          <td className="px-3 py-2">{item.shelfLife}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button data-testid="button-cancel-import-modelos" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              data-testid="button-confirm-import-modelos"
              onClick={handleImport}
              disabled={processedData.length === 0 || importMutation.isPending}
            >
              {importMutation.isPending ? 'Importando...' : `Importar ${processedData.length} modelos`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
