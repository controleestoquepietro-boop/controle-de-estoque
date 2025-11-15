import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlimentoFormData, Alimento } from '@/types/alimento';
import { useEffect } from 'react';

const alimentoSchema = z.object({
  codigoProduto: z.string().min(1, 'Código do produto é obrigatório'),
  nome: z.string().min(1, 'Nome do produto é obrigatório'),
  unidade: z.enum(['kg', 'caixa'], { errorMap: () => ({ message: 'Unidade deve ser kg ou caixa' }) }),
  lote: z.string().min(1, 'Lote é obrigatório'),
  dataFabricacao: z.string().min(1, 'Data de fabricação é obrigatória'),
  dataValidade: z.string().min(1, 'Data de validade é obrigatória'),
  quantidade: z.coerce.number().min(0, 'Quantidade deve ser maior ou igual a 0'),
  pesoPorCaixa: z.coerce.number().optional(),
  temperatura: z.string().min(1, 'Temperatura é obrigatória'),
  shelfLife: z.coerce.number().min(1, 'Shelf life deve ser maior que 0'),
  dataEntrada: z.string().min(1, 'Data de entrada é obrigatória'),
  departamento: z.string().min(1, 'Departamento é obrigatório'),
  alertas: z.object({
    contarAPartirFabricacaoDias: z.coerce.number().min(1, 'Deve ser pelo menos 1 dia'),
    avisoQuandoUmTercoValidade: z.boolean(),
    popUpNotificacoes: z.boolean(),
  }),
}).refine(
  (data) => {
    const fabricacao = new Date(data.dataFabricacao);
    const validade = new Date(data.dataValidade);
    return validade > fabricacao;
  },
  {
    message: 'Data de validade deve ser posterior à data de fabricação',
    path: ['dataValidade'],
  }
).refine(
  (data) => {
    const fabricacao = new Date(data.dataFabricacao);
    const entrada = new Date(data.dataEntrada);
    return entrada >= fabricacao;
  },
  {
    message: 'Data de entrada deve ser posterior ou igual à data de fabricação',
    path: ['dataEntrada'],
  }
);

type AlimentoFormValues = z.infer<typeof alimentoSchema>;

interface AlimentoFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AlimentoFormData) => void;
  initialData?: Alimento;
}

