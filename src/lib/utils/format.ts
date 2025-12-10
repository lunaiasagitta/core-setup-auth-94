export const getInitials = (name: string | null): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const formatPhone = (phone: string): string => {
  // Remove tudo que não é número
  const numbers = phone.replace(/\D/g, '');
  
  // Formato: (11) 99999-9999
  if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }
  
  // Formato: (11) 9999-9999
  if (numbers.length === 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  
  return phone;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const getWhatsAppLink = (phone: string): string => {
  const numbers = phone.replace(/\D/g, '');
  return `https://wa.me/55${numbers}`;
};

export const getRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const target = new Date(date);
  
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  
  const diffDays = Math.floor((targetStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  
  const time = target.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  if (diffDays === 0) {
    return `Hoje às ${time}`;
  } else if (diffDays === 1) {
    return `Amanhã às ${time}`;
  } else if (diffDays === -1) {
    return `Ontem às ${time}`;
  } else if (diffDays > 1 && diffDays <= 7) {
    return `Em ${diffDays} dias às ${time}`;
  } else if (diffDays < -1 && diffDays >= -7) {
    return `Há ${Math.abs(diffDays)} dias às ${time}`;
  } else {
    return target.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};
