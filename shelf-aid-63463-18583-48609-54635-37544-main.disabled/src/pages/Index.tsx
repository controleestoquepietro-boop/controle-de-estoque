import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alimento, AlimentoComputado, AlimentoFormData } from '@/types/alimento';
import { AlimentoList } from '@/components/AlimentoList';
import { AlimentoForm } from '@/components/AlimentoForm';
import { SaidaDialog } from '@/components/SaidaDialog';
import { calcularCamposComputados } from '@/lib/alimentoUtils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'controle-estoque-alimentos';

export default function Index() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [alimentosComputados, setAlimentosComputados] = useState<AlimentoComputado[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [saidaDialogOpen, setSaidaDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Alimento | undefined>();
  const [alimentoParaSaida, setAlimentoParaSaida] = useState<AlimentoComputado | null>(null);
  const notificationsShownRef = useRef<Set<string>>(new Set());

  // Verificar autenticação
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  // Carregar dados do localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAlimentos(parsed);
      } catch (error) {
        console.error('Erro ao carregar alimentos:', error);
      }
    }
  }, []);

  // Salvar no localStorage e recalcular campos computados
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alimentos));
    const computados = alimentos.map(calcularCamposComputados);
    setAlimentosComputados(computados);
  }, [alimentos]);

  // Sistema de notificações pop-up
  useEffect(() => {
    alimentosComputados.forEach((alimento) => {
      // Só mostra notificações se configurado
      if (!alimento.alertas.popUpNotificacoes) return;

      const notificationKey = `${alimento.codigo}`;
      
      // Notificação de vencido
      if (alimento.status === 'VENCIDO' && !notificationsShownRef.current.has(`${notificationKey}-vencido`)) {
        toast.error(`⚠️ Alimento Vencido: ${alimento.nome}`, {
          description: `O produto venceu há ${Math.abs(alimento.diasRestantes)} dias. Lote: ${alimento.lote}`,
          duration: 10000,
        });
        notificationsShownRef.current.add(`${notificationKey}-vencido`);
      }

      // Notificação de vence em breve
      if (alimento.status === 'VENCE EM BREVE' && !notificationsShownRef.current.has(`${notificationKey}-vencebreve`)) {
        toast.warning(`⏰ Atenção: ${alimento.nome}`, {
          description: `Este produto vence em ${alimento.diasRestantes} dias. Lote: ${alimento.lote}`,
          duration: 8000,
        });
        notificationsShownRef.current.add(`${notificationKey}-vencebreve`);
      }

      // Notificação de 1/3 da validade (alerta amarelo)
      if (alimento.alerta === 'AMARELO' && alimento.status === 'ATIVO' && !notificationsShownRef.current.has(`${notificationKey}-umterco`)) {
        toast.warning(`📊 Alerta de Estoque: ${alimento.nome}`, {
          description: `Atingiu 1/3 da validade (${alimento.diasRestantes} dias restantes). Lote: ${alimento.lote}`,
          duration: 8000,
        });
        notificationsShownRef.current.add(`${notificationKey}-umterco`);
      }

      // Notificação de saída/venda
      if (alimento.dataSaida && !notificationsShownRef.current.has(`${notificationKey}-vendido`)) {
        toast.success(`✅ Produto Vendido: ${alimento.nome}`, {
          description: `Saída registrada em ${alimento.dataSaida}. Quantidade: ${alimento.quantidade} ${alimento.unidade}`,
          duration: 6000,
        });
        notificationsShownRef.current.add(`${notificationKey}-vendido`);
      }
    });
  }, [alimentosComputados]);

  const handleNovo = () => {
    setEditando(undefined);
    setFormOpen(true);
  };

  const handleEditar = (alimento: AlimentoComputado) => {
    setEditando(alimento);
    setFormOpen(true);
  };

  const handleSubmit = (data: AlimentoFormData) => {
    const metadata = {
      timestampCadastro: new Date().toISOString(),
      usuarioResponsavel: 'Sistema', // TODO: Implementar autenticação
    };

    if (editando) {
      // Editar - manter metadata original e cadastradoPor
      setAlimentos((prev) =>
        prev.map((m) => 
          m.codigo === editando.codigo 
            ? { ...data, codigo: m.codigo, metadata: m.metadata, cadastradoPor: m.cadastradoPor } 
            : m
        )
      );
      toast.success('Alimento atualizado com sucesso!');
    } else {
      // Novo
      const novoCodigo = alimentos.length > 0 ? Math.max(...alimentos.map((m) => m.codigo)) + 1 : 1;
      const novoAlimento: Alimento = { 
        ...data, 
        codigo: novoCodigo, 
        metadata,
        cadastradoPor: user?.nome || 'Sistema'
      };
      setAlimentos((prev) => [...prev, novoAlimento]);
      toast.success('Alimento cadastrado com sucesso!');
    }
  };

  const handleExcluir = (codigo: number) => {
    setAlimentos((prev) => prev.filter((m) => m.codigo !== codigo));
    toast.success('Alimento excluído com sucesso!');
  };

  const handleRegistrarSaida = (codigo: number) => {
    const alimento = alimentosComputados.find((a) => a.codigo === codigo);
    if (alimento) {
      setAlimentoParaSaida(alimento);
      setSaidaDialogOpen(true);
    }
  };

  const handleConfirmarSaida = (quantidadeSaida: number) => {
    if (!alimentoParaSaida) return;

    const dataAtual = new Date().toISOString().split('T')[0];
    
    setAlimentos((prev) =>
      prev.map((m) => {
        if (m.codigo === alimentoParaSaida.codigo) {
          const novaQuantidade = m.quantidade - quantidadeSaida;
          
          // Se a quantidade chegar a zero, marca a data de saída
          if (novaQuantidade <= 0) {
            return { ...m, quantidade: 0, dataSaida: dataAtual };
          }
          
          // Caso contrário, apenas diminui a quantidade
          return { ...m, quantidade: novaQuantidade };
        }
        return m;
      })
    );

    toast.success(
      `Saída registrada: ${quantidadeSaida} ${alimentoParaSaida.unidade} de ${alimentoParaSaida.nome}`
    );
  };

  const handleLogout = () => {
    logout();
    toast.info('Você saiu do sistema');
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Olá, <strong>{user.nome}</strong>
            </span>
          </div>
          <div className="flex gap-2 items-center">
        
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
        <AlimentoList
          alimentos={alimentosComputados}
          onNovo={handleNovo}
          onEditar={handleEditar}
          onExcluir={handleExcluir}
          onRegistrarSaida={handleRegistrarSaida}
        />
        <AlimentoForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleSubmit}
          initialData={editando}
        />
        <SaidaDialog
          open={saidaDialogOpen}
          onClose={() => setSaidaDialogOpen(false)}
          onConfirm={handleConfirmarSaida}
          alimento={alimentoParaSaida}
        />
      </div>
    </div>
  );
}
