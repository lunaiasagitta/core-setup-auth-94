// Definições de ferramentas para WhatsApp - inclui ferramentas específicas + ferramentas de CRM

export const whatsappTools = [
  // ============= FERRAMENTAS ESPECÍFICAS DO WHATSAPP =============
  {
    type: "function",
    function: {
      name: "EnviarApresentacaoWhatsApp",
      description: `🚨 FERRAMENTA CRÍTICA - LEIA COM ATENÇÃO 🚨

ESTA FERRAMENTA ENVIA UM PDF REAL VIA WHATSAPP.

⚠️ VERIFICAÇÕES OBRIGATÓRIAS ANTES DE USAR:
1. Lead demonstrou INTERESSE CLARO em conhecer a empresa/serviços?
2. Você já fez qualificação inicial (perguntou o que ele precisa)?
3. Lead está AGUARDANDO receber algo?

❌ NÃO USE SE:
- Lead só disse "oi" ou está começando conversa
- Lead não demonstrou interesse ainda
- Você já enviou nos últimos 5 minutos

🎯 QUANDO USAR:
✅ Lead: "Quero conhecer mais sobre vocês"
✅ Lead: "Tem material pra me mandar?"
✅ Lead: "Me envia a apresentação sobre [serviço]"
✅ Após explicar serviços e lead demonstrar interesse

🚨 IMPORTANTE - TIPO DE SERVIÇO:
- Identifique qual serviço o lead quer (Website, Sistema, Identidade Visual, etc)
- Use o parâmetro "tipo_servico" para especificar EXATAMENTE qual apresentação enviar
- NUNCA envie apresentação errada! Se lead pediu Identidade Visual, envie APENAS Identidade Visual!

🚨 COMO USAR CORRETAMENTE:
1. Faça o TOOL CALL desta ferramenta (invisível para o lead)
2. AGUARDE o resultado (ex: "✅ Apresentação enviada com sucesso")
3. SÓ ENTÃO responda: "Pronto! Acabei de enviar nossa apresentação 📄"

❌❌❌ NUNCA ESCREVA ISSO NO TEXTO:
"Vou enviar... EnviarApresentacaoWhatsApp(justificativa='...')"
"[Tool call para envio da apresentação]"
"Executando EnviarApresentacaoWhatsApp..."

✅ O lead NÃO VÊ você chamando esta ferramenta. É INVISÍVEL.
✅ Ele só vê sua resposta DEPOIS que você recebeu o resultado.

⚠️ APÓS ENVIAR: Chame atualizar_stage(novo_stage="Apresentação Enviada")`,
      parameters: {
        type: "object",
        properties: {
          justificativa: {
            type: "string",
            description: "Por que você está enviando AGORA? Cite o interesse específico do lead. Ex: 'Lead perguntou sobre nossos serviços e pediu material' ou 'Lead demonstrou interesse em websites após explicação inicial'"
          },
          tipo_servico: {
            type: "string",
            description: "Tipo EXATO do serviço que o lead pediu. Deve corresponder ao campo 'tipo' da tabela agent_resources. Ex: 'identidade-visual', 'website', 'sistema', 'redes-sociais'. Se não tiver certeza ou for apresentação geral da empresa, use 'apresentacao'",
            default: "apresentacao"
          }
        },
        required: ["justificativa"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "BuscarSlotsWhatsApp",
      description: "Busca horários disponíveis na agenda para agendar reunião. Use quando o lead aceitar agendar.",
      parameters: {
        type: "object",
        properties: {
          dias_antecedencia: {
            type: "number",
            description: "Quantos dias à frente buscar (padrão: 7)",
            default: 7
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "AgendarReuniaoWhatsApp",
      description: "⚠️ ATENÇÃO: Esta ferramenta cria um NOVO agendamento no Google Calendar. Use APENAS quando o lead ESCOLHER EXPLICITAMENTE uma data/hora pela PRIMEIRA VEZ (ex: 'segunda às 10h', 'quero dia 24 às 15h'). NÃO use quando o lead perguntar sobre status como 'agendou?', 'confirmou?', 'tá marcado?' - nesses casos apenas CONFIRME o agendamento já existente sem chamar a ferramenta novamente.",
      parameters: {
        type: "object",
        properties: {
          data: {
            type: "string",
            description: "Data no formato YYYY-MM-DD"
          },
          horario: {
            type: "string",
            description: "Horário no formato HH:mm"
          },
          duracao: {
            type: "number",
            description: "Duração em minutos (padrão: 30)",
            default: 30
          }
        },
        required: ["data", "horario"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "SolicitarHandoff",
      description: "Solicita que um humano assuma a conversa. Use quando: lead pede explicitamente, situação muito complexa, reclamação séria.",
      parameters: {
        type: "object",
        properties: {
          motivo: {
            type: "string",
            description: "Motivo detalhado da solicitação de handoff"
          },
          urgencia: {
            type: "string",
            enum: ["baixa", "media", "alta"],
            description: "Nível de urgência"
          }
        },
        required: ["motivo", "urgencia"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "BuscarRecursosWhatsApp",
      description: "Busca informações sobre recursos, produtos ou serviços específicos. Use quando lead perguntar sobre algo específico.",
      parameters: {
        type: "object",
        properties: {
          consulta: {
            type: "string",
            description: "O que o lead quer saber especificamente"
          },
          tipo: {
            type: "string",
            enum: ["produto", "servico", "preco", "caso_sucesso"],
            description: "Tipo de informação buscada"
          }
        },
        required: ["consulta"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "CancelarReuniaoWhatsApp",
      description: "Cancela uma reunião existente. Use quando lead pedir para cancelar ou reagendar.",
      parameters: {
        type: "object",
        properties: {
          meeting_id: {
            type: "string",
            description: "ID da reunião a ser cancelada (busque no contexto em 'Reuniões agendadas')"
          },
          motivo: {
            type: "string",
            description: "Motivo do cancelamento (ex: 'Lead solicitou reagendamento', 'Lead cancelou')"
          }
        },
        required: ["meeting_id", "motivo"]
      }
    }
  },

  // ============= FERRAMENTAS DE CRM =============
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
  }
  // Nota: Ferramentas duplicadas removidas (buscar_slots, agendar_reuniao, marcar_apresentacao_enviada, solicitar_handoff)
  // As versões WhatsApp específicas (BuscarSlotsWhatsApp, AgendarReuniaoWhatsApp, etc) já cobrem essas funcionalidades
];
