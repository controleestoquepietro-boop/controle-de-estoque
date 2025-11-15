import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlimentoComputado } from '@/types/alimento';

interface SaidaDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (quantidade: number) => void;
  alimento: AlimentoComputado | null;
}

export function SaidaDialog({ open, onClose, onConfirm, alimento }: SaidaDialogProps) {
  const [quantidade, setQuantidade] = useState<number>(0);
  const [erro, setErro] = useState<string>('');

  const handleConfirm = () => {
    if (!alimento) return;
    
    if (quantidade <= 0) {
      setErro('Quantidade deve ser maior que zero');
      return;
    }

    if (quantidade > alimento.quantidade) {
      setErro(`Quantidade não pode ser maior que ${alimento.quantidade} ${alimento.unidade}`);
      return;
    }

    onConfirm(quantidade);
    setQuantidade(0);
    setErro('');
    onClose();
  };

  const handleClose = () => {
    setQuantidade(0);
    setErro('');
    onClose();
  };

  if (!alimento) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>Registrar Saída</DialogTitle>
          <DialogDescription>
            Informe a quantidade que está saindo do estoque. A data será registrada automaticamente como hoje.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Produto</Label>
            <p className="text-sm font-medium">{alimento.nome}</p>
          </div>

          <div className="space-y-2">
            <Label>Quantidade Disponível</Label>
            <p className="text-sm font-medium">
              {alimento.quantidade} {alimento.unidade}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade de Saída *</Label>
            <Input
              id="quantidade"
              type="number"
              min="0"
              max={alimento.quantidade}
              value={quantidade}
              onChange={(e) => {
                setQuantidade(Number(e.target.value));
                setErro('');
              }}
              placeholder={`Ex: ${alimento.quantidade}`}
            />
            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>

          <div className="space-y-2">
            <Label>Data de Saída</Label>
            <p className="text-sm font-medium">
              {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Confirmar Saída
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
