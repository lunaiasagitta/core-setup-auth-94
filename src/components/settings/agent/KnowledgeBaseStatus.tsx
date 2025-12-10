import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useKnowledgeBase } from "@/lib/hooks/useKnowledgeBase";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { AlertTriangle, BookOpen, FileText, Zap } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const KnowledgeBaseStatus = () => {
  const { stats, isLoading, processDocument, isProcessing } = useKnowledgeBase();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });

  // Documentos padrão existentes
  const defaultDocs = ["servicos", "casos-sucesso", "faq", "objecoes"];

  const handleProcessDefault = async (docName: string) => {
    try {
      const response = await fetch(`/knowledge-base/${docName}.md`);
      const content = await response.text();
      processDocument({ title: docName, content });
    } catch (error) {
      console.error(`Erro ao ler ${docName}.md:`, error);
    }
  };

  const handleProcessAll = async () => {
    for (const docName of defaultDocs) {
      await handleProcessDefault(docName);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processDocument(formData);
    setIsDialogOpen(false);
    setFormData({ title: "", content: "" });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const isEmpty = !stats || stats.totalChunks === 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Base de Conhecimento</CardTitle>
              <CardDescription>
                Gerencie os documentos que o agente usa para responder
              </CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Adicionar Documento
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEmpty && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção!</strong> A base de conhecimento está vazia. O agente não conseguirá
                consultar informações sobre serviços, casos de sucesso, FAQ, etc.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total de Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{stats?.totalDocuments || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total de Chunks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{stats?.totalChunks || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Zap className={`h-5 w-5 ${isEmpty ? 'text-destructive' : 'text-green-500'}`} />
                  <span className="text-sm font-medium">
                    {isEmpty ? 'Não configurado' : 'Operacional'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Documentos Padrão</h4>
            <p className="text-sm text-muted-foreground">
              Processe os documentos existentes na pasta knowledge-base/
            </p>
            <div className="flex gap-2 flex-wrap">
              {defaultDocs.map((doc) => {
                const isProcessed = stats?.documents?.includes(doc);
                return (
                  <Button
                    key={doc}
                    variant={isProcessed ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleProcessDefault(doc)}
                    disabled={isProcessing}
                  >
                    {isProcessed ? "✓ " : ""}
                    {doc}.md
                  </Button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleProcessAll}
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <LoadingSpinner />
                Processando...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Processar Todos os Documentos Agora
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Adicionar Documento</DialogTitle>
              <DialogDescription>
                Adicione um novo documento à base de conhecimento
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Documento</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="servicos, precos, politica-privacidade..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo (Markdown)</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Cole o conteúdo do documento aqui..."
                  rows={15}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? "Processando..." : "Processar & Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
