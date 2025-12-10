import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLeads } from '@/lib/hooks/useLeads';
import { phoneSchema, applyPhoneMask, formatPhoneDisplay, normalizePhone } from '@/lib/utils/phoneValidation';
import { emailSchema } from '@/lib/utils/emailValidation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PhoneInput } from '@/components/ui/phone-input';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const leadSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  telefone: phoneSchema,
  email: emailSchema,
  empresa: z.string().optional(),
  necessidade: z.enum([
    'Websites',
    'Sistemas e Aplicativos',
    'Gestão de Redes Sociais',
    'Identidade Visual',
  ]).optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
}

export const CreateLeadModal = ({ open, onOpenChange, initialData }: CreateLeadModalProps) => {
  const isEditing = !!initialData;
  const { createLead, updateLead } = useLeads();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countryCode, setCountryCode] = useState('+55');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: initialData ? {
      nome: initialData.nome || '',
      telefone: initialData.telefone ? formatPhoneDisplay(initialData.telefone) : '',
      email: initialData.email || '',
      empresa: initialData.empresa || '',
      necessidade: initialData.necessidade || 'Websites',
    } : {
      nome: '',
      telefone: '',
      email: '',
      empresa: '',
      necessidade: 'Websites',
    },
  });

  const necessidade = watch('necessidade');
  const telefone = watch('telefone');

  const onSubmit = async (data: LeadFormData) => {
    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateLead.mutateAsync({
          id: initialData.id,
          nome: data.nome,
          telefone: data.telefone,
          email: data.email || undefined,
          empresa: data.empresa || undefined,
          necessidade: data.necessidade || undefined,
        });
      } else {
        await createLead.mutateAsync({
          nome: data.nome,
          telefone: data.telefone,
          email: data.email || undefined,
          empresa: data.empresa || undefined,
          necessidade: data.necessidade || undefined,
        });
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Lead' : 'Criar Novo Lead'}</DialogTitle>
          <DialogDescription>
            Preencha os dados do novo lead. Os campos marcados com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              placeholder="João Silva"
              {...register('nome')}
            />
            {errors.nome && (
              <p className="text-sm text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone *</Label>
            <PhoneInput
              id="telefone"
              placeholder="(11) 99999-9999"
              value={telefone}
              countryCode={countryCode}
              onCountryCodeChange={setCountryCode}
              onChange={(value) => {
                const masked = applyPhoneMask(value);
                setValue('telefone', masked);
              }}
              maxLength={15}
            />
            {errors.telefone && (
              <p className="text-sm text-destructive">{errors.telefone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="joao@empresa.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="empresa">Empresa</Label>
            <Input
              id="empresa"
              placeholder="Empresa XYZ"
              {...register('empresa')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="necessidade">Necessidade</Label>
            <Select
              value={necessidade || ''}
              onValueChange={(value) => setValue('necessidade', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma necessidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Websites">Websites</SelectItem>
                <SelectItem value="Sistemas e Aplicativos">
                  Sistemas e Aplicativos
                </SelectItem>
                <SelectItem value="Gestão de Redes Sociais">
                  Gestão de Redes Sociais
                </SelectItem>
                <SelectItem value="Identidade Visual">
                  Identidade Visual
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="small" className="mr-2" />
                  {isEditing ? 'Salvando...' : 'Criando...'}
                </>
              ) : (
                isEditing ? 'Salvar' : 'Criar Lead'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
