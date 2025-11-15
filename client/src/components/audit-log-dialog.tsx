import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, User, FileText } from 'lucide-react';
import type { AuditLog } from '@shared/schema';
type AuditLogWithExtras = AuditLog & { userColor?: string; changes?: any };
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLogDialogProps {
  open: boolean;
  onClose: () => void;
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    CREATE: 'Cadastro',
    UPDATE: 'Edição',
    DELETE: 'Exclusão',
    SAIDA: 'Saída',
  };
  return labels[action] || action;
}

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    CREATE: 'default',
    UPDATE: 'secondary',
    DELETE: 'destructive',
    SAIDA: 'outline',
  };
  return colors[action] || 'default';
}

// Função para gerar um hash consistente para strings
function hashCode(str: string | null | undefined): number {
  if (!str) return 200; // hsl(200, ...) como fallback para valores indefinidos
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function AuditLogDialog({ open, onClose }: AuditLogDialogProps) {
  const { data: logs = [], isLoading } = useQuery<AuditLogWithExtras[], any>({
    queryKey: ['audit-log'],
    enabled: open,
    queryFn: async () => {
      const data = await (await import('@/lib/queryClient')).apiRequest('GET', '/api/audit-log');
      return data || [];
    }
  });

  // Ordena os logs por timestamp (mais recentes primeiro)
  const sortedLogs = [...logs].sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    return tb - ta;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Histórico de Auditoria</DialogTitle>
          <DialogDescription>
            Visualize todas as operações realizadas no sistema (cadastros, edições, exclusões e saídas)
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhum registro de auditoria encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedLogs.map((log) => {
                const userColor = (log as any).userColor ?? `hsl(${hashCode(log.userName) % 360}, 70%, 40%)`;
                const changes = (log as any).changes as Record<string, any> | undefined;
                return (
                  <div
                    key={log.id}
                    data-testid={`audit-log-${log.id}`}
                    className="border rounded-lg p-4 hover-elevate"
                  >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={getActionColor(log.action) as any} data-testid={`badge-action-${log.id}`}>
                        {getActionLabel(log.action)}
                      </Badge>
                      {log.alimentoNome && (
                        <span className="font-semibold" data-testid={`text-alimento-${log.id}`}>
                          {log.alimentoNome}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(log.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm">
                    {log.alimentoCodigo && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Código:</span>
                        <span className="font-mono">{log.alimentoCodigo}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Usuário:</span>
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: (log.userColor as string) || `hsl(${hashCode(log.userName) % 360}, 70%, 40%)` }}
                        />
                        <span className="font-medium">{log.userName}</span>
                      </div>
                    </div>

                    {log.action === 'SAIDA' && log.changes && (
                      <div className="mt-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Quantidade retirada:</span>
                          <span className="font-semibold">{log.changes.quantidadeSaida}</span>
                        </div>
                        {log.changes.quantidadeInicial !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Quantidade cadastrada:</span>
                            <span>{log.changes.quantidadeInicial}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Estoque atual:</span>
                          <span>{log.changes.estoqueDepois}</span>
                        </div>
                      </div>
                    )}

                    {log.changes && typeof log.changes === 'object' && Object.keys(log.changes as Record<string, any>).length > 0 && (
                      <div className="mt-2 p-3 bg-muted rounded-md">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Detalhes:</p>
                        <div className="space-y-1 text-xs">
                          {log.action === 'SAIDA' ? (
                            <div className="grid grid-cols-1 gap-1 text-sm">
                              <div className="flex gap-2 items-center">
                                <span className="text-muted-foreground">Quantidade saída:</span>
                                <span className="font-mono">{(log.changes as any).quantidadeSaida}</span>
                              </div>
                              {(log.changes as any).quantidadeInicial !== undefined && (
                                <div className="flex gap-2 items-center">
                                  <span className="text-muted-foreground">Quantidade cadastrada:</span>
                                  <span className="font-mono">{(log.changes as any).quantidadeInicial}</span>
                                </div>
                              )}
                              <div className="flex gap-2 items-center">
                                <span className="text-muted-foreground">Estoque atual:</span>
                                <span className="font-mono">{(log.changes as any).estoqueDepois}</span>
                              </div>
                            </div>
                          ) : (
                            Object.entries(log.changes as Record<string, any>).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="text-muted-foreground">{key}:</span>
                                <span className="font-mono">{JSON.stringify(value)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
