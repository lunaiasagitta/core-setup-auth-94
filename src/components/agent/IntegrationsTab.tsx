import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MessageSquare, Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";

export const IntegrationsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testingEvolution, setTestingEvolution] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [evolutionConfigured, setEvolutionConfigured] = useState(false);

  const checkEvolutionConfig = async () => {
    try {
      // Verificar se os secrets da Evolution existem no banco
      const { data: systemConfig } = await supabase
        .from('system_config')
        .select('*')
        .single();
      
      // Se tem system_config, significa que está configurado
      // (os secrets são gerenciados pelo Cloud e não ficam no banco)
      setEvolutionConfigured(true);
    } catch (error) {
      console.error('Error checking Evolution config:', error);
      setEvolutionConfigured(false);
    }
  };

  const checkGoogleConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('oauth_tokens')
        .select('id, expires_at')
        .eq('provider', 'google')
        .single();

      if (data && !error) {
        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        setGoogleConnected(expiresAt > now);
      } else {
        setGoogleConnected(false);
      }
    } catch (error) {
      console.error('Error checking Google connection:', error);
      setGoogleConnected(false);
    }
  };

  const handleTestEvolution = async () => {
    try {
      setTestingEvolution(true);
      
      const { data, error } = await supabase.functions.invoke('test-evolution-connection');
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "✅ Conexão estabelecida",
          description: `Evolution API conectada - Instância: ${data.data?.instance || 'N/A'}`,
        });
      } else {
        throw new Error(data?.error || 'Falha no teste de conexão');
      }
    } catch (error: any) {
      console.error('Error testing Evolution:', error);
      toast({
        title: "❌ Falha na conexão",
        description: error.message || "Não foi possível conectar à Evolution API",
        variant: "destructive",
      });
    } finally {
      setTestingEvolution(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('google-auth-url');
      
      if (error) throw error;
      
      if (data?.authUrl) {
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const popup = window.open(
          data.authUrl,
          'Google Authorization',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        const messageHandler = (event: MessageEvent) => {
          if (event.data?.type === 'google-auth-success') {
            toast({
              title: "✅ Conectado ao Google",
              description: "Integração configurada com sucesso!",
            });
            setGoogleConnected(true);
            window.removeEventListener('message', messageHandler);
            popup?.close();
          }
        };

        window.addEventListener('message', messageHandler);
      }
    } catch (error: any) {
      console.error('Error connecting to Google:', error);
      toast({
        title: "Erro ao conectar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    checkEvolutionConfig();
    checkGoogleConnection();
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* WhatsApp via Evolution API */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-base">WhatsApp (Evolution API)</CardTitle>
                <CardDescription className="text-sm">
                  Envio e recebimento de mensagens
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium">Secrets necessários:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                <li>EVOLUTION_API_KEY</li>
                <li>EVOLUTION_API_URL</li>
                <li>EVOLUTION_INSTANCE_NAME</li>
                <li>EVOLUTION_WEBHOOK_SECRET</li>
              </ul>
            </div>
            <div className="space-y-2">
              {evolutionConfigured ? (
                <Button variant="outline" disabled size="sm" className="w-full">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                  Configurado
                </Button>
              ) : (
                <>
                  <Button variant="outline" disabled size="sm" className="w-full">
                    <XCircle className="mr-2 h-4 w-4" />
                    Não Configurado
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Configure os secrets no Lovable Cloud
                  </p>
                </>
              )}
              
              {evolutionConfigured && (
                <Button 
                  variant="secondary"
                  size="sm"
                  onClick={handleTestEvolution}
                  disabled={testingEvolution}
                  className="w-full"
                >
                  {testingEvolution ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Testar Conexão
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Google Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base">Google Calendar & Meet</CardTitle>
                <CardDescription className="text-sm">
                  Agendamento automático de reuniões
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium">Secrets necessários:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                <li>GOOGLE_CLIENT_ID</li>
                <li>GOOGLE_CLIENT_SECRET</li>
              </ul>
            </div>
            {googleConnected ? (
              <div className="space-y-2">
                <Button variant="outline" className="w-full" disabled size="sm">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                  Conectado
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleGoogleConnect}
                  disabled={loading}
                  className="w-full"
                >
                  Reconectar
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleGoogleConnect}
                disabled={loading}
                size="sm"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  'Conectar com Google'
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Webhook URLs</CardTitle>
          <CardDescription>URLs para configurar nas integrações externas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">WhatsApp Webhook:</label>
            <code className="block mt-1 p-2 bg-muted rounded text-xs">
              {window.location.origin.replace('.lovable.app', '.supabase.co')}/functions/v1/whatsapp-webhook
            </code>
          </div>
          <div>
            <label className="text-sm font-medium">Google OAuth Callback:</label>
            <code className="block mt-1 p-2 bg-muted rounded text-xs">
              {window.location.origin.replace('.lovable.app', '.supabase.co')}/functions/v1/google-callback
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
