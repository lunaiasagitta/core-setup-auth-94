// Definições de ferramentas específicas para Web Chat

export const webTools = [
  {
    type: "function",
    function: {
      name: "ColetarNome",
      description: "Solicita e registra o nome completo do visitante. SEMPRE use esta ferramenta no início da conversa.",
      parameters: {
        type: "object",
        properties: {
          pergunta_personalizada: {
            type: "string",
            description: "Pergunta amigável para coletar o nome (ex: 'Como posso te chamar?')"
          }
        },
        required: ["pergunta_personalizada"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ColetarWhatsApp",
      description: "Solicita e valida o número de WhatsApp do visitante. Use após coletar o nome.",
      parameters: {
        type: "object",
        properties: {
          motivo: {
            type: "string",
            description: "Por que você precisa do WhatsApp (ex: 'para enviar a apresentação')"
          }
        },
        required: ["motivo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ColetarEmail",
      description: "Solicita e valida o email do visitante. Use após coletar WhatsApp.",
      parameters: {
        type: "object",
        properties: {
          contexto: {
            type: "string",
            description: "Contexto para solicitar email (ex: 'para enviar materiais complementares')"
          }
        },
        required: ["contexto"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ColetarEmpresa",
      description: "Solicita o nome da empresa do visitante. Use quando apropriado para qualificação B2B.",
      parameters: {
        type: "object",
        properties: {
          opcional: {
            type: "boolean",
            description: "Se a informação é opcional ou obrigatória",
            default: false
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "MostrarApresentacaoWeb",
      description: "Exibe link para apresentação da empresa. Use após coletar dados básicos (nome + WhatsApp mínimo).",
      parameters: {
        type: "object",
        properties: {
          mensagem_intro: {
            type: "string",
            description: "Mensagem introdutória personalizada antes de mostrar o link"
          }
        },
        required: ["mensagem_intro"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "MostrarSlotsWeb",
      description: "Exibe horários disponíveis para reunião em formato visual. Use quando visitante demonstra interesse em agendar.",
      parameters: {
        type: "object",
        properties: {
          dias_antecedencia: {
            type: "number",
            description: "Quantos dias à frente mostrar (padrão: 7)",
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
      name: "AgendarReuniaoWeb",
      description: "Cria pré-agendamento de reunião. Use após visitante escolher horário. Requer nome, email e WhatsApp coletados.",
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
      name: "BuscarInformacoesWeb",
      description: "Busca informações sobre produtos/serviços na base de conhecimento. Use quando visitante faz perguntas específicas.",
      parameters: {
        type: "object",
        properties: {
          pergunta: {
            type: "string",
            description: "Pergunta específica do visitante"
          }
        },
        required: ["pergunta"]
      }
    }
  }
];
