import { useEffect, useState, useRef } from 'react';
import { Bell, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AlimentoComputado } from '@shared/schema';

interface NotificationsPanelProps {
  alimentos: AlimentoComputado[];
}

interface Notification {
  id: string;
  type: 'warning' | 'danger' | 'expired';
  message: string;
  alimento: AlimentoComputado;
}

export function NotificationsPanel({ alimentos }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const newNotifications: Notification[] = [];
    const today = new Date();
    
    alimentos.forEach((alimento) => {
      const notifId = `${alimento.id}-${alimento.dataValidade}`;
      
      if (dismissed.has(notifId)) {
        return;
      }

      const validade = new Date(alimento.dataValidade);
      const fabricacao = new Date(alimento.dataFabricacao);
      const diasTotais = Math.floor((validade.getTime() - fabricacao.getTime()) / (1000 * 60 * 60 * 24));
      const umTerco = Math.floor(diasTotais / 3);
      const diasRestantes = alimento.diasRestantes;

      if (alimento.status === 'VENCIDO') {
        newNotifications.push({
          id: notifId,
          type: 'expired',
          message: `${alimento.nome} (Lote ${alimento.lote}) está VENCIDO! Por favor, dar baixa no estoque.`,
          alimento,
        });
      } else if (diasRestantes <= 7 && diasRestantes > 0) {
        newNotifications.push({
          id: notifId,
          type: 'danger',
          message: `${alimento.nome} (Lote ${alimento.lote}) vence em ${diasRestantes} dia${diasRestantes > 1 ? 's' : ''}!`,
          alimento,
        });
      } else if (diasRestantes <= umTerco && diasRestantes > 7 && alimento.alertasConfig.avisoQuandoUmTercoValidade) {
        newNotifications.push({
          id: notifId,
          type: 'warning',
          message: `${alimento.nome} (Lote ${alimento.lote}) atingiu 1/3 da validade (${diasRestantes} dias restantes).`,
          alimento,
        });
      }
    });

    setNotifications(newNotifications);

    // Abrir automaticamente quando houver novas notificações
    if (newNotifications.length > 0) {
      setIsOpen(true);
      try { localStorage.setItem('lastPopupNotifications', String(Date.now())); } catch(e){}
    } else {
      // se não houver notificações, fechar o painel automaticamente
      setIsOpen(false);
    }
  }, [alimentos, dismissed]);

  // Mostrar o popup pela primeira vez ou a cada 2 horas
  useEffect(() => {
    let mounted = true;
    try {
      const last = Number(localStorage.getItem('lastPopupNotifications') || '0');
      const now = Date.now();
      const TWO_HOURS = 2 * 60 * 60 * 1000;
      if (!last || now - last > TWO_HOURS) {
        setIsOpen(true);
        localStorage.setItem('lastPopupNotifications', String(now));
      }
      // Reabrir automaticamente a cada 2 horas enquanto a aba estiver aberta
      const interval = setInterval(() => {
        if (!mounted) return;
        setIsOpen(true);
        localStorage.setItem('lastPopupNotifications', String(Date.now()));
      }, TWO_HOURS);
      return () => { mounted = false; clearInterval(interval); };
    } catch (e) {
      return () => {};
    }
  }, []);

  // Fechar ao clicar fora do painel
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!isOpen) return;
      if (panelRef.current && panelRef.current.contains(target)) return;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const dismissNotification = (id: string) => {
    setDismissed(prev => new Set(Array.from(prev).concat(id)));
  };

  const unreadCount = notifications.length;

  if (unreadCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <Button
          data-testid="button-notifications"
          onClick={() => setIsOpen(true)}
          variant="default"
          size="icon"
          ref={buttonRef}
          className="h-12 w-12 rounded-full shadow-lg relative flex items-center justify-center overflow-visible"
        >
          <Bell className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 z-20" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute top-0 right-0 translate-x-[90%] -translate-y-[40%] h-5 w-5 rounded-full p-0 flex items-center justify-center ring-2 ring-card text-xs z-30"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      )}

      {isOpen && (
        <div ref={panelRef}>
          <Card className="w-96 max-h-96 overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <h3 className="font-semibold">Notificações</h3>
                <Badge variant="secondary">{unreadCount}</Badge>
              </div>
              <Button
                data-testid="button-close-notifications"
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-2">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhuma notificação</div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      data-testid={`notification-${notif.type}`}
                      className={`p-3 rounded-lg border shadow-sm ${
                        notif.type === 'expired'
                          ? 'bg-destructive/5 border-destructive'
                          : notif.type === 'danger'
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <AlertTriangle
                            className={`h-5 w-5 ${
                              notif.type === 'expired'
                                ? 'text-destructive'
                                : notif.type === 'danger'
                                ? 'text-orange-500'
                                : 'text-yellow-600'
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{notif.alimento.nome} <span className="font-normal">({notif.alimento.lote})</span></p>
                          <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                          <div className="mt-2 text-xs text-muted-foreground flex gap-4">
                            <span>Validade: <span className="font-medium">{notif.alimento.dataValidade}</span></span>
                            <span>Qtd: <span className="font-medium">{notif.alimento.quantidade} {notif.alimento.unidade}</span></span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Button
                            data-testid={`button-dismiss-${notif.id}`}
                            variant="ghost"
                            size="icon"
                            onClick={() => dismissNotification(notif.id)}
                            className="h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
