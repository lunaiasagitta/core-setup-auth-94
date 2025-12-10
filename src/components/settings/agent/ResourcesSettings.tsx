import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAgentResources } from "@/lib/hooks/useAgentResources";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ExternalLink, Plus, Edit, Trash2 } from "lucide-react";
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

export const ResourcesSettings = () => {
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Serviços & Apresentações</CardTitle>
              <CardDescription>
                Configure os serviços da Sagitta Digital que o agente usará como referência
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Serviço
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum serviço configurado
                  </TableCell>
                </TableRow>
              ) : (
                resources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell className="font-mono text-sm">{resource.tipo}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{resource.nome}</div>
                        {resource.descricao && (
                          <div className="text-sm text-muted-foreground mt-1">{resource.descricao}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-primary">
                      {resource.preco || "N/A"}
                    </TableCell>
                    <TableCell>
                      <a
                        href={resource.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        Ver PDF
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant={resource.ativo ? "default" : "secondary"}>
                        {resource.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(resource)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteResource(resource.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingResource ? "Editar Serviço" : "Adicionar Serviço"}
              </DialogTitle>
              <DialogDescription>
                Configure os serviços que o agente oferecerá aos leads. O link do PDF será usado para envio direto via WhatsApp.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Input
                  id="tipo"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  placeholder="apresentacao_website, apresentacao_sistema..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Apresentação - Desenvolvimento de Websites"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Serviço de criação de websites responsivos e modernos"
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
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="ativo">Serviço Ativo</Label>
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
                {editingResource ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