export function AlimentoForm({ open, onClose, onSubmit, initialData }: AlimentoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AlimentoFormValues>({
    resolver: zodResolver(alimentoSchema),
    defaultValues: initialData
      ? {
          codigoProduto: initialData.codigoProduto,
          nome: initialData.nome,
          unidade: initialData.unidade,
          lote: initialData.lote,
          dataFabricacao: initialData.dataFabricacao,
          dataValidade: initialData.dataValidade,
          quantidade: initialData.quantidade,
          pesoPorCaixa: initialData.pesoPorCaixa,
          temperatura: initialData.temperatura,
          shelfLife: initialData.shelfLife,
          dataEntrada: initialData.dataEntrada,
          departamento: initialData.departamento,
          alertas: initialData.alertas,
        }
      : {
          codigoProduto: '',
          nome: '',
          unidade: 'kg',
          lote: '',
          dataFabricacao: '',
          dataValidade: '',
          quantidade: 0,
          pesoPorCaixa: undefined,
          temperatura: '',
          shelfLife: 0,
          dataEntrada: new Date().toISOString().split('T')[0],
          departamento: '',
          alertas: {
            contarAPartirFabricacaoDias: 10,
            avisoQuandoUmTercoValidade: true,
            popUpNotificacoes: true,
          },
        },
  });

    // ✅ Atualiza o formulário sempre que initialData mudar
  useEffect(() => {
    if (initialData) {
      reset({
        codigoProduto: initialData.codigoProduto,
        nome: initialData.nome,
        unidade: initialData.unidade,
        lote: initialData.lote,
        dataFabricacao: initialData.dataFabricacao,
        dataValidade: initialData.dataValidade,
        quantidade: initialData.quantidade,
        pesoPorCaixa: initialData.pesoPorCaixa,
        temperatura: initialData.temperatura,
        shelfLife: initialData.shelfLife,
        dataEntrada: initialData.dataEntrada,
        departamento: initialData.departamento,
        alertas: initialData.alertas,
      });
    } else {
      // Se for novo cadastro, limpa o formulário
      reset({
        codigoProduto: '',
        nome: '',
        unidade: 'kg',
        lote: '',
        dataFabricacao: '',
        dataValidade: '',
        quantidade: 0,
        pesoPorCaixa: undefined,
        temperatura: '',
        shelfLife: 0,
        dataEntrada: new Date().toISOString().split('T')[0],
        departamento: '',
        alertas: {
          contarAPartirFabricacaoDias: 10,
          avisoQuandoUmTercoValidade: true,
          popUpNotificacoes: true,
        },
      });
    }
  }, [initialData, reset]);


  const handleFormSubmit = (data: AlimentoFormValues) => {
    onSubmit(data as AlimentoFormData);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Alimento' : 'Novo Alimento'}</DialogTitle>
          <DialogDescription>
            Preencha os dados do alimento. Os campos computados serão calculados automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações Básicas</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codigoProduto">Código do Produto *</Label>
                <Input
                  id="codigoProduto"
                  {...register('codigoProduto')}
                  placeholder="Ex: PROD-001"
                />
                {errors.codigoProduto && (
                  <p className="text-sm text-destructive">{errors.codigoProduto.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Produto *</Label>
                <Input
                  id="nome"
                  {...register('nome')}
                  placeholder="Ex: Pernil"
                />
                {errors.nome && (
                  <p className="text-sm text-destructive">{errors.nome.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade *</Label>
                <select id="unidade" {...register('unidade')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="kg">kg</option>
                  <option value="caixa">caixa</option>
                </select>
                {errors.unidade && (
                  <p className="text-sm text-destructive">{errors.unidade.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input id="quantidade" type="number" {...register('quantidade')} placeholder="0" />
                {errors.quantidade && (
                  <p className="text-sm text-destructive">{errors.quantidade.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pesoPorCaixa">Peso por Caixa (kg)</Label>
                <Input id="pesoPorCaixa" type="number" step="0.01" {...register('pesoPorCaixa')} placeholder="Opcional" />
                {errors.pesoPorCaixa && (
                  <p className="text-sm text-destructive">{errors.pesoPorCaixa.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lote">Lote *</Label>
                <Input id="lote" {...register('lote')} placeholder="Ex: L123456" />
                {errors.lote && <p className="text-sm text-destructive">{errors.lote.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="departamento">Departamento *</Label>
                <Input
                  id="departamento"
                  {...register('departamento')}
                  placeholder="Ex: Despensa"
                />
                {errors.departamento && (
                  <p className="text-sm text-destructive">{errors.departamento.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperatura">Temperatura (°C) *</Label>
                <Input
                  id="temperatura"
                  {...register('temperatura')}
                  placeholder="Ex: -18°C a -20°C"
                />
                {errors.temperatura && (
                  <p className="text-sm text-destructive">{errors.temperatura.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shelfLife">Shelf Life (dias) *</Label>
                <Input id="shelfLife" type="number" {...register('shelfLife')} placeholder="Ex: 365" />
                {errors.shelfLife && (
                  <p className="text-sm text-destructive">{errors.shelfLife.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Datas</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dataFabricacao">Data de Fabricação *</Label>
                <Input id="dataFabricacao" type="date" {...register('dataFabricacao')} />
                {errors.dataFabricacao && (
                  <p className="text-sm text-destructive">{errors.dataFabricacao.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataValidade">Data de Validade *</Label>
                <Input id="dataValidade" type="date" {...register('dataValidade')} />
                {errors.dataValidade && (
                  <p className="text-sm text-destructive">{errors.dataValidade.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataEntrada">Data de Entrada *</Label>
                <Input id="dataEntrada" type="date" {...register('dataEntrada')} />
                {errors.dataEntrada && (
                  <p className="text-sm text-destructive">{errors.dataEntrada.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configurações de Alertas</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="alertas.contarAPartirFabricacaoDias">
                  Dias após fabricação para inspeção *
                </Label>
                <Input
                  id="alertas.contarAPartirFabricacaoDias"
                  type="number"
                  {...register('alertas.contarAPartirFabricacaoDias')}
                  placeholder="10"
                />
                {errors.alertas?.contarAPartirFabricacaoDias && (
                  <p className="text-sm text-destructive">
                    {errors.alertas.contarAPartirFabricacaoDias.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="alertas.avisoQuandoUmTercoValidade"
                  {...register('alertas.avisoQuandoUmTercoValidade')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="alertas.avisoQuandoUmTercoValidade">
                  Avisar quando atingir 1/3 da validade
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="alertas.popUpNotificacoes"
                  {...register('alertas.popUpNotificacoes')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="alertas.popUpNotificacoes">
                  Ativar notificações pop-up
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? 'Salvar Alterações' : 'Cadastrar Alimento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
