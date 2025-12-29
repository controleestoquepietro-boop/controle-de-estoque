import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import * as XLSX from "xlsx";
import type { InsertAlimento } from "@shared/schema";

interface ImportExcelDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ImportExcelDialog({ open, onClose }: ImportExcelDialogProps) {
  console.log("ImportExcelDialog render; open=", open);
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [processedData, setProcessedData] = useState<InsertAlimento[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // Helper: tenta converter a worksheet para JSON mesmo quando o cabeçalho ocupa múltiplas linhas
  const parseWorksheetToJson = (
    worksheet: XLSX.WorkSheet,
    expectedKeys: string[],
  ) => {
    // tentativa padrão (usa a primeira linha com valores como cabeçalho)
    let jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    const looksLikeColumnLetters = (obj: any) => {
      if (!obj) return false;
      const keys = Object.keys(obj);
      if (keys.length === 0) return false;
      // detectar chaves A, B, C... ou 0,1,2
      return keys.every((k) => /^[A-Z]+$/.test(k) || /^\d+$/.test(k));
    };

    const normalize = (s: any) => {
      if (s === null || s === undefined) return "";
      return String(s)
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]/g, ""); // remove espaços e caracteres não alfanuméricos
    };

    // Sempre tentar detectar uma linha de cabeçalho lendo como matriz — isso lida com títulos que aparecem abaixo de algumas linhas de metadados
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
    });
    let headerIndex = -1;
    const normalizedExpected = expectedKeys.map((k) => normalize(k));

    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i] || [];
      const found = row.some((cell: any) => {
        try {
          if (cell === null || cell === undefined) return false;
          const v = normalize(cell);
          return normalizedExpected.some((h) => v.includes(h) || h.includes(v));
        } catch (err) {
          // Se algum valor do cabeçalho é estranho (ex.: getter que lança), ignorar e continuar
          console.warn(
            "Ignorando célula de cabeçalho problemática ao detectar header:",
            err,
          );
          return false;
        }
      });
      if (found) {
        headerIndex = i;
        break;
      }

      // Se não achou com heurística de nomes esperados, tentar heurística genérica: primeira linha com pelo menos 2 células não-vazias
      if (headerIndex === -1) {
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
          const row = rows[i] || [];
          const nonEmptyCount = row.reduce(
            (acc, cell) =>
              acc +
              (cell !== null && cell !== undefined && String(cell).trim() !== ""
                ? 1
                : 0),
            0,
          );
          if (nonEmptyCount >= 2) {
            headerIndex = i;
            break;
          }
        }
      }

      if (headerIndex >= 0) {
        const headers = rows[headerIndex].map((h: any) =>
          h === null || h === undefined ? "" : String(h).trim(),
        );
        const out: any[] = [];
        for (let r = headerIndex + 1; r < rows.length; r++) {
          const row = rows[r];
          if (
            !row ||
            row.every(
              (c: any) =>
                c === null || c === undefined || String(c).trim() === "",
            )
          )
            continue; // pular linhas vazias entre cabeçalho e dados
          const obj: any = {};
          for (let c = 0; c < headers.length; c++) {
            const key = headers[c] || `col_${c}`;
            obj[key] = row[c] !== undefined ? row[c] : null;
          }
          out.push(obj);
        }
        jsonData = out;
      } else {
        // Se nada foi detectado, aceitar o fallback já gerado por sheet_to_json (caso útil) — normalmente terá chaves __EMPTY
        jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
      }

      return jsonData;
    }

    const importMutation = useMutation({
      mutationFn: async (alimentos: InsertAlimento[]) => {
        const result = await apiRequest("POST", "/api/alimentos/import", {
          alimentos,
        });
        return result;
      },
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: ["alimentos"] });

        if (data.errors && data.errors.length > 0) {
          setErrors(data.errors);
          toast({
            title: "Importação com avisos",
            description: `${data.imported || 0} importados, ${data.errors.length} linhas com problemas.`,
            variant: "default",
          });
          // manter o modal aberto para que o usuário veja os erros
          return;
        }

        toast({
          title: "Importação concluída",
          description: `${data.imported || 0} alimentos importados com sucesso!`,
        });
        handleClose();
      },
      onError: (error: any) => {
        toast({
          title: "Erro na importação",
          description: error.message || "Erro ao importar alimentos",
          variant: "destructive",
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
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const expectedHeaders = [
          "codigo",
          "codigo produto",
          "z06_cod",
          "codigoProduto",
          "nome",
          "descricao",
          "z06_desc",
          "quantidade",
          "qtd",
          "shelf",
          "shelf life",
          "data fabricacao",
          "data validade",
        ];
        const jsonData = parseWorksheetToJson(worksheet, expectedHeaders);

        // Validar e processar dados
        const processedDataLocal: InsertAlimento[] = [];
        const validationErrors: string[] = [];

        // Helper para obter valor por vários aliases, usando normalize igual ao parser
        const getCellValue = (row: any, aliases: string[]) => {
          const normalizeKey = (s: any) => {
            if (s === null || s === undefined) return "";
            return String(s)
              .toLowerCase()
              .normalize("NFD")
              .replace(/\p{Diacritic}/gu, "")
              .replace(/[^a-z0-9]/g, "");
          };
          const normalizedAliases = aliases.map((a) => normalizeKey(a));
          for (const k of Object.keys(row)) {
            try {
              const nk = normalizeKey(k);
              const val = row[k];
              if (
                val === null ||
                val === undefined ||
                (typeof val === "string" && val.trim() === "")
              )
                continue;
              for (const a of normalizedAliases) {
                if (nk.includes(a) || a.includes(nk)) return val;
              }
            } catch (err) {
              // Se alguma chave de célula lança ao ser acessada (ex.: getters estranhos), ignorar e continuar
              console.warn(
                "Ignorando célula problemática durante getCellValue:",
                err,
              );
              continue;
            }
          }
          return undefined;
        };

        // Parser robusto para datas que podem vir como Excel serial, Date, ISO ou dd/mm/yyyy
        const parseAnyDate = (v: any): string | undefined => {
          try {
            if (
              v === null ||
              v === undefined ||
              (typeof v === "string" && v.trim() === "")
            )
              return undefined;
            // Excel já convertido para Date (cellDates: true) ou valor Date
            if (v instanceof Date && !isNaN(v.getTime()))
              return v.toISOString().split("T")[0];
            // Excel serial number
            if (typeof v === "number") {
              const date = new Date((v - 25569) * 86400 * 1000);
              return date.toISOString().split("T")[0];
            }
            // String attempts
            const s = String(v).trim();
            // YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
            // DD/MM/YYYY or D/M/YYYY
            const ddmmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
            if (ddmmy) {
              let day = ddmmy[1].padStart(2, "0");
              let month = ddmmy[2].padStart(2, "0");
              let year = ddmmy[3];
              if (year.length === 2) year = "20" + year;
              return `${year}-${month}-${day}`;
            }
            // Última tentativa com Date parser do JS
            const parsed = new Date(s);
            if (!isNaN(parsed.getTime()))
              return parsed.toISOString().split("T")[0];
            return undefined;
          } catch (err) {
            console.warn("Erro ao parsear data (parseAnyDate):", err);
            return undefined;
          }
        };

        // Mapeamento robusto de colunas: tenta reconhecer cabeçalhos como "CÓD", "DESCRIÇÃO DO ITEM", "QTD KG" etc.
        const mapRowToFields = (row: any) => {
          const normalizeKey = (s: any) => {
            if (s === null || s === undefined) return "";
            return String(s)
              .toLowerCase()
              .normalize("NFD")
              .replace(/\p{Diacritic}/gu, "")
              .replace(/[^a-z0-9]/g, "");
          };

          const out: any = {};

          for (const k of Object.keys(row)) {
            try {
              const nk = normalizeKey(k);
              const val = row[k];
              if (!out.codigoProduto && (nk.includes("cod") || nk.includes("codigo") || nk === "cod")) out.codigoProduto = val;
              if (!out.nome && (nk.includes("desc") || nk.includes("nome") || nk.includes("produto") || nk.includes("descricao"))) out.nome = val;
              if (!out.temperatura && (nk.includes("temp") || nk.includes("arma") || nk.includes("temperatura"))) out.temperatura = val;
              if (!out.lote && nk.includes("lote")) out.lote = val;
              if (!out.dataFabricacao && (nk.includes("fabric") || nk.includes("fabr"))) out.dataFabricacao = val;
              if (!out.dataValidade && nk.includes("valid")) out.dataValidade = val;
              if (!out.shelfLife && (nk.includes("shelf") || nk.includes("prazo") || nk.includes("dias"))) out.shelfLife = val;
              if (!out.pesoPorCaixa && (nk.includes("peso") || nk.includes("weight") || nk.includes("peso_unitario")) && !nk.includes("qtd") && !nk.includes("quant")) out.pesoPorCaixa = val;
              if (!out.quantidade && (nk.includes("qtd") || nk.includes("quant") || nk === "qtdkg")) out.quantidade = val;
              if (!out.unidade && nk.includes("unid")) out.unidade = val;
            } catch (err) {
              continue;
            }
          }

          // Fallback com aliases (caso heurística acima não tenha encontrado)
          if (!out.codigoProduto)
            out.codigoProduto = getCellValue(row, ["codigo", "cod", "codigo produto", "codigoProduto", "z06_cod", "sku", "prod_code"]);
          if (!out.nome)
            out.nome = getCellValue(row, ["nome", "descricao", "descricao do item", "z06_desc", "desc", "product name", "produto"]);
          if (!out.dataFabricacao)
            out.dataFabricacao = getCellValue(row, ["data fabricacao", "fabricacao", "fabricao", "data de fabricacao"]);
          if (!out.dataValidade)
            out.dataValidade = getCellValue(row, ["data validade", "validade", "vencimento", "data de validade", "expiracao", "expiração"]);
          if (!out.quantidade)
            out.quantidade = getCellValue(row, ["quantidade", "qtd", "qtd kg", "qtdkg", "quantity", "qtdkg"]);
          if (!out.shelfLife)
            out.shelfLife = getCellValue(row, ["shelf life", "shelfLife", "shelf_life", "prazo", "dias_validade", "z06_prazo"]);
          if (!out.pesoPorCaixa)
            out.pesoPorCaixa = getCellValue(row, ["peso por caixa", "pesoPorCaixa", "peso caixa", "peso_unitario", "weight", "peso"]);
          if (!out.temperatura)
            out.temperatura = getCellValue(row, ["temperatura", "temp", "armazenamento", "storage", "z06_arma"]);
          if (!out.lote)
            out.lote = getCellValue(row, ["lote", "batch", "lot", "z06_lote"]);

          return out;
        };

        jsonData.forEach((row: any, index: number) => {
          try {
            const mapped = mapRowToFields(row);

            const codigoProduto = mapped.codigoProduto ? String(mapped.codigoProduto).trim() : "";
            const nome = mapped.nome ? String(mapped.nome).trim() : "";

            // temperatura e lote
            let temperatura = mapped.temperatura ? String(mapped.temperatura).trim() : "";
            let lote = mapped.lote ? String(mapped.lote).trim() : "LOTE-01";

            // datas
            let dataFabricacao = parseAnyDate(mapped.dataFabricacao);
            let dataValidade = parseAnyDate(mapped.dataValidade);

            // shelf life: tentamos parsear números de várias colunas
            const shelfLifeRaw = mapped.shelfLife || row["Shelf Life (dias)"] || row["SHELF_LIFE"] || row["Dias Validade"] || row["Z06_PRAZO"];
            let shelfLife = Number(shelfLifeRaw);
            if (!shelfLife || isNaN(shelfLife)) shelfLife = 365;

            // Se não tinha data de fabricação, usar hoje
            if (!dataFabricacao) {
              dataFabricacao = new Date().toISOString().split("T")[0];
            }

            // Se não tinha validade, calcular a partir do shelfLife
            if (!dataValidade && dataFabricacao && shelfLife) {
              const fab = new Date(dataFabricacao);
              fab.setDate(fab.getDate() + Number(shelfLife));
              dataValidade = fab.toISOString().split("T")[0];
            }

            // quantidade: preferir QTD KG se presente
            let quantidade = 0;
            const qtdKg = mapped.quantidade || row["QTD KG"] || row["QTD_KG"] || row["QTDKG"];
            const qtd = mapped.quantidade || row["QTD"] || row["Qtd"] || row["Quantidade"] || row["quantidade"];
            if (qtdKg !== undefined && qtdKg !== null && String(qtdKg).trim() !== "") quantidade = Number(qtdKg);
            else if (qtd !== undefined && qtd !== null && String(qtd).trim() !== "") quantidade = Number(qtd);

            // peso por caixa: considerar mapeamento e aliases
            const pesoPorCaixaValue =
              mapped.pesoPorCaixa ??
              row["Peso por Caixa (kg)"] ??
              row["pesoPorCaixa"] ??
              row["Peso Caixa"] ??
              row["PESO_CAIXA"] ??
              row["Weight per Box"] ??
              row["Z06_TRCX"] ??
              row["Peso Unitário"] ??
              row["peso_unitario"] ??
              row["Weight"];

            const pesoPorCaixaNum =
              pesoPorCaixaValue !== undefined && pesoPorCaixaValue !== null && String(pesoPorCaixaValue).trim() !== ""
                ? Number(pesoPorCaixaValue)
                : undefined;

            // unidade
            const unidadeRaw = mapped.unidade ?? row["Unidade"] ?? row["unidade"] ?? row["Unit"] ?? row["UNIT"] ?? row["Unidade Medida"] ?? row["unidade_medida"] ?? row["Z06_UNI"] ?? "kg";
            const unidade = String(unidadeRaw).toLowerCase();

            const alimento = {
              codigoProduto,
              nome,
              unidade: unidade === "caixa" || unidade === "cx" ? "caixa" : "kg",
              lote,
              dataFabricacao: String(dataFabricacao),
              dataValidade: String(dataValidade),
              quantidade,
              pesoPorCaixa: pesoPorCaixaNum,
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
              validationErrors.push(
                `Linha ${index + 2}: Faltam campos obrigatórios (Código ou Nome)`,
              );
            } else {
              processedDataLocal.push(alimento);
            }
          } catch (error) {
            // Log detalhado no console para que desenvolvedores possam inspecionar stack
            console.error(`Erro ao processar linha ${index + 2}:`, error);

            const message =
              error && (error as any).message
                ? (error as any).message
                : String(error);
            if (
              message &&
              message.includes("Cannot access") &&
              message.includes("before initialization")
            ) {
              validationErrors.push(
                `Linha ${index + 2}: Erro ao processar dados - problema com uma célula do Excel (provavelmente uma propriedade/comportamento inesperado). Ignorada.`,
              );
            } else {
              validationErrors.push(
                `Linha ${index + 2}: Erro ao processar dados - ${message}`,
              );
            }
          }
        });

        setProcessedData(processedDataLocal);
        setPreview(processedDataLocal.slice(0, 5)); // Mostrar apenas primeiros 5 para preview
        setErrors(validationErrors);

        if (validationErrors.length > 0) {
          toast({
            title: "Avisos na importação",
            description: `${validationErrors.length} linhas com problemas`,
            variant: "default",
          });
        }
      } catch (error) {
        toast({
          title: "Erro ao ler arquivo",
          description: "Verifique se o arquivo é um Excel válido",
          variant: "destructive",
        });
      }
    };

    const handleImport = () => {
      if (processedData.length > 0) {
        importMutation.mutate(processedData);
      }
    };

    const handleClose = () => {
      console.log("ImportExcelDialog: handleClose called");
      setFile(null);
      setPreview([]);
      setErrors([]);
      onClose();
    };

    const handleDialogOpenChange = (isOpen: boolean) => {
      console.log("ImportExcelDialog: onOpenChange ->", isOpen);
      // Somente executar limpeza quando o diálogo for fechado (isOpen === false)
      if (!isOpen) handleClose();
    };

    return (
      <>
        {open && (
          <div className="fixed left-2 top-2 z-[99999] bg-red-600 text-white px-2 py-1 rounded shadow">DEBUG: ImportExcelDialog OPEN</div>
        )}
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Alimentos via Excel</DialogTitle>
            <DialogDescription>
              Faça upload de um arquivo Excel (.xlsx, .xls) com os dados das
              entradas de estoque (alimentos/lotes).
              <br />
              <span className="text-sm font-medium mt-2 block">
                Importar alimentos cria registros de estoque (cada linha é uma
                entrada com lote, quantidade, datas). Use "Importar Modelos"
                para carregar o catálogo de produtos (códigos/descritivos) que
                ajudam no auto-preenchimento.
              </span>
              <span className="text-sm font-medium mt-2 block">
                Auto-preenchimento: Se informar Data de Fabricação e Shelf Life,
                a Data de Validade será calculada automaticamente.
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
                      Aceita arquivos .xlsx, .xls, .xlsm e .xlsb
                    </div>
                  </Label>
                  <input
                    data-testid="input-file-upload"
                    id="file-upload"
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

            {/* Erros */}
            {errors.length > 0 && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-destructive mb-2">
                      Problemas encontrados:
                    </h4>
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
                <h4 className="font-semibold mb-2">
                  Preview ({preview.length} alimentos):
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-semibold">
                            Código
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">
                            Nome
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">
                            Lote
                          </th>
                          <th className="px-2 py-2 text-right text-xs font-semibold">
                            Qtd
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">
                            Un.
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">
                            Fab.
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">
                            Validade
                          </th>
                          <th className="px-2 py-2 text-right text-xs font-semibold">
                            Dias
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">
                            Temp.
                          </th>
                          <th className="px-2 py-2 text-right text-xs font-semibold">
                            Peso/Cx
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {preview.map((item, i) => (
                          <tr
                            key={i}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <td className="px-2 py-2 font-mono text-xs text-muted-foreground">
                              {item.codigoProduto || "—"}
                            </td>
                            <td className="px-2 py-2 text-sm font-medium truncate max-w-xs">
                              {item.nome}
                            </td>
                            <td className="px-2 py-2 font-mono text-xs">
                              {item.lote}
                            </td>
                            <td className="px-2 py-2 text-right text-xs">
                              {item.quantidade || 0}
                            </td>
                            <td className="px-2 py-2 text-xs uppercase text-muted-foreground">
                              {item.unidade}
                            </td>
                            <td className="px-2 py-2 font-mono text-xs">
                              {item.dataFabricacao || "—"}
                            </td>
                            <td className="px-2 py-2 font-mono text-xs font-semibold">
                              {item.dataValidade || "—"}
                            </td>
                            <td className="px-2 py-2 text-right text-xs text-muted-foreground">
                              {item.shelfLife || 0}
                            </td>
                            <td className="px-2 py-2 text-xs">
                              {item.temperatura || "—"}
                            </td>
                            <td className="px-2 py-2 text-right text-xs text-muted-foreground">
                              {item.pesoPorCaixa
                                ? `${item.pesoPorCaixa} kg`
                                : "—"}
                            </td>
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
              <Button
                data-testid="button-cancel-import"
                variant="outline"
                onClick={handleClose}
              >
                Cancelar
              </Button>
              <Button
                data-testid="button-confirm-import"
                onClick={handleImport}
                disabled={preview.length === 0 || importMutation.isPending}
              >
                {importMutation.isPending
                  ? "Importando..."
                  : `Importar ${preview.length} alimentos`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </>
    );
}
}
