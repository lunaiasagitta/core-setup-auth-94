import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Calendar } from 'lucide-react';
import { useMeetings } from '@/lib/hooks/useMeetings';
import { exportMeetingsToCSV, exportMeetingsToICS } from '@/lib/utils/exportCalendar';

export const ExportButton = () => {
  const { meetings } = useMeetings();

  const handleExportCSV = () => {
    exportMeetingsToCSV(meetings as any);
  };

  const handleExportICS = () => {
    exportMeetingsToICS(meetings as any);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileText className="mr-2 h-4 w-4" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportICS}>
          <Calendar className="mr-2 h-4 w-4" />
          Exportar ICS (Calendário)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
