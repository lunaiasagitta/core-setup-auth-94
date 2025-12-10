import { format } from 'date-fns';

export interface ExportMeeting {
  id: string;
  scheduled_date: string;
  duration?: number;
  status?: string;
  meeting_link?: string;
  created_at?: string;
  lead?: {
    nome?: string;
    email?: string;
    telefone?: string;
  };
}

export const exportMeetingsToCSV = (meetings: ExportMeeting[]) => {
  const headers = ['Lead', 'Data', 'Hora', 'Duração (min)', 'Status', 'Link Meet', 'Criado em'];
  
  const rows = meetings.map((meeting) => {
    const date = new Date(meeting.scheduled_date);
    const lead = meeting.lead;
    
    return [
      lead?.nome || 'N/A',
      format(date, 'dd/MM/yyyy'),
      format(date, 'HH:mm'),
      meeting.duration?.toString() || '30',
      meeting.status || 'scheduled',
      meeting.meeting_link || 'N/A',
      meeting.created_at ? format(new Date(meeting.created_at), 'dd/MM/yyyy HH:mm') : 'N/A',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `reunioes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportMeetingsToICS = (meetings: ExportMeeting[]) => {
  const formatDateForICS = (date: Date) => {
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const events = meetings.map((meeting) => {
    const startDate = new Date(meeting.scheduled_date);
    const endDate = new Date(startDate.getTime() + (meeting.duration || 30) * 60000);
    const lead = meeting.lead;

    return [
      'BEGIN:VEVENT',
      `UID:${meeting.id}@sagitta.app`,
      `DTSTAMP:${formatDateForICS(new Date())}`,
      `DTSTART:${formatDateForICS(startDate)}`,
      `DTEND:${formatDateForICS(endDate)}`,
      `SUMMARY:Reunião com ${lead?.nome || 'Lead'}`,
      `DESCRIPTION:${meeting.meeting_link || 'Sem link disponível'}`,
      meeting.meeting_link ? `URL:${meeting.meeting_link}` : '',
      `STATUS:${meeting.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT',
    ]
      .filter(Boolean)
      .join('\r\n');
  }).join('\r\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sagitta//Calendar//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    events,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `agenda_${format(new Date(), 'yyyy-MM-dd')}.ics`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
