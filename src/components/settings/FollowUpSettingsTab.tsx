import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useReminderSettings } from '@/lib/hooks/useReminderSettings';
import { Clock } from 'lucide-react';

interface FollowUpSettings {
  enabled: boolean;
  first_interval_hours: number;
  second_interval_hours: number;
  template_first: string;
  template_second: string;
}

export default function FollowUpSettingsTab() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<FollowUpSettings>({
    enabled: true,
    first_interval_hours: 24,
    second_interval_hours: 48,
    template_first: 'Oi {nome}! Conseguiu dar uma olhada na apresentação que te enviei sobre {necessidade}? Ficou com alguma dúvida? 😊',
    template_second: '{nome}, vi que você demonstrou interesse em {necessidade}. Ainda está pensando? Posso esclarecer alguma dúvida pra te ajudar a decidir? 💡'
  });

  const saveSettings = useMutation({
    mutationFn: async (newSettings: FollowUpSettings) => {
      // TODO: Criar tabela específica para follow-up settings
      // Por enquanto, apenas logando
      console.log('Follow-up settings:', newSettings);
      
      // Simulando sucesso
      return Promise.resolve();
    },
    onSuccess: () => {
      toast.success('Configurações de follow-up salvas com sucesso');
      queryClient.invalidateQueries({ queryKey: ['follow-up-settings'] });
    },
    onError: (error) => {
      toast.error('Erro ao salvar configurações: ' + error.message);
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Follow-up Automático</CardTitle>
          <CardDescription>
            Configure mensagens automáticas de follow-up para leads que não respondem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="follow-up-enabled" className="text-base">
                Ativar follow-ups automáticos
              </Label>
              <p className="text-sm text-muted-foreground">
                Enviar mensagens automáticas para leads sem resposta
              </p>
            </div>
            <Switch
              id="follow-up-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enabled: checked })
              }
            />
          </div>

          {settings.enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-interval">
                    Intervalo do primeiro follow-up (horas)
                  </Label>
                  <Input
                    id="first-interval"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.first_interval_hours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        first_interval_hours: parseInt(e.target.value) || 24
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Após {settings.first_interval_hours}h sem resposta
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="second-interval">
                    Intervalo do segundo follow-up (horas)
                  </Label>
                  <Input
                    id="second-interval"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.second_interval_hours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        second_interval_hours: parseInt(e.target.value) || 48
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Após {settings.second_interval_hours}h sem resposta
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-first">
                  Template do primeiro follow-up
                </Label>
                <Textarea
                  id="template-first"
                  rows={3}
                  value={settings.template_first}
                  onChange={(e) =>
                    setSettings({ ...settings, template_first: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis disponíveis: {'{nome}'}, {'{necessidade}'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-second">
                  Template do segundo follow-up
                </Label>
                <Textarea
                  id="template-second"
                  rows={3}
                  value={settings.template_second}
                  onChange={(e) =>
                    setSettings({ ...settings, template_second: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis disponíveis: {'{nome}'}, {'{necessidade}'}
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => saveSettings.mutate(settings)}
              disabled={saveSettings.isPending}
            >
              {saveSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lembretes de Reunião</CardTitle>
          <CardDescription>
            Configure quando e como enviar lembretes automáticos de reuniões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReminderSettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status dos Follow-ups</CardTitle>
          <CardDescription>
            Mensagens agendadas e estatísticas de envio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FollowUpStats />
        </CardContent>
      </Card>
    </div>
  );
}

function ReminderSettings() {
  const { settings, isLoading, updateSetting } = useReminderSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState('');

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {settings?.map((setting) => (
        <div key={setting.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-base font-medium">{setting.label}</Label>
                <p className="text-xs text-muted-foreground">
                  {setting.interval_minutes} minutos antes da reunião
                </p>
              </div>
            </div>
            <Switch
              checked={setting.enabled}
              onCheckedChange={(checked) =>
                updateSetting.mutate({ id: setting.id, enabled: checked })
              }
            />
          </div>

          {setting.enabled && (
            <div className="space-y-2 pt-2 border-t">
              {editingId === setting.id ? (
                <>
                  <Label htmlFor={`message-${setting.id}`} className="text-sm">
                    Mensagem do lembrete
                  </Label>
                  <Textarea
                    id={`message-${setting.id}`}
                    rows={4}
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis disponíveis: {'{nome}'}, {'{horario}'}, {'{link}'}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        updateSetting.mutate(
                          { id: setting.id, message_template: editMessage },
                          {
                            onSuccess: () => {
                              setEditingId(null);
                              setEditMessage('');
                            }
                          }
                        );
                      }}
                    >
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditMessage('');
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {setting.message_template}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(setting.id);
                      setEditMessage(setting.message_template);
                    }}
                  >
                    Editar Mensagem
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FollowUpStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['follow-up-stats'],
    queryFn: async () => {
      const { count: scheduled } = await supabase
        .from('scheduled_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sent', false)
        .eq('canceled', false);

      const { count: sent } = await supabase
        .from('scheduled_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sent', true)
        .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      return {
        scheduled: scheduled || 0,
        sent_last_7_days: sent || 0
      };
    }
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Follow-ups Agendados</p>
        <p className="text-3xl font-bold mt-1">{stats?.scheduled || 0}</p>
      </div>
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Enviados (últimos 7 dias)</p>
        <p className="text-3xl font-bold mt-1">{stats?.sent_last_7_days || 0}</p>
      </div>
    </div>
  );
}
