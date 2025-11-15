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
import type { AlimentoComputado } from '@shared/schema';

interface SaidaDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (quantidade: number) => void;
  alimento: AlimentoComputado | null;
}

export function SaidaDialog({ open, onClose, onConfirm, alimento }: SaidaDialogProps) {
  const [quantidade, setQuantidade] = useState<number>(0);

  const handleConfirm = () => {
    if (quantidade > 0 && quantidade <= (alimento?.quantidade || 0)) {
      onConfirm(quantidade);
      setQuantidade(0);
      onClose();
    }
  };

  const handleClose = () => {
    setQuantidade(0);
    onClose();
  };

  if (!alimento) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Saída</DialogTitle>
          <DialogDescription>
            Informe a quantidade que saiu do estoque de <strong>{alimento.nome}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Produto</span>
              <p className="font-medium">{alimento.nome}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Lote</span>
              <p className="font-medium font-mono">{alimento.lote}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Estoque Atual</span>
              <p className="font-medium">
                {alimento.quantidade} {alimento.unidade}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantidade-saida">Quantidade de Saída *</Label>
            <Input
              data-testid="input-quantidade-saida"
              id="quantidade-saida"
              type="number"
              step="0.01"
              min="0"
              max={alimento.quantidade}
              value={quantidade}
              onChange={(e) => setQuantidade(parseFloat(e.target.value) || 0)}
              placeholder={`Máximo: ${alimento.quantidade}`}
            />
            {quantidade > alimento.quantidade && (
              <p className="text-sm text-destructive">
                Quantidade não pode ser maior que o estoque atual
              </p>
            )}
          </div>

          {quantidade > 0 && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm">
                <span className="text-muted-foreground">Estoque após saída:</span>{' '}
                <strong>
                  {(alimento.quantidade - quantidade).toFixed(2)} {alimento.unidade}
                </strong>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button data-testid="button-cancel-saida" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            data-testid="button-confirm-saida"
            onClick={handleConfirm}
            disabled={quantidade <= 0 || quantidade > alimento.quantidade}
          >
            Confirmar Saída
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
