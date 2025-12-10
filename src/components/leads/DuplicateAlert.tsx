import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Users } from 'lucide-react';
import { useDuplicateDetection } from '@/lib/hooks/useDuplicateDetection';
import { useState } from 'react';
import { MergeLeadsModal } from './MergeLeadsModal';
import { DuplicateMatch } from '@/lib/types/merge';

interface DuplicateAlertProps {
  leadId: string;
}

export const DuplicateAlert = ({ leadId }: DuplicateAlertProps) => {
  const { data: duplicates, isLoading } = useDuplicateDetection(leadId);
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateMatch | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  
  if (isLoading || !duplicates || duplicates.length === 0) {
    return null;
  }
  
  const handleMergeClick = (duplicate: DuplicateMatch) => {
    setSelectedDuplicate(duplicate);
    setShowMergeModal(true);
  };
  
  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case 'phone_exact':
        return 'Telefone idêntico';
      case 'email_exact':
        return 'E-mail idêntico';
      case 'name_fuzzy':
        return 'Nome similar';
      default:
        return 'Desconhecido';
    }
  };
  
  const getMatchTypeBadgeVariant = (matchScore: number): "default" | "secondary" | "destructive" => {
    if (matchScore === 100) return 'destructive';
    if (matchScore >= 90) return 'default';
    return 'secondary';
  };
  
  return (
    <>
      <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-200">
          ⚠️ Possível Duplicação Detectada
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Encontramos <strong>{duplicates.length}</strong> lead(s) similar(es) no sistema:
          </p>
          
          <div className="space-y-2 mt-3">
            {duplicates.map((dup) => (
              <div 
                key={dup.lead_id} 
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md border border-yellow-200 dark:border-yellow-800"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {dup.lead_data.nome || 'Sem nome'}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {dup.lead_data.telefone && (
                        <span className="text-xs text-muted-foreground">
                          📱 {dup.lead_data.telefone}
                        </span>
                      )}
                      {dup.lead_data.email && (
                        <span className="text-xs text-muted-foreground">
                          ✉️ {dup.lead_data.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getMatchTypeBadgeVariant(dup.match_score)}>
                      {getMatchTypeLabel(dup.match_type)}
                    </Badge>
                    <Badge variant="outline">
                      Score: {dup.match_score}
                    </Badge>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleMergeClick(dup)}
                  className="ml-3"
                >
                  Mesclar
                </Button>
              </div>
            ))}
          </div>
        </AlertDescription>
      </Alert>
      
      {showMergeModal && selectedDuplicate && (
        <MergeLeadsModal
          masterLeadId={leadId}
          duplicateLeadId={selectedDuplicate.lead_id}
          open={showMergeModal}
          onOpenChange={setShowMergeModal}
        />
      )}
    </>
  );
};
