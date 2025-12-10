import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, set, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Check, ChevronsUpDown, User, Loader2, Clock } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAvailableSlots } from '@/lib/hooks/useAvailableSlots';

interface CreateMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedDate?: Date;
  preselectedTime?: string;
}

export const CreateMeetingModal = ({
  open,
  onOpenChange,
  preselectedDate,
  preselectedTime,
}: CreateMeetingModalProps) => {
  const [date, setDate] = useState<Date | undefined>(preselectedDate);
  const [selectedSlotId, setSelectedSlotId] = useState<string>();
  const [leadOpen, setLeadOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>();
  const [createNewLead, setCreateNewLead] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadCompany, setNewLeadCompany] = useState('');

  const queryClient = useQueryClient();

  // Sincronizar data quando o modal abrir ou preselectedDate mudar
  useEffect(() => {
    if (open && preselectedDate) {
      setDate(preselectedDate);
    }
  }, [open, preselectedDate]);

  // Carregar slots disponíveis quando a data mudar
  const { data: availableSlots = [], isLoading: loadingSlots } = useAvailableSlots(date);

  // Pré-selecionar slot se time foi fornecido
  useEffect(() => {
    if (preselectedTime && availableSlots.length > 0) {
      const matchingSlot = availableSlots.find((s: any) => 
        s.time.substring(0, 5) === preselectedTime
      );
      if (matchingSlot) {
        setSelectedSlotId(matchingSlot.id);
      }
    }
  }, [preselectedTime, availableSlots]);

  // Buscar leads existentes
  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, telefone, email, empresa')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const selectedLead = leads.find((l) => l.id === selectedLeadId);
  const selectedSlot = availableSlots.find((s: any) => s.id === selectedSlotId);

  const scheduleMeetingMutation = useMutation({
    mutationFn: async () => {
      if (!date || !selectedSlot) throw new Error('Selecione data e horário');
      
      // ✅ VALIDAÇÃO: Verificar se já existe reunião para este slot
      const scheduledDateStr = `${format(date, 'yyyy-MM-dd')}T${selectedSlot.time}-03:00`;
      const scheduledDate = new Date(scheduledDateStr);
      
      const { data: existingMeetings, error: checkError } = await supabase
        .from('meetings')
        .select('id')
        .eq('scheduled_date', scheduledDate.toISOString())
        .in('status', ['scheduled', 'confirmed'])
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingMeetings) {
        throw new Error('Já existe uma reunião agendada para este horário. Por favor, escolha outro slot.');
      }
      
      let leadId = selectedLeadId;

      // Criar novo lead se necessário
      if (createNewLead) {
        if (!newLeadName || !newLeadPhone) {
          throw new Error('Nome e telefone são obrigatórios');
        }

        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert({
            nome: newLeadName,
            telefone: newLeadPhone,
            email: newLeadEmail || null,
            empresa: newLeadCompany || null,
            stage: 'Reunião Agendada',
          })
          .select()
          .single();

        if (leadError) throw leadError;
        leadId = newLead.id;
      }

      if (!leadId) throw new Error('Selecione um lead');

      // Criar evento no Google Calendar
      const { data: googleData, error: googleError } = await supabase.functions.invoke(
        'google-calendar-create',
        {
          body: {
            leadId,
            scheduledDate: scheduledDate.toISOString(),
            duration: selectedSlot.duration,
          },
        }
      );

      if (googleError) throw googleError;
      if (!googleData?.success) throw new Error(googleData?.error || 'Erro ao criar evento no Google Calendar');

      // Criar reunião
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          lead_id: leadId,
          scheduled_date: scheduledDate.toISOString(),
          duration: selectedSlot.duration,
          status: 'scheduled',
          google_event_id: googleData.eventId,
          meeting_link: googleData.meetingLink,
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Reservar o slot
      await supabase
        .from('calendar_slots')
        .update({
          reserved_by: leadId,
          reserved_at: new Date().toISOString(),
          available: false,
        })
        .eq('id', selectedSlot.id);

      // Atualizar stage do lead
      if (!createNewLead) {
        await supabase
          .from('leads')
          .update({ stage: 'Reunião Agendada' })
          .eq('id', leadId);
      }

      // Registrar atividade
      await supabase.from('activity_log').insert({
        lead_id: leadId,
        event_type: 'meeting_scheduled',
        details: {
          date: scheduledDate.toISOString(),
          duration: selectedSlot.duration,
          meeting_id: meeting.id,
          meeting_link: googleData.meetingLink,
        },
      });

      // Criar notificação
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'meeting_scheduled',
          title: 'Reunião agendada',
          description: `Reunião com ${createNewLead ? newLeadName : selectedLead?.nome} marcada para ${format(scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
          link: `/leads/${leadId}`,
        });
      }

      return meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast({
        title: 'Reunião agendada',
        description: 'A reunião foi agendada com sucesso',
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao agendar reunião',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setDate(undefined);
    setSelectedSlotId(undefined);
    setSelectedLeadId(undefined);
    setCreateNewLead(false);
    setNewLeadName('');
    setNewLeadPhone('');
    setNewLeadEmail('');
    setNewLeadCompany('');
  };

  const canSchedule = selectedSlotId && (selectedLeadId || (createNewLead && newLeadName && newLeadPhone));
  
  console.log('[DEBUG] Estado atual:', {
    selectedSlotId,
    selectedLeadId,
    createNewLead,
    newLeadName,
    newLeadPhone,
    canSchedule,
    availableSlotsCount: availableSlots.length
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Agendar Reunião</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden">
          {/* Esquerda: Calendário */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Selecione uma Data</Label>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                className="rounded-md border"
              />
            </div>

            {/* Lead */}
            <div className="space-y-2">
              <Label>Lead</Label>
              {!createNewLead ? (
                <Popover open={leadOpen} onOpenChange={setLeadOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={leadOpen}
                      className="w-full justify-between"
                    >
                      {selectedLead ? selectedLead.nome : 'Selecione um lead...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar lead..." />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-4 text-center">
                            <p className="text-sm text-muted-foreground mb-2">Nenhum lead encontrado</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCreateNewLead(true);
                                setLeadOpen(false);
                              }}
                            >
                              <User className="mr-2 h-4 w-4" />
                              Criar novo lead
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {leads.map((lead) => (
                            <CommandItem
                              key={lead.id}
                              value={lead.nome || ''}
                              onSelect={() => {
                                setSelectedLeadId(lead.id);
                                setLeadOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedLeadId === lead.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div>
                                <div>{lead.nome}</div>
                                <div className="text-xs text-muted-foreground">
                                  {lead.telefone} {lead.empresa && `• ${lead.empresa}`}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <div className="p-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setCreateNewLead(true);
                              setLeadOpen(false);
                            }}
                          >
                            <User className="mr-2 h-4 w-4" />
                            Criar novo lead
                          </Button>
                        </div>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Novo Lead</span>
                    <Button variant="ghost" size="sm" onClick={() => setCreateNewLead(false)}>
                      Cancelar
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input
                        value={newLeadName}
                        onChange={(e) => setNewLeadName(e.target.value)}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone *</Label>
                      <Input
                        value={newLeadPhone}
                        onChange={(e) => setNewLeadPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newLeadEmail}
                        onChange={(e) => setNewLeadEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Empresa</Label>
                      <Input
                        value={newLeadCompany}
                        onChange={(e) => setNewLeadCompany(e.target.value)}
                        placeholder="Nome da empresa"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Direita: Slots Disponíveis */}
          <div className="space-y-2 flex flex-col overflow-hidden">
            <Label>Horários Disponíveis</Label>
            {!date ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Selecione uma data para ver os horários disponíveis
              </div>
            ) : loadingSlots ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Nenhum horário disponível para esta data
              </div>
            ) : (
              <ScrollArea className="flex-1 border rounded-md">
                <div className="p-2 space-y-2">
                  {availableSlots.map((slot: any) => {
                    const slotTime = slot.time.substring(0, 5);
                    const [hours, minutes] = slot.time.split(':').map(Number);
                    const endTime = new Date();
                    endTime.setHours(hours, minutes + slot.duration);
                    const endTimeStr = format(endTime, 'HH:mm');

                    return (
                      <Button
                        key={slot.id}
                        variant={selectedSlotId === slot.id ? 'default' : 'outline'}
                        className="w-full justify-start"
                        onClick={() => {
                          console.log('[DEBUG] Slot selecionado:', { slotId: slot.id, slotTime: slot.time });
                          setSelectedSlotId(slot.id);
                          console.log('[DEBUG] canSchedule será:', slot.id && (selectedLeadId || (createNewLead && newLeadName && newLeadPhone)));
                        }}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {slotTime} - {endTimeStr}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {slot.duration}min
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => scheduleMeetingMutation.mutate()}
            disabled={!canSchedule || scheduleMeetingMutation.isPending}
          >
            {scheduleMeetingMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Agendando...
              </>
            ) : (
              'Agendar Reunião'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
