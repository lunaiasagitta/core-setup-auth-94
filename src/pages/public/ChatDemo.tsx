import { ChatWidget } from '@/components/chat/ChatWidget';
import { Button } from '@/components/ui/button';
import { Calendar, MessageSquare, Zap } from 'lucide-react';

const ChatDemo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Converse com Nossa IA
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Luna está disponível 24/7 para responder suas perguntas, agendar reuniões e ajudar com suas necessidades
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 rounded-lg bg-card border">
              <MessageSquare className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Respostas Instantâneas</h3>
              <p className="text-sm text-muted-foreground">
                Obtenha respostas rápidas e precisas para suas dúvidas
              </p>
            </div>
            
            <div className="p-6 rounded-lg bg-card border">
              <Calendar className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Agende Reuniões</h3>
              <p className="text-sm text-muted-foreground">
                Marque uma conversa com nossa equipe diretamente pelo chat
              </p>
            </div>
            
            <div className="p-6 rounded-lg bg-card border">
              <Zap className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Qualificação Inteligente</h3>
              <p className="text-sm text-muted-foreground">
                Nossa IA entende suas necessidades e conecta você com a solução certa
              </p>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Experimente Agora</h2>
            <p className="text-muted-foreground mb-6">
              Clique no botão de chat no canto inferior direito para começar
            </p>
            <div className="space-y-2 text-left max-w-md mx-auto">
              <p className="text-sm text-muted-foreground">💡 Perguntas que você pode fazer:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• "Quais serviços vocês oferecem?"</li>
                <li>• "Quanto custa um projeto de website?"</li>
                <li>• "Gostaria de agendar uma reunião"</li>
                <li>• "Me fale sobre gestão de tráfego pago"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default ChatDemo;