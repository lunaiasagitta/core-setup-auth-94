export const TOOLS = [
  // ============= NOVAS FERRAMENTAS DO PROMPT LUNA =============
  {
    type: 'function',
    function: {
      name: 'CriaUsuarioCRM',
      description: 'Criar automaticamente um novo lead no CRM quando um cliente ainda não estiver cadastrado. Use APENAS quando o contexto mostrar "Criado no CRM? Não"',
      parameters: {
        type: 'object',
        properties: {
          nome: {
            type: 'string',
            description: 'Nome completo do cliente'
          },
          telefone: {
            type: 'string',
            description: 'WhatsApp do cliente no formato internacional (ex: 5547996370198)'
          },
          email: {
            type: 'string',
            description: 'Email do cliente (opcional, pode ser gerado como [nome].[ultimos4digitos]@temporario.com se não fornecido)'
          },
          empresa: {
            type: 'string',
            description: 'Nome da empresa do cliente (opcional, perguntar se for relevante para o contexto)'
          },
          necessidade: {
            type: 'string',
            enum: ['Websites', 'Sistemas e Aplicativos', 'Gestão de Redes Sociais', 'Identidade Visual'],
            description: 'Tipo de serviço que o cliente precisa'
          },
          propostaIA: {
            type: 'string',
            description: 'Resumo da conversa e próximos passos'
          }
        },
        required: ['nome', 'telefone', 'necessidade', 'propostaIA']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'EnviarApresentacao',
      description: 'Envia apresentação em PDF via WhatsApp para o lead. Use para enviar ou reenviar apresentações.',
      parameters: {
        type: 'object',
        properties: {
          media: {
            type: 'string',
            description: 'URL completa do PDF (ex: https://sagittadigital.com.br/wp-content/uploads/2025/07/Apresentacao-de-Websites-Sagitta-Digital.pdf)'
          },
          number: {
            type: 'string',
            description: 'WhatsApp do cliente no formato internacional'
          },
          mimetype: {
            type: 'string',
            enum: ['application/pdf'],
            description: 'Sempre application/pdf'
          },
          caption: {
            type: 'string',
            description: 'Título da apresentação (ex: Websites Profissionais, Sistemas e Aplicativos, Gestão de Redes Sociais, Identidade Visual)'
          },
          mediatype: {
            type: 'string',
            enum: ['document'],
            description: 'Sempre document para PDFs'
          },
          fileName: {
            type: 'string',
            description: 'Nome do arquivo (mesmo que caption)'
          }
        },
        required: ['media', 'number', 'mimetype', 'caption', 'mediatype', 'fileName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'AtualizarStatusLead',
      description: 'Atualiza o status do lead no funil de vendas. Use após enviar apresentação, agendamento confirmado, etc.',
      parameters: {
        type: 'object',
        properties: {
          telefone: {
            type: 'string',
            description: 'WhatsApp do cliente do contexto'
          },
          statusLead: {
            type: 'string',
            enum: ['Apresentação Enviada', 'Segundo Contato', 'Reunião Agendada', 'Proposta Enviada', 'Fechado', 'Cancelado'],
            description: 'Novo status do lead'
          }
        },
        required: ['telefone', 'statusLead']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'AtualizarNecessidadeLead',
      description: 'Atualiza informações completas do lead incluindo necessidade. Use quando Necessidade = N/A ou precisa atualizar dados do lead.',
      parameters: {
        type: 'object',
        properties: {
          Nome: {
            type: 'string',
            description: 'Nome completo do cliente'
          },
          Telefone: {
            type: 'string',
            description: 'WhatsApp do cliente'
          },
          Email: {
            type: 'string',
            description: 'Email do cliente (pode ser gerado como [nome].[ultimos4digitos]@temporario.com)'
          },
          Empresa: {
            type: 'string',
            description: 'Nome da empresa do cliente (opcional)'
          },
          Necessidade: {
            type: 'string',
            enum: ['Websites', 'Sistemas e Aplicativos', 'Gestão de Redes Sociais', 'Identidade Visual'],
            description: 'Tipo de serviço'
          },
          PropostaIA: {
            type: 'string',
            description: 'Resumo da conversa: necessidade + interesse + próximos passos'
          }
        },
        required: ['Nome', 'Telefone', 'Email', 'Necessidade', 'PropostaIA']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'EmFechamentoSamuel',
      description: 'Marca lead para acompanhamento do Samuel. Use após enviar link de agenda, solicitar atendimento humano, etc.',
      parameters: {
        type: 'object',
        properties: {
          telefone: {
            type: 'string',
            description: 'WhatsApp do cliente'
          },
          osFunilLead: {
            type: 'string',
            enum: ['Acompanhar', 'Importante', 'Projeto a ser fechado', 'Atendimento humano'],
            description: 'Categoria do lead: Acompanhar=follow-up normal, Importante=lead qualificado, Projeto a ser fechado=alta intenção, Atendimento humano=solicitou contato direto'
          },
          statusLead: {
            type: 'string',
            description: 'Status ATUAL do lead no contexto (não invente, use o que está no contexto)'
          }
        },
        required: ['telefone', 'osFunilLead', 'statusLead']
      }
    }
  },

  // ============= FERRAMENTAS ANTIGAS (FALLBACK) =============
  {
    type: 'function',
    function: {
      name: 'atualizar_lead',
      description: 'Atualiza informações básicas do lead (nome, email, empresa, necessidade)',
      parameters: {
        type: 'object',
        properties: {
          campo: {
            type: 'string',
            enum: ['nome', 'email', 'empresa', 'necessidade'],
            description: 'Campo a ser atualizado'
          },
          valor: {
            type: 'string',
            description: 'Novo valor para o campo'
          }
        },
        required: ['campo', 'valor']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'atualizar_stage',
      description: 'Move o lead para outro estágio do funil de vendas',
      parameters: {
        type: 'object',
        properties: {
          novo_stage: {
            type: 'string',
            enum: ['Novo', 'Apresentação Enviada', 'Segundo Contato', 'Reunião Agendada', 'Proposta Enviada', 'Fechado', 'Cancelado'],
            description: 'Novo estágio do lead'
          },
          motivo: {
            type: 'string',
            description: 'Motivo da mudança de estágio'
          }
        },
        required: ['novo_stage']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'registrar_bant',
      description: 'Registra informação de qualificação BANT do lead',
      parameters: {
        type: 'object',
        properties: {
          campo: {
            type: 'string',
            enum: ['budget', 'authority', 'need', 'timeline'],
            description: 'Campo BANT a ser registrado'
          },
          valor: {
            type: 'string',
            description: 'Informação coletada sobre o campo BANT'
          },
          confianca: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: 'Nível de confiança na informação obtida'
          }
        },
        required: ['campo', 'valor', 'confianca']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calcular_score',
      description: 'Recalcula o score BANT do lead (0-100) baseado nas informações coletadas',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'buscar_slots',
      description: 'Busca horários disponíveis na agenda para reunião',
      parameters: {
        type: 'object',
        properties: {
          data_preferida: {
            type: 'string',
            description: 'Data preferida no formato YYYY-MM-DD (opcional)'
          },
          proximos_dias: {
            type: 'number',
            description: 'Quantos dias à frente buscar (padrão: 7)',
            default: 7
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'agendar_reuniao',
      description: 'Agenda uma reunião com o lead no Google Calendar',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'string',
            description: 'Data da reunião (YYYY-MM-DD)'
          },
          hora: {
            type: 'string',
            description: 'Hora da reunião (HH:MM)'
          },
          duracao: {
            type: 'number',
            description: 'Duração em minutos (padrão: 30)',
            default: 30
          }
        },
        required: ['data', 'hora']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'marcar_apresentacao_enviada',
      description: 'Envia automaticamente a apresentação (PDF ou link) via WhatsApp para o lead e atualiza o stage para "Apresentação Enviada". O sistema detecta o tipo de conteúdo e usa o método apropriado (documento ou texto).',
      parameters: {
        type: 'object',
        properties: {
          tipo: {
            type: 'string',
            enum: ['website', 'sistema', 'social', 'identidade'],
            description: 'Tipo de apresentação: website (sites/landing pages), sistema (apps/plataformas), social (gestão redes), identidade (branding/logo)'
          }
        },
        required: ['tipo']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'solicitar_handoff',
      description: 'Solicita que atendimento humano assuma a conversa',
      parameters: {
        type: 'object',
        properties: {
          motivo: {
            type: 'string',
            description: 'Motivo pelo qual precisa transferir para humano'
          },
          urgencia: {
            type: 'string',
            enum: ['baixa', 'media', 'alta'],
            description: 'Nível de urgência',
            default: 'media'
          }
        },
        required: ['motivo']
      }
    }
  }
];
