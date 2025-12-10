import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, Loader2, Bot, User, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tools?: string[];
}

interface LeadData {
  nome?: string;
  telefone: string;
  empresa?: string;
  necessidade?: string;
  stage?: string;
  score_bant?: number;
  bant_details?: any;
}

export default function TestAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [phone, setPhone] = useState('5511999999999');
  const [isLoading, setIsLoading] = useState(false);
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadLeadData = async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('telefone', phone)
      .single();

    if (data) {
      setLeadData(data);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const startTime = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke('orchestrator', {
        body: {
          phone,
          message: input,
          messageId: `test_${Date.now()}`,
        },
      });

      const duration = Date.now() - startTime;
      setResponseTime(duration);

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'Erro: sem resposta',
        timestamp: new Date(),
        tools: data.tools_used || [],
      };

      setMessages(prev => [...prev, assistantMessage]);
      await loadLeadData();

      toast.success(`Resposta em ${(duration / 1000).toFixed(2)}s`);
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(`Erro: ${error.message}`);
      
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Erro: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = async () => {
    setMessages([]);
    setLeadData(null);
    setResponseTime(null);
    toast.info('Conversa limpa');
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">🧪 Teste do Agente SDR</h1>
        <p className="text-muted-foreground mt-2">
          Simule conversas com o agente Luna para testar qualificação BANT e agendamento
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Area */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Conversa com Luna
              </CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Telefone (com DDI)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-40"
                />
                <Button variant="outline" size="sm" onClick={clearConversation}>
                  Limpar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea ref={scrollRef} className="h-[500px] pr-4">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Envie uma mensagem para começar o teste</p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {msg.role === 'assistant' ? (
                        <Bot className="w-4 h-4 mt-1 flex-shrink-0" />
                      ) : (
                        <User className="w-4 h-4 mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.tools && msg.tools.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {msg.tools.map((tool, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                <Zap className="w-3 h-3 mr-1" />
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs opacity-70 mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p>Luna está digitando...</p>
                </div>
              )}
            </ScrollArea>

            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Digite sua mensagem..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            {responseTime && (
              <p className="text-xs text-muted-foreground mt-2">
                Tempo de resposta: {(responseTime / 1000).toFixed(2)}s
              </p>
            )}
          </CardContent>
        </Card>

        {/* Lead Info Panel */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Dados do Lead</CardTitle>
          </CardHeader>
          <CardContent>
            {!leadData ? (
              <div className="text-center text-muted-foreground py-8">
                <p>Nenhum lead encontrado</p>
                <p className="text-sm mt-2">
                  Envie uma mensagem para criar um lead
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nome</p>
                  <p className="text-lg">{leadData.nome || '—'}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                  <p>{leadData.telefone}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Empresa</p>
                  <p>{leadData.empresa || '—'}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Necessidade</p>
                  <Badge variant="outline">{leadData.necessidade || 'Não identificada'}</Badge>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Stage</p>
                  <Badge>{leadData.stage || 'Novo'}</Badge>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Score BANT</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${leadData.score_bant || 0}%` }}
                      />
                    </div>
                    <span className="text-lg font-bold">{leadData.score_bant || 0}</span>
                  </div>
                </div>

                {leadData.bant_details && Object.keys(leadData.bant_details).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Detalhes BANT
                      </p>
                      <div className="space-y-2 text-xs">
                        {Object.entries(leadData.bant_details).map(([key, value]: [string, any]) => (
                          <div key={key} className="bg-muted p-2 rounded">
                            <p className="font-medium capitalize">{key}</p>
                            <p className="text-muted-foreground">{value.valor}</p>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {value.confianca}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Button onClick={loadLeadData} variant="outline" className="w-full mt-4">
                  Atualizar Dados
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Scenarios */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>🎬 Cenários de Teste Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setInput('Oi, quero um site para minha empresa')}
            >
              Lead - Website
            </Button>
            <Button
              variant="outline"
              onClick={() => setInput('Preciso desenvolver um aplicativo')}
            >
              Lead - App
            </Button>
            <Button
              variant="outline"
              onClick={() => setInput('Tenho R$ 30 mil de orçamento')}
            >
              BANT - Budget
            </Button>
            <Button
              variant="outline"
              onClick={() => setInput('Sou o dono da empresa')}
            >
              BANT - Authority
            </Button>
            <Button
              variant="outline"
              onClick={() => setInput('Sim, quero agendar uma reunião')}
            >
              Agendamento
            </Button>
            <Button
              variant="outline"
              onClick={() => setInput('Qual a forma de pagamento?')}
            >
              FAQ - Pagamento
            </Button>
            <Button
              variant="outline"
              onClick={() => setInput('Muito caro')}
            >
              Objeção - Preço
            </Button>
            <Button
              variant="outline"
              onClick={() => setInput('Quero falar com uma pessoa')}
            >
              Handoff
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
