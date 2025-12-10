import { Mail, Phone, Building } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ContactDetail {
  icon: React.ElementType;
  value: string;
}

const ContactDetailItem = ({ icon: Icon, value }: ContactDetail) => (
  <div className="flex items-center gap-2 text-sm">
    <Icon className="h-4 w-4 text-muted-foreground" />
    <span className="text-muted-foreground">{value}</span>
  </div>
);

interface ContactSidebarProps {
  contact?: {
    nome: string | null;
    email: string | null;
    telefone: string;
    empresa: string | null;
  };
}

export const ContactSidebar = ({ contact }: ContactSidebarProps) => {
  if (!contact) {
    return (
      <aside className="hidden xl:flex w-80 border-l bg-muted/30 items-center justify-center">
        <p className="text-sm text-muted-foreground">Selecione uma conversa</p>
      </aside>
    );
  }

  const getInitials = (name: string | null) => {
    if (!name) return 'V';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="hidden xl:block w-72 border-l bg-muted/30 overflow-y-auto shrink-0">
      {/* Contact Info */}
      <div className="p-6 border-b bg-background">
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-16 w-16 mb-3">
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {getInitials(contact.nome)}
            </AvatarFallback>
          </Avatar>
          
          <h3 className="font-semibold text-lg">
            {contact.nome || 'Visitante'}
          </h3>
          
          {contact.empresa && (
            <p className="text-sm text-muted-foreground mt-1">
              {contact.empresa}
            </p>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {contact.email && (
            <ContactDetailItem icon={Mail} value={contact.email} />
          )}
          <ContactDetailItem icon={Phone} value={contact.telefone} />
          {contact.empresa && (
            <ContactDetailItem icon={Building} value={contact.empresa} />
          )}
        </div>
      </div>

      {/* Accordions */}
      <Accordion type="multiple" className="p-4">
        <AccordionItem value="attributes">
          <AccordionTrigger className="text-sm font-medium">
            Atributos do Contato
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Stage</p>
                <Badge variant="outline">Lead</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Score BANT</p>
                <Badge variant="outline">-</Badge>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="info">
          <AccordionTrigger className="text-sm font-medium">
            Informações da Conversa
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Canal:</span>
                <span className="font-medium">Web Chat</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="secondary" className="h-5">Aberta</Badge>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="previous">
          <AccordionTrigger className="text-sm font-medium">
            Conversas Anteriores
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">
              Nenhuma conversa anterior
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  );
};
