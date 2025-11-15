import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { insertAlimentoSchema, type InsertAlimento, type Alimento, type ModeloProduto } from '@shared/schema';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface AlimentoFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: InsertAlimento) => void;
  initialData?: Alimento;
}

type FormData = {
  codigoProduto: string;
  nome: string;
  unidade: 'kg' | 'caixa';
  lote: string;
  dataFabricacao: string;
  dataValidade: string;
  quantidade: number;
  pesoPorCaixa?: number | null;
  temperatura: string;
  shelfLife: number;
  dataEntrada?: string;
  dataSaida?: string | null;
  alertasConfig: {
    contarAPartirFabricacaoDias: number;
    avisoQuandoUmTercoValidade: boolean;
    popUpNotificacoes: boolean;
  };
};

export function AlimentoForm({ open, onClose, onSubmit, initialData }: AlimentoFormProps) {
  const [codigoBusca, setCodigoBusca] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(insertAlimentoSchema),
    defaultValues: {
      codigoProduto: '',
      nome: '',
      unidade: 'kg',
      lote: '',
      dataFabricacao: '',
      dataValidade: '',
      quantidade: 0,
      pesoPorCaixa: null,
      temperatura: '',
  shelfLife: 365,
      alertasConfig: {
        contarAPartirFabricacaoDias: 10,
        avisoQuandoUmTercoValidade: true,
        popUpNotificacoes: true,
      },
    },
  });

  const { toast } = useToast();

  const unidade = watch('unidade');
  const alertasConfig = watch('alertasConfig');

  // Buscar modelo de produto quando o código for digitado
  const { data: modeloEncontrado, isFetching: modeloFetching, isError: modeloIsError, error: modeloError } = useQuery<ModeloProduto>({
    queryKey: ['/api/modelos-produtos', codigoBusca],
    enabled: !!codigoBusca && codigoBusca.length > 2,
    queryFn: async ({ queryKey }) => {
      const url = (queryKey as any)[0] as string;
      const param = (queryKey as any)[1];
      const full = param ? (url.endsWith('/') ? `${url}${encodeURIComponent(String(param))}` : `${url}/${encodeURIComponent(String(param))}`) : url;
      return await apiRequest('GET', full);
    },
  });

  // Quando o código for reduzido para menos de 3 caracteres, limpar qualquer
  // cache por-código para evitar mostrar um modelo antigo como 'encontrado'.
  useEffect(() => {
    if (!codigoBusca || codigoBusca.length <= 2) {
      try {
        queryClient.removeQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === '/api/modelos-produtos' && q.queryKey.length > 1 });
      } catch (e) {
        // silencioso
      }
    }
  }, [codigoBusca]);

  // Preencher campos automaticamente quando encontrar o modelo. Somente
  // aplicar auto-fill quando o `codigoProduto` do modelo for exatamente
  // igual ao valor digitado para evitar falsos positivos vindos de cache.
  useEffect(() => {
    try {
      if (
        modeloEncontrado &&
        !initialData &&
        modeloEncontrado.codigoProduto &&
        codigoBusca &&
        String(modeloEncontrado.codigoProduto).trim() === String(codigoBusca).trim()
      ) {
        setValue('nome', modeloEncontrado.descricao || '');
        setValue('temperatura', modeloEncontrado.temperatura || '');
        setValue('shelfLife', modeloEncontrado.shelfLife || 365);
        setValue('unidade', (modeloEncontrado.unidadePadrao as any) || 'kg');
        if (modeloEncontrado.pesoPorCaixa) {
          setValue('pesoPorCaixa', modeloEncontrado.pesoPorCaixa);
        }
      }
    } catch (e) {
      // silencioso
    }
  }, [modeloEncontrado, setValue, initialData, codigoBusca]);

  useEffect(() => {
    if (initialData) {
      reset({
        codigoProduto: initialData.codigoProduto,
        nome: initialData.nome,
        unidade: initialData.unidade as 'kg' | 'caixa',
        lote: initialData.lote,
        dataFabricacao: initialData.dataFabricacao,
        dataValidade: initialData.dataValidade,
        quantidade: initialData.quantidade,
        pesoPorCaixa: initialData.pesoPorCaixa,
        temperatura: initialData.temperatura,
        shelfLife: initialData.shelfLife,
        dataEntrada: initialData.dataEntrada,
        dataSaida: initialData.dataSaida,
        alertasConfig: initialData.alertasConfig,
      });
      setCodigoBusca('');
    } else {
      reset({
        codigoProduto: '',
        nome: '',
        unidade: 'kg',
        lote: '',
        dataFabricacao: '',
        dataValidade: '',
        quantidade: 0,
        pesoPorCaixa: null,
        temperatura: '',
  shelfLife: 365,
        alertasConfig: {
          contarAPartirFabricacaoDias: 10,
          avisoQuandoUmTercoValidade: true,
          popUpNotificacoes: true,
        },
      });
      setCodigoBusca('');
    }
  }, [initialData, reset]);

  const handleFormSubmit = (data: FormData) => {
    const submitData: InsertAlimento = {
      ...data,
      pesoPorCaixa: data.unidade === 'caixa' ? (data.pesoPorCaixa || null) : null,
    };
    onSubmit(submitData);
    reset();
    onClose();
  };

  const handleFormErrors = (formErrors: any) => {
    // Coleta e formata mensagens de erro vindas do react-hook-form / zod
    const messages: string[] = [];

    const walk = (obj: any, path: string[] = []) => {
      if (!obj || typeof obj !== 'object') return;
      // Se for um erro do RHF/Zod com .message
      if (obj.message && typeof obj.message === 'string') {
        const field = path.length > 0 ? path.join('.') : 'Campo';
        messages.push(`${field}: ${obj.message}`);
        return;
      }

      // Erro simples (ex.: { type: 'required' })
      if (obj.type && obj.type === 'required') {
        const field = path.length > 0 ? path.join('.') : 'Campo';
        messages.push(`${field} é obrigatório`);
        return;
      }

      // Navega recursivamente
      for (const key of Object.keys(obj)) {
        walk(obj[key], [...path, key]);
      }
    };

    walk(formErrors);

    if (messages.length > 0) {
      toast({
        title: 'Erros no formulário',
        description: messages.slice(0, 5).join(' · '),
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Erro no formulário', description: 'Verifique os campos obrigatórios', variant: 'destructive' });
    }
  };

  const handleClose = () => {
    reset();
    setCodigoBusca('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Alimento' : 'Novo Alimento'}</DialogTitle>
          <DialogDescription>
            Preencha os dados do alimento. Campos com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>
  <form onSubmit={handleSubmit(handleFormSubmit, handleFormErrors)} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações Básicas</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codigoProduto">Código do Produto *</Label>
                <Input
                  data-testid="input-codigo-produto"
                  id="codigoProduto"
                  {...register('codigoProduto')}
                  onChange={(e) => {
                    register('codigoProduto').onChange(e);
                    setCodigoBusca(e.target.value);
                  }}
                  placeholder="Ex: 160631"
                />
                {errors.codigoProduto && (
                  <p className="text-sm text-destructive">{errors.codigoProduto.message}</p>
                )}
                {modeloFetching && (
                  <p className="text-sm text-muted-foreground">Buscando modelo...</p>
                )}
                {!modeloFetching && modeloIsError && (
                  <p className="text-sm text-destructive">Código não localizado</p>
                )}
                {modeloEncontrado && !initialData && modeloEncontrado.codigoProduto && String(modeloEncontrado.codigoProduto).trim() === String(codigoBusca).trim() && (
                  <p className="text-sm text-green-600">✓ Modelo encontrado: {modeloEncontrado.descricao}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Alimento *</Label>
                <Input
                  data-testid="input-nome"
                  id="nome"
                  {...register('nome')}
                  placeholder="Ex: Miúdo salgado de suíno"
                />
                {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade *</Label>
                <Select
                  value={unidade}
                  onValueChange={(value) => setValue('unidade', value as 'kg' | 'caixa')}
                >
                  <SelectTrigger data-testid="select-unidade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Quilograma (kg)</SelectItem>
                    <SelectItem value="caixa">Caixa</SelectItem>
                  </SelectContent>
                </Select>
                {errors.unidade && <p className="text-sm text-destructive">{errors.unidade.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lote">Lote</Label>
                <Input
                  data-testid="input-lote"
                  id="lote"
                  {...register('lote')}
                  placeholder="Ex: L123456 (opcional)"
                />
                {errors.lote && <p className="text-sm text-destructive">{errors.lote.message}</p>}
              </div>
            </div>
          </div>

          {/* Quantidade */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quantidade</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantidade">
                  {unidade === 'caixa' ? 'Quantidade de Caixas *' : 'Quantidade (kg) *'}
                </Label>
                <Input
                  data-testid="input-quantidade"
                  id="quantidade"
                  type="number"
                  step="0.01"
                  {...register('quantidade', { valueAsNumber: true })}
                  placeholder={unidade === 'caixa' ? 'Ex: 10' : 'Ex: 15.5'}
                />
                {errors.quantidade && (
                  <p className="text-sm text-destructive">{errors.quantidade.message}</p>
                )}
              </div>

              {unidade === 'caixa' && (
                <div className="space-y-2">
                  <Label htmlFor="pesoPorCaixa">Peso por Caixa (kg) *</Label>
                  <Input
                    data-testid="input-peso-por-caixa"
                    id="pesoPorCaixa"
                    type="number"
                    step="0.01"
                    {...register('pesoPorCaixa', { valueAsNumber: true })}
                    placeholder="Ex: 15.0"
                  />
                  {errors.pesoPorCaixa && (
                    <p className="text-sm text-destructive">{errors.pesoPorCaixa.message}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Datas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Datas</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dataFabricacao">Data de Fabricação *</Label>
                <Input
                  data-testid="input-data-fabricacao"
                  id="dataFabricacao"
                  type="date"
                  {...register('dataFabricacao')}
                />
                {errors.dataFabricacao && (
                  <p className="text-sm text-destructive">{errors.dataFabricacao.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataValidade">Data de Validade *</Label>
                <Input
                  data-testid="input-data-validade"
                  id="dataValidade"
                  type="date"
                  {...register('dataValidade')}
                />
                {errors.dataValidade && (
                  <p className="text-sm text-destructive">{errors.dataValidade.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Armazenamento */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Armazenamento</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="temperatura">Temperatura *</Label>
                <Input
                  data-testid="input-temperatura"
                  id="temperatura"
                  {...register('temperatura')}
                  placeholder="Ex: 8°C a 25°C"
                />
                {errors.temperatura && (
                  <p className="text-sm text-destructive">{errors.temperatura.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shelfLife">Shelf Life (dias) *</Label>
                <Input
                  data-testid="input-shelf-life"
                  id="shelfLife"
                  type="number"
                  {...register('shelfLife', { valueAsNumber: true })}
                  placeholder="Ex: 75"
                />
                {errors.shelfLife && (
                  <p className="text-sm text-destructive">{errors.shelfLife.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Configurações de Alertas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configurações de Alertas</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="contarAPartirFabricacaoDias">
                  Contar a partir da fabricação (dias)
                </Label>
                <Input
                  data-testid="input-contar-dias"
                  id="contarAPartirFabricacaoDias"
                  type="number"
                  {...register('alertasConfig.contarAPartirFabricacaoDias', { valueAsNumber: true })}
                  placeholder="10"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  data-testid="checkbox-um-terco-validade"
                  id="avisoQuandoUmTercoValidade"
                  checked={alertasConfig?.avisoQuandoUmTercoValidade}
                  onCheckedChange={(checked) =>
                    setValue('alertasConfig.avisoQuandoUmTercoValidade', checked as boolean)
                  }
                />
                <Label htmlFor="avisoQuandoUmTercoValidade" className="cursor-pointer">
                  Aviso quando atingir 1/3 da validade
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  data-testid="checkbox-popup-notificacoes"
                  id="popUpNotificacoes"
                  checked={alertasConfig?.popUpNotificacoes}
                  onCheckedChange={(checked) =>
                    setValue('alertasConfig.popUpNotificacoes', checked as boolean)
                  }
                />
                <Label htmlFor="popUpNotificacoes" className="cursor-pointer">
                  Ativar notificações pop-up
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              data-testid="button-cancel"
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button data-testid="button-submit" type="submit">
              {initialData ? 'Salvar Alterações' : 'Cadastrar Alimento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
