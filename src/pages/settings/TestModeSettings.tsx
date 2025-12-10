import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TestNumber {
  id: string;
  telefone: string;
  nome: string | null;
  ativo: boolean;
  created_at: string;
}

interface TestModeConfig {
  id: string;
  enabled: boolean;
}

export default function TestModeSettings() {
  const queryClient = useQueryClient();
  const [newNumber, setNewNumber] = useState("");
  const [newName, setNewName] = useState("");

  // Buscar configuração do modo teste
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['test-mode-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_mode_config')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as TestModeConfig;
    }
  });

  // Buscar números de teste
  const { data: testNumbers, isLoading: numbersLoading } = useQuery({
    queryKey: ['test-numbers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_numbers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TestNumber[];
    }
  });

  // Mutation para toggle do modo teste
  const toggleTestMode = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('test_mode_config')
        .update({ enabled })
        .eq('id', config!.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-mode-config'] });
      toast.success(config?.enabled ? 'Modo teste desativado' : 'Modo teste ativado');
    },
    onError: (error) => {
      toast.error('Erro ao alterar modo teste: ' + error.message);
    }
  });

  // Mutation para adicionar número
  const addNumber = useMutation({
    mutationFn: async () => {
      // Normalizar número (remover caracteres especiais)
      const normalized = newNumber.replace(/[^0-9]/g, '');
      
      if (!normalized) {
        throw new Error('Digite um número válido');
      }

      const { error } = await supabase
        .from('test_numbers')
        .insert({
          telefone: normalized,
          nome: newName || null,
          ativo: true
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-numbers'] });
      setNewNumber('');
      setNewName('');
      toast.success('Número adicionado com sucesso');
    },
    onError: (error: any) => {
      if (error.message.includes('duplicate key')) {
        toast.error('Este número já está cadastrado');
      } else {
        toast.error('Erro ao adicionar número: ' + error.message);
      }
    }
  });

  // Mutation para deletar número
  const deleteNumber = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_numbers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-numbers'] });
      toast.success('Número removido');
    },
    onError: (error) => {
      toast.error('Erro ao remover número: ' + error.message);
    }
  });

  // Mutation para toggle ativo/inativo
  const toggleActive = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('test_numbers')
        .update({ ativo })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-numbers'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    }
  });

  const formatPhoneDisplay = (phone: string) => {
    // Formatar para exibição: 55 (11) 98765-4321
    if (phone.length === 13 && phone.startsWith('55')) {
      return `+55 (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    } else if (phone.length === 12 && phone.startsWith('55')) {
      return `+55 (${phone.slice(2, 4)}) ${phone.slice(4, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  if (configLoading || numbersLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Modo Teste</h1>
        <p className="text-muted-foreground">
          Configure números de WhatsApp autorizados para testes do agente
        </p>
      </div>

      {/* Status do Modo Teste */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Status do Modo Teste</CardTitle>
              <CardDescription>
                Quando ativado, o agente responderá apenas números cadastrados
              </CardDescription>
            </div>
            <Switch
              checked={config?.enabled || false}
              onCheckedChange={(checked) => toggleTestMode.mutate(checked)}
              disabled={toggleTestMode.isPending}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <Phone className="h-4 w-4" />
            <AlertDescription>
              {config?.enabled ? (
                <span className="font-medium text-orange-600">
                  ⚠️ Modo teste ATIVO - Apenas números cadastrados receberão respostas
                </span>
              ) : (
                <span className="font-medium text-green-600">
                  ✓ Modo normal - Todos os números receberão respostas
                </span>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Adicionar Número */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Número de Teste</CardTitle>
          <CardDescription>
            Use formato internacional com DDI. Exemplo: 5511987654321
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addNumber.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone com DDI *</Label>
                <Input
                  id="phone"
                  placeholder="5511987654321"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Formato: DDI + DDD + Número (apenas números)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome (opcional)</Label>
                <Input
                  id="name"
                  placeholder="João Silva"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={addNumber.isPending}>
              {addNumber.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Número
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Números */}
      <Card>
        <CardHeader>
          <CardTitle>Números Cadastrados ({testNumbers?.length || 0})</CardTitle>
          <CardDescription>
            Gerenciar números autorizados para testes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {testNumbers && testNumbers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testNumbers.map((number) => (
                  <TableRow key={number.id}>
                    <TableCell className="font-mono">
                      {formatPhoneDisplay(number.telefone)}
                    </TableCell>
                    <TableCell>{number.nome || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={number.ativo}
                          onCheckedChange={(checked) =>
                            toggleActive.mutate({ id: number.id, ativo: checked })
                          }
                          disabled={toggleActive.isPending}
                        />
                        <Badge variant={number.ativo ? "default" : "secondary"}>
                          {number.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(number.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNumber.mutate(number.id)}
                        disabled={deleteNumber.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum número cadastrado</p>
              <p className="text-sm">Adicione números para ativar o modo teste</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
