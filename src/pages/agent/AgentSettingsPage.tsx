import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgentPreviewCard } from '@/components/agent/AgentPreviewCard';
import { IdentityTab } from '@/components/agent/IdentityTab';
import { ServicesTab } from '@/components/agent/ServicesTab';
import { KnowledgeTab } from '@/components/agent/KnowledgeTab';
import { IntegrationsTab } from '@/components/agent/IntegrationsTab';
import { FollowUpTab } from '@/components/agent/FollowUpTab';
import { PromptEditorTab } from '@/components/agent/PromptEditorTab';

export const AgentSettingsPage = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="🤖 Configuração do Agente Luna"
        description="Configure a personalidade, serviços e conhecimento do seu agente de vendas"
        breadcrumb={[{ label: 'Agente Luna' }]}
      />

      <AgentPreviewCard />

      <Tabs defaultValue="identity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="identity">Identidade</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="knowledge">Base de Conhecimento</TabsTrigger>
          <TabsTrigger value="prompt">Prompt Sistema</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="followup">Follow-up</TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="space-y-6">
          <IdentityTab />
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <ServicesTab />
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-6">
          <KnowledgeTab />
        </TabsContent>

        <TabsContent value="prompt" className="space-y-6">
          <PromptEditorTab />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <IntegrationsTab />
        </TabsContent>

        <TabsContent value="followup" className="space-y-6">
          <FollowUpTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
