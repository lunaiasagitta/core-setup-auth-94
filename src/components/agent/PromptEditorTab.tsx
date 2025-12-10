import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAgentPrompts } from "@/lib/hooks/useAgentPrompts";
import { Save, CheckCircle, Clock, Edit, MessageSquare, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const WHATSAPP_TOOLS = [
  { name: "CriaUsuarioCRM", desc: "Criar lead no CRM" },
  { name: "AtualizarNecessidadeLead", desc: "Atualizar dados do lead" },
  { name: "AtualizarStatusLead", desc: "Mudar stage do funil" },
  { name: "EnviarApresentacaoWhatsApp", desc: "Enviar PDF via WhatsApp" },
  { name: "BuscarSlotsWhatsApp", desc: "Buscar horários disponíveis" },
  { name: "AgendarReuniaoWhatsApp", desc: "Agendar reunião no Google Calendar" },
  { name: "EmFechamentoSamuel", desc: "Marcar lead para Samuel" },
  { name: "SolicitarHandoff", desc: "Transferir para humano" },
  { name: "registrar_bant", desc: "Registrar qualificação BANT" },
  { name: "calcular_score", desc: "Calcular score do lead (0-100)" },
  { name: "BuscarRecursosWhatsApp", desc: "Buscar info na base de conhecimento" },
  { name: "atualizar_lead", desc: "Atualizar campo específico" },
  { name: "atualizar_stage", desc: "Mover lead no funil" }
];

const WEB_TOOLS = [
  { name: "ColetarNome", desc: "Solicitar nome do visitante" },
  { name: "ColetarWhatsApp", desc: "Solicitar e validar WhatsApp" },
  { name: "ColetarEmail", desc: "Solicitar e validar email" },
  { name: "ColetarEmpresa", desc: "Solicitar nome da empresa (B2B)" },
  { name: "MostrarApresentacaoWeb", desc: "Exibir link da apresentação" },
  { name: "MostrarSlotsWeb", desc: "Exibir horários disponíveis" },
  { name: "AgendarReuniaoWeb", desc: "Criar pré-agendamento" },
  { name: "BuscarInformacoesWeb", desc: "Buscar na base de conhecimento" }
];

export const PromptEditorTab = () => {
  const { prompts: whatsappPrompts, isLoading: loadingWhatsApp, updatePrompt: updateWhatsAppPrompt, isUpdating: isUpdatingWhatsApp } = useAgentPrompts('whatsapp');
  const { prompts: webPrompts, isLoading: loadingWeb, updatePrompt: updateWebPrompt, isUpdating: isUpdatingWeb } = useAgentPrompts('web');
  
  const [openModal, setOpenModal] = useState<'whatsapp' | 'web' | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    prompt_text: "",
    temperature: 0.7,
    max_tokens: 500,
    notes: "",
  });

  const activeWhatsAppPrompt = whatsappPrompts?.find(p => p.is_active);
  const activeWebPrompt = webPrompts?.find(p => p.is_active);

  useEffect(() => {
    if (openModal === 'whatsapp' && activeWhatsAppPrompt) {
      setFormData({
        id: activeWhatsAppPrompt.id,
        name: activeWhatsAppPrompt.name,
        prompt_text: activeWhatsAppPrompt.prompt_text,
        temperature: activeWhatsAppPrompt.config.temperature,
        max_tokens: activeWhatsAppPrompt.config.max_tokens,
        notes: activeWhatsAppPrompt.notes || "",
      });
    } else if (openModal === 'web' && activeWebPrompt) {
      setFormData({
        id: activeWebPrompt.id,
        name: activeWebPrompt.name,
        prompt_text: activeWebPrompt.prompt_text,
        temperature: activeWebPrompt.config.temperature,
        max_tokens: activeWebPrompt.config.max_tokens,
        notes: activeWebPrompt.notes || "",
      });
    }
  }, [openModal, activeWhatsAppPrompt, activeWebPrompt]);

  const handleSave = () => {
    if (!formData.id || !openModal) return;
    
    const updateFn = openModal === 'whatsapp' ? updateWhatsAppPrompt : updateWebPrompt;
    
    updateFn({
      id: formData.id,
      name: formData.name,
      prompt_text: formData.prompt_text,
      config: {
        temperature: formData.temperature,
        max_tokens: formData.max_tokens,
      },
      notes: formData.notes,
    });
    
    setOpenModal(null);
  };

  if (loadingWhatsApp || loadingWeb) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Carregando prompts...</p>
        </div>
      </div>
    );
  }

  const currentTools = openModal === 'whatsapp' ? WHATSAPP_TOOLS : WEB_TOOLS;

  return (
    <div className="space-y-6">
      {/* Cards dos Canais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card WhatsApp */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Smartphone className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>WhatsApp</CardTitle>
                  <CardDescription>
                    {activeWhatsAppPrompt ? `Versão ${activeWhatsAppPrompt.version} ativa` : 'Nenhuma versão ativa'}
                  </CardDescription>
                </div>
              </div>
              {activeWhatsAppPrompt && (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Ativo
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {activeWhatsAppPrompt ? (
              <>
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium">{activeWhatsAppPrompt.name}</p>
                  {activeWhatsAppPrompt.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {activeWhatsAppPrompt.notes}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Última atualização: {format(new Date(activeWhatsAppPrompt.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Dialog open={openModal === 'whatsapp'} onOpenChange={(open) => setOpenModal(open ? 'whatsapp' : null)}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar Prompt
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Editar Prompt WhatsApp</DialogTitle>
                      <DialogDescription>
                        Edite o prompt ativo do canal WhatsApp
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="whatsapp-name">Nome da Versão</Label>
                        <Input
                          id="whatsapp-name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="whatsapp-prompt">Texto do Prompt</Label>
                        <Textarea
                          id="whatsapp-prompt"
                          className="min-h-[300px] font-mono text-sm"
                          value={formData.prompt_text}
                          onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Temperature: {formData.temperature}</Label>
                          <Slider
                            min={0}
                            max={1}
                            step={0.1}
                            value={[formData.temperature]}
                            onValueChange={(v) => setFormData({ ...formData, temperature: v[0] })}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Max Tokens: {formData.max_tokens}</Label>
                          <Slider
                            min={100}
                            max={2000}
                            step={50}
                            value={[formData.max_tokens]}
                            onValueChange={(v) => setFormData({ ...formData, max_tokens: v[0] })}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="whatsapp-notes">Notas</Label>
                        <Textarea
                          id="whatsapp-notes"
                          className="min-h-[80px]"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label className="mb-2 block">Ferramentas Disponíveis - WhatsApp</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-lg">
                          {WHATSAPP_TOOLS.map((tool) => (
                            <button
                              key={tool.name}
                              onClick={() => {
                                navigator.clipboard.writeText(tool.name);
                                toast.success(`${tool.name} copiado!`);
                              }}
                              className="p-2 border rounded bg-muted/30 hover:bg-muted/50 transition-colors text-left text-xs"
                            >
                              <div className="font-mono font-semibold">{tool.name}</div>
                              <div className="text-muted-foreground">{tool.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpenModal(null)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={isUpdatingWhatsApp}>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar Alterações
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum prompt ativo configurado</p>
            )}
          </CardContent>
        </Card>

        {/* Card Web Chat */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Web Chat</CardTitle>
                  <CardDescription>
                    {activeWebPrompt ? `Versão ${activeWebPrompt.version} ativa` : 'Nenhuma versão ativa'}
                  </CardDescription>
                </div>
              </div>
              {activeWebPrompt && (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Ativo
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {activeWebPrompt ? (
              <>
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium">{activeWebPrompt.name}</p>
                  {activeWebPrompt.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {activeWebPrompt.notes}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Última atualização: {format(new Date(activeWebPrompt.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Dialog open={openModal === 'web'} onOpenChange={(open) => setOpenModal(open ? 'web' : null)}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar Prompt
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Editar Prompt Web Chat</DialogTitle>
                      <DialogDescription>
                        Edite o prompt ativo do canal Web Chat
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="web-name">Nome da Versão</Label>
                        <Input
                          id="web-name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="web-prompt">Texto do Prompt</Label>
                        <Textarea
                          id="web-prompt"
                          className="min-h-[300px] font-mono text-sm"
                          value={formData.prompt_text}
                          onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Temperature: {formData.temperature}</Label>
                          <Slider
                            min={0}
                            max={1}
                            step={0.1}
                            value={[formData.temperature]}
                            onValueChange={(v) => setFormData({ ...formData, temperature: v[0] })}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Max Tokens: {formData.max_tokens}</Label>
                          <Slider
                            min={100}
                            max={2000}
                            step={50}
                            value={[formData.max_tokens]}
                            onValueChange={(v) => setFormData({ ...formData, max_tokens: v[0] })}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="web-notes">Notas</Label>
                        <Textarea
                          id="web-notes"
                          className="min-h-[80px]"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label className="mb-2 block">Ferramentas Disponíveis - Web Chat</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-lg">
                          {WEB_TOOLS.map((tool) => (
                            <button
                              key={tool.name}
                              onClick={() => {
                                navigator.clipboard.writeText(tool.name);
                                toast.success(`${tool.name} copiado!`);
                              }}
                              className="p-2 border rounded bg-muted/30 hover:bg-muted/50 transition-colors text-left text-xs"
                            >
                              <div className="font-mono font-semibold">{tool.name}</div>
                              <div className="text-muted-foreground">{tool.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpenModal(null)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={isUpdatingWeb}>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar Alterações
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum prompt ativo configurado</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};