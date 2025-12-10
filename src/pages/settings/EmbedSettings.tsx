import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const EmbedSettings = () => {
  const [copied, setCopied] = useState(false);
  const embedUrl = window.location.origin + '/chat-embed';
  
  const embedScript = `<!-- Widget de Chat Sagitta Digital -->
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = '${embedUrl}';
    iframe.style.cssText = 'position:fixed;bottom:20px;right:20px;width:400px;height:600px;border:none;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:9999';
    
    // Responsivo mobile
    if (window.innerWidth < 768) {
      iframe.style.cssText = 'position:fixed;bottom:0;right:0;left:0;top:0;width:100%;height:100%;border:none;z-index:9999';
    }
    
    document.body.appendChild(iframe);
  })();
</script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedScript);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Embed do Chat"
        description="Adicione o chat no seu site"
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Código de Embed */}
        <Card>
          <CardHeader>
            <CardTitle>Código de Instalação</CardTitle>
            <CardDescription>
              Cole este código antes do fechamento da tag &lt;/body&gt; no seu site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Textarea
                value={embedScript}
                readOnly
                className="font-mono text-xs h-64"
              />
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>URL do Widget</Label>
              <div className="flex gap-2">
                <Input value={embedUrl} readOnly />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(embedUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Veja como o chat aparecerá no seu site
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg bg-muted/50 h-96 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Simulação do seu site</p>
              </div>
              <iframe
                src={embedUrl}
                className="absolute bottom-5 right-5 w-[350px] h-[500px] border-none rounded-lg shadow-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Instruções */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Como Instalar</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-semibold bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">1</span>
                <span>Copie o código de instalação acima clicando no botão "Copiar"</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">2</span>
                <span>Abra o código HTML do seu site</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">3</span>
                <span>Cole o código antes do fechamento da tag &lt;/body&gt;</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">4</span>
                <span>Salve e publique seu site</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">5</span>
                <span>O widget aparecerá automaticamente no canto inferior direito</span>
              </li>
            </ol>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm font-semibold mb-2">💡 Dica</p>
              <p className="text-sm text-muted-foreground">
                O widget é totalmente responsivo e se adapta automaticamente para dispositivos móveis.
                Todas as conversas serão centralizadas no seu Inbox.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmbedSettings;