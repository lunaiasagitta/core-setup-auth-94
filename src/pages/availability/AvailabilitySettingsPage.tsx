import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SlotBatchForm } from '@/components/availability/SlotBatchForm';
import { SlotBatchList } from '@/components/availability/SlotBatchList';
import { Plus, List } from 'lucide-react';

export const AvailabilitySettingsPage = () => {
  const [activeTab, setActiveTab] = useState('create');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gerenciar Disponibilidade"
        description="Crie e gerencie lotes de slots para sua agenda"
        breadcrumb={[{ label: 'Disponibilidade' }]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">
            <Plus className="h-4 w-4 mr-2" />
            Criar Slots
          </TabsTrigger>
          <TabsTrigger value="manage">
            <List className="h-4 w-4 mr-2" />
            Gerenciar Lotes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Criar Novo Lote de Slots</CardTitle>
              <CardDescription>
                Preencha as informações para criar um novo lote de slots para sua agenda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SlotBatchForm onSuccess={() => setActiveTab('manage')} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="mt-6">
          <SlotBatchList />
        </TabsContent>
      </Tabs>
    </div>
  );
};
