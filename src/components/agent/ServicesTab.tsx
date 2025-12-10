import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAgentResources } from "@/lib/hooks/useAgentResources";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ExternalLink, Plus, Edit, Trash2, Package, CheckCircle2, Clock, Info } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const ServicesTab = () => {
  const {
    resources,
    isLoading,
    createResource,
    updateResource,
    deleteResource,
  } = useAgentResources();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<any>(null);
  const [formData, setFormData] = useState({
    tipo: "",
    nome: "",
    link: "",
    preco: "",
    descricao: "",
    ativo: true,
  });

  const handleOpenDialog = (resource?: any) => {
    if (resource) {
      setEditingResource(resource);
      setFormData({
        tipo: resource.tipo,
        nome: resource.nome,
        link: resource.link,
        preco: resource.preco || "",
        descricao: resource.descricao || "",
        ativo: resource.ativo,
      });
    } else {
      setEditingResource(null);
      setFormData({
        tipo: "",
        nome: "",
        link: "",
        preco: "",
        descricao: "",
        ativo: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar se o link é realmente um PDF
    if (!formData.link.toLowerCase().endsWith('.pdf')) {
      toast.error("O link deve apontar para um arquivo PDF (.pdf)");
      return;
    }
    
    const resourceData = { ...editingResource, ...formData };

    if (editingResource) {
      updateResource(resourceData);
    } else {
      createResource(resourceData);
    }

    setIsDialogOpen(false);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Card className="mb-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Como funciona o sistema de serviços
              </h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <p>
                  <strong>1. Cadastro:</strong> Adicione seus serviços com nome, descrição, preço e link do PDF
                </p>
                <p>
                  <strong>2. Conversas:</strong> O agente apresentará os serviços ativos aos leads quando apropriado
                </p>
                <p>
                  <strong>3. Envio:</strong> Quando o lead demonstrar interesse, o agente enviará o PDF via WhatsApp usando o link cadastrado
                </p>
                <p className="pt-2 border-t border-blue-200 dark:border-blue-800">
                  💡 <strong>Base de conhecimento:</strong> Para que o agente responda melhor sobre seus serviços, 
                  adicione documentos markdown detalhados na aba "Knowledge"
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Serviços Oferecidos</CardTitle>
                <CardDescription>
                  Gerencie os serviços que o agente usará nas conversas
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => handleOpenDialog()} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Novo Serviço
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum serviço configurado</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Adicione serviços para que o agente possa apresentá-los aos leads
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Serviço
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {resources.map((resource) => (
                <Card key={resource.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Info principal */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold">{resource.nome}</h3>
                              <Badge 
                                variant={resource.ativo ? "default" : "secondary"}
                                className="gap-1"
                              >
                                {resource.ativo ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    Ativo
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3" />
                                    Inativo
                                  </>
                                )}
                              </Badge>
                            </div>
                            <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              {resource.tipo}
                            </code>
                          </div>
                        </div>

                        {resource.descricao && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {resource.descricao}
                          </p>
                        )}

                        <div className="flex items-center gap-4 pt-2">
                          {resource.preco && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground">Preço:</span>
                              <span className="text-sm font-semibold text-primary">
                                {resource.preco}
                              </span>
                            </div>
                          )}
                          
                          <a
                            href={resource.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Ver Apresentação (PDF)
                          </a>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(resource)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteResource(resource.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingResource ? "Editar Serviço" : "Adicionar Novo Serviço"}
              </DialogTitle>
              <DialogDescription>
                Configure o serviço que o agente usará como referência nas conversas
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">
                    Identificador do Tipo
                    <span className="text-muted-foreground text-xs ml-2">(usado internamente)</span>
                  </Label>
                  <Input
                    id="tipo"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    placeholder="website, sistema, social, identidade..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preco">Preço</Label>
                  <Input
                    id="preco"
                    value={formData.preco}
                    onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                    placeholder="A partir de R$ 1.599,99"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Serviço</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Desenvolvimento de Websites Profissionais"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição Completa</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o serviço, o que está incluído, diferenciais, benefícios..."
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Esta descrição será exibida aos usuários e ajudará o agente a entender o serviço
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="link">
                  Link da Apresentação (PDF)
                  <span className="text-muted-foreground text-xs ml-2">(será enviado ao cliente)</span>
                </Label>
                <Input
                  id="link"
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="https://exemplo.com/apresentacao.pdf"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  📎 Este link será usado pelo agente para enviar a apresentação diretamente ao cliente via WhatsApp
                </p>
                <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    💡 <strong>Nota:</strong> A base de conhecimento do agente é alimentada pelos documentos markdown na aba "Knowledge", 
                    não pelos PDFs dos serviços. Os PDFs aqui são apenas para envio direto aos clientes.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="ativo" className="text-base">Serviço Ativo</Label>
                  <p className="text-sm text-muted-foreground">
                    O agente só usará serviços marcados como ativos
                  </p>
                </div>
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingResource ? "Salvar Alterações" : "Adicionar Serviço"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
