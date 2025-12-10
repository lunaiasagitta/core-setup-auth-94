interface QuickReply {
  content: string;
  shouldExecuteTool?: { toolName: string; params: any };
}

interface Lead {
  id: string;
  nome?: string;
  necessidade?: string;
  score_bant?: number;
}

export function getQuickReply(
  intent: string,
  lead: Lead,
  context?: any
): QuickReply | null {
  
  switch (intent) {
    case 'falar_humano':
      return {
        content: "Claro! Vou te conectar com nossa equipe agora mesmo. Um momento! 😊",
        shouldExecuteTool: {
          toolName: 'solicitar_handoff',
          params: { motivo: 'Solicitação explícita do lead', urgencia: 'alta' }
        }
      };
    
    case 'pergunta_preco':
      if (lead.necessidade === 'Websites') {
        return {
          content: `Nossos websites começam em R$ 1.599 para landing page! 🌐

Mas o valor varia conforme:
• Número de páginas
• Funcionalidades especiais
• Integrações necessárias
• Design personalizado

Vou te enviar nossa apresentação completa com todos os detalhes e você escolhe o que faz mais sentido pro seu caso. Pode ser?`,
          shouldExecuteTool: {
            toolName: 'marcar_apresentacao_enviada',
            params: { tipo: 'website' }
          }
        };
      } else if (lead.necessidade === 'Sistemas' || lead.necessidade === 'Aplicativos') {
        return {
          content: `Para sistemas e aplicativos, projetos começam a partir de R$ 20 mil! 💻

O valor varia MUITO conforme:
• Complexidade das funcionalidades
• Integrações necessárias (APIs, sistemas legados, etc)
• Volume de usuários
• Requisitos de segurança

Cada projeto é único! Que tal agendarmos uma call de 30min para entender sua necessidade e te dar um orçamento preciso?`
        };
      }
      return null;
    
    case 'pergunta_prazo':
      return {
        content: `O prazo varia conforme a complexidade! ⏱️

📱 Websites: 10 a 25 dias
💻 Sistemas: 45 a 85 dias  
🎨 Identidade Visual: 15 a 30 dias

Fazemos entregas parciais durante o desenvolvimento, então você acompanha e valida cada etapa!

Quer entender o prazo específico pro que você precisa? Podemos agendar uma call rápida! 📞`
      };
    
    case 'quero_agendar':
      if (lead.score_bant && lead.score_bant >= 50) {
        return {
          content: `Ótimo! Vou buscar os horários disponíveis pra gente... ⏰`,
          shouldExecuteTool: {
            toolName: 'buscar_slots',
            params: { proximos_dias: 7 }
          }
        };
      } else {
        return {
          content: `Perfeito! Antes de agendar, me conta rapidamente:
          
1. É pra você mesmo ou pra empresa? (só pra eu preparar a reunião certinho)
2. Quando você idealmente precisaria ter isso pronto?

Assim já entro na call alinhado com o que você precisa! 😊`
        };
      }
    
    case 'objecao_preco':
      return {
        content: `Entendo completamente! Investimento em tecnologia é decisão importante. 💰

Alguns pontos que ajudam a entender o valor:
• Você tem uma solução profissional completa, não um "site de catálogo"
• Inclui planejamento estratégico + design + desenvolvimento + testes + 1 ano de hospedagem + suporte
• Time sênior com anos de experiência
• Código proprietário seu (não templates)

Que tal uma call de 30min pra detalhar exatamente o que está incluso pro SEU caso? Assim você avalia o custo-benefício real! 📞`
      };
    
    case 'interesse_direto':
      return {
        content: `Demais! Adorei seu interesse! 🎉

Pra eu te ajudar da melhor forma, me conta:
• É pra você ou empresa?
• Quando precisa ter pronto?
• Tem budget definido ou quer entender valores primeiro?

Com isso, já vou direcionando pro melhor caminho! 😊`
      };
    
    default:
      return null;
  }
}
