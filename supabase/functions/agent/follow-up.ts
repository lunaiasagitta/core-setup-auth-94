import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface FollowUpRule {
  stage: string;
  hoursAfterLastMessage: number;
  message: (leadName: string, leadNeed: string) => string;
  nextStage?: string;
}

const FOLLOW_UP_RULES: FollowUpRule[] = [
  {
    stage: 'Apresentação Enviada',
    hoursAfterLastMessage: 24,
    message: (name, need) => 
      `Oi ${name || 'amigo(a)'}! Conseguiu dar uma olhada na apresentação que te enviei sobre ${need || 'seu projeto'}? Ficou com alguma dúvida? 😊`
  },
  {
    stage: 'Apresentação Enviada',
    hoursAfterLastMessage: 48,
    message: (name, need) =>
      `${name || 'Olá'}, vi que você demonstrou interesse em ${need || 'nossos serviços'}. Ainda está pensando? Posso esclarecer alguma dúvida pra te ajudar a decidir? 💡`,
    nextStage: 'Segundo Contato'
  },
  {
    stage: 'Segundo Contato',
    hoursAfterLastMessage: 72,
    message: (name) =>
      `${name || 'Olá'}, entendo que pode estar avaliando opções. Só pra não perder a oportunidade: esse mês estamos com disponibilidade mais rápida. Vale a pena conversarmos? 📞`
  }
];

export async function scheduleFollowUps(
  leadId: string,
  supabaseUrl: string,
  supabaseKey: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Buscar lead e conversação
  const { data: lead } = await supabase
    .from('leads')
    .select('*, conversations(*)')
    .eq('id', leadId)
    .single();
  
  if (!lead || !lead.conversations?.[0]) return;
  
  // Buscar última mensagem
  const { data: lastMessage } = await supabase
    .from('messages')
    .select('timestamp')
    .eq('conversation_id', lead.conversations[0].id)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();
  
  if (!lastMessage) return;
  
  const lastMessageDate = new Date(lastMessage.timestamp);
  
  // Para cada regra aplicável ao stage atual
  for (const rule of FOLLOW_UP_RULES) {
    if (rule.stage !== lead.stage) continue;
    
    const scheduledFor = new Date(lastMessageDate);
    scheduledFor.setHours(scheduledFor.getHours() + rule.hoursAfterLastMessage);
    
    // Não agendar se já passou
    if (scheduledFor < new Date()) continue;
    
    // Verificar se já tem follow-up agendado
    const { data: existing } = await supabase
      .from('scheduled_messages')
      .select('id')
      .eq('lead_id', leadId)
      .eq('sent', false)
      .eq('canceled', false)
      .single();
    
    if (existing) continue;
    
    // Agendar
    await supabase.from('scheduled_messages').insert({
      lead_id: leadId,
      message: rule.message(lead.nome, lead.necessidade),
      scheduled_for: scheduledFor.toISOString()
    });
    
    console.log(`Follow-up agendado para lead ${leadId} em ${scheduledFor}`);
  }
}
