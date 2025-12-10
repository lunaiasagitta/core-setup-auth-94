import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { applyPhoneMask, normalizePhone, validateAndFormatPhone } from '@/lib/utils/phoneValidation';
import { validateAndFormatEmail } from '@/lib/utils/emailValidation';

export const ProfilePage = () => {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');

  // Buscar perfil
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || '');
      setTelefone(profile.telefone || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  // Atualizar perfil
  const updateProfile = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Validar telefone se fornecido
      let normalizedPhone = telefone;
      if (telefone && telefone.trim() !== '') {
        const validation = validateAndFormatPhone(telefone);
        if (!validation.valid) {
          throw new Error(validation.error || 'Telefone inválido');
        }
        normalizedPhone = validation.normalized;
      }

      // Validar e-mail se fornecido
      let normalizedEmail = email;
      if (email && email.trim() !== '') {
        const validation = validateAndFormatEmail(email);
        if (!validation.valid) {
          throw new Error(validation.error || 'E-mail inválido');
        }
        normalizedEmail = validation.normalized;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          nome,
          telefone: normalizedPhone,
          email: normalizedEmail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Meu Perfil"
        description="Gerencie suas informações pessoais"
        breadcrumb={[{ label: 'Perfil' }]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>Atualize seus dados cadastrais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={(e) => {
                const masked = applyPhoneMask(e.target.value);
                setTelefone(masked);
              }}
              maxLength={15}
            />
            <p className="text-xs text-muted-foreground">
              Formato: (11) 99999-9999
            </p>
          </div>

          <Button
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
