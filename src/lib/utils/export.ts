import { Lead } from '@/lib/hooks/useLeads';

export const exportLeadsToCSV = (leads: Lead[], filename: string = 'leads.csv') => {
  // Headers
  const headers = [
    'ID',
    'Nome',
    'Telefone',
    'Email',
    'Empresa',
    'Necessidade',
    'Stage',
    'Score BANT',
    'Criado em',
    'Atualizado em',
  ];

  // Rows
  const rows = leads.map(lead => [
    lead.id,
    lead.nome || '',
    lead.telefone,
    lead.email || '',
    lead.empresa || '',
    lead.necessidade || '',
    lead.stage,
    lead.score_bant.toString(),
    new Date(lead.created_at).toLocaleString('pt-BR'),
    new Date(lead.updated_at).toLocaleString('pt-BR'),
  ]);

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
