export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          details: Json | null
          event_type: string
          id: string
          lead_id: string | null
          timestamp: string | null
        }
        Insert: {
          details?: Json | null
          event_type: string
          id?: string
          lead_id?: string | null
          timestamp?: string | null
        }
        Update: {
          details?: Json | null
          event_type?: string
          id?: string
          lead_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_branding: {
        Row: {
          assinatura: string | null
          briefing_pos_agendamento: Json | null
          created_at: string | null
          id: string
          nome_agente: string
          nome_empresa: string
          personalidade: string | null
          sobre_empresa: string | null
          tom_comunicacao: string | null
          updated_at: string | null
          usa_emojis: boolean | null
          website_empresa: string | null
        }
        Insert: {
          assinatura?: string | null
          briefing_pos_agendamento?: Json | null
          created_at?: string | null
          id?: string
          nome_agente?: string
          nome_empresa?: string
          personalidade?: string | null
          sobre_empresa?: string | null
          tom_comunicacao?: string | null
          updated_at?: string | null
          usa_emojis?: boolean | null
          website_empresa?: string | null
        }
        Update: {
          assinatura?: string | null
          briefing_pos_agendamento?: Json | null
          created_at?: string | null
          id?: string
          nome_agente?: string
          nome_empresa?: string
          personalidade?: string | null
          sobre_empresa?: string | null
          tom_comunicacao?: string | null
          updated_at?: string | null
          usa_emojis?: boolean | null
          website_empresa?: string | null
        }
        Relationships: []
      }
      agent_prompts: {
        Row: {
          channel: string
          config: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          prompt_text: string
          version: string
        }
        Insert: {
          channel?: string
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          prompt_text: string
          version: string
        }
        Update: {
          channel?: string
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          prompt_text?: string
          version?: string
        }
        Relationships: []
      }
      agent_resources: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          link: string
          nome: string
          preco: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          link: string
          nome: string
          preco?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          link?: string
          nome?: string
          preco?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      availability_exceptions: {
        Row: {
          created_at: string | null
          custom_end_time: string | null
          custom_start_time: string | null
          date: string
          id: string
          reason: string | null
          slot_duration: number | null
          type: string
        }
        Insert: {
          created_at?: string | null
          custom_end_time?: string | null
          custom_start_time?: string | null
          date: string
          id?: string
          reason?: string | null
          slot_duration?: number | null
          type: string
        }
        Update: {
          created_at?: string | null
          custom_end_time?: string | null
          custom_start_time?: string | null
          date?: string
          id?: string
          reason?: string | null
          slot_duration?: number | null
          type?: string
        }
        Relationships: []
      }
      availability_template_rules: {
        Row: {
          buffer_minutes: number | null
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          priority: number | null
          slot_duration: number | null
          start_time: string
          template_id: string | null
        }
        Insert: {
          buffer_minutes?: number | null
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          priority?: number | null
          slot_duration?: number | null
          start_time: string
          template_id?: string | null
        }
        Update: {
          buffer_minutes?: number | null
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          priority?: number | null
          slot_duration?: number | null
          start_time?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_template_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "availability_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      blocked_numbers: {
        Row: {
          blocked_at: string | null
          id: string
          motivo: string
          telefone: string
        }
        Insert: {
          blocked_at?: string | null
          id?: string
          motivo: string
          telefone: string
        }
        Update: {
          blocked_at?: string | null
          id?: string
          motivo?: string
          telefone?: string
        }
        Relationships: []
      }
      calendar_slots: {
        Row: {
          available: boolean | null
          batch_id: string | null
          date: string
          duration: number | null
          id: string
          is_exception: boolean | null
          reserved_at: string | null
          reserved_by: string | null
          template_id: string | null
          time: string
        }
        Insert: {
          available?: boolean | null
          batch_id?: string | null
          date: string
          duration?: number | null
          id?: string
          is_exception?: boolean | null
          reserved_at?: string | null
          reserved_by?: string | null
          template_id?: string | null
          time: string
        }
        Update: {
          available?: boolean | null
          batch_id?: string | null
          date?: string
          duration?: number | null
          id?: string
          is_exception?: boolean | null
          reserved_at?: string | null
          reserved_by?: string | null
          template_id?: string | null
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_slots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "slot_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_slots_reserved_by_fkey"
            columns: ["reserved_by"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_slots_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "availability_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          bant_progress: Json | null
          channel: string | null
          context: Json | null
          current_topic: string | null
          id: string
          information_provided: string[] | null
          interest_signals: number | null
          last_sentiment: string | null
          lead_id: string | null
          metadata: Json | null
          objections_count: number | null
          objections_raised: string[] | null
          preferences: Json | null
          questions_asked: string[] | null
          session_id: string
          state: Json | null
          updated_at: string | null
          visitor_id: string | null
        }
        Insert: {
          bant_progress?: Json | null
          channel?: string | null
          context?: Json | null
          current_topic?: string | null
          id?: string
          information_provided?: string[] | null
          interest_signals?: number | null
          last_sentiment?: string | null
          lead_id?: string | null
          metadata?: Json | null
          objections_count?: number | null
          objections_raised?: string[] | null
          preferences?: Json | null
          questions_asked?: string[] | null
          session_id: string
          state?: Json | null
          updated_at?: string | null
          visitor_id?: string | null
        }
        Update: {
          bant_progress?: Json | null
          channel?: string | null
          context?: Json | null
          current_topic?: string | null
          id?: string
          information_provided?: string[] | null
          interest_signals?: number | null
          last_sentiment?: string | null
          lead_id?: string | null
          metadata?: Json | null
          objections_count?: number | null
          objections_raised?: string[] | null
          preferences?: Json | null
          questions_asked?: string[] | null
          session_id?: string
          state?: Json | null
          updated_at?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_assignments: {
        Row: {
          assigned_at: string | null
          experiment_id: string | null
          id: string
          lead_id: string | null
          variant: string
        }
        Insert: {
          assigned_at?: string | null
          experiment_id?: string | null
          id?: string
          lead_id?: string | null
          variant: string
        }
        Update: {
          assigned_at?: string | null
          experiment_id?: string | null
          id?: string
          lead_id?: string | null
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_assignments_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_results: {
        Row: {
          experiment_id: string | null
          id: string
          lead_id: string | null
          metric: string
          recorded_at: string | null
          value: number | null
          variant: string
        }
        Insert: {
          experiment_id?: string | null
          id?: string
          lead_id?: string | null
          metric: string
          recorded_at?: string | null
          value?: number | null
          variant: string
        }
        Update: {
          experiment_id?: string | null
          id?: string
          lead_id?: string | null
          metric?: string
          recorded_at?: string | null
          value?: number | null
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_results_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_results_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          ended_at: string | null
          id: string
          name: string
          variants: Json
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          name: string
          variants: Json
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          name?: string
          variants?: Json
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          chunk_index: number | null
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          chunk_index?: number | null
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          chunk_index?: number | null
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_merges: {
        Row: {
          id: string
          master_lead_id: string
          merge_decisions: Json | null
          merge_strategy: string
          merged_at: string | null
          merged_by: string | null
          merged_data: Json
          merged_lead_id: string
          notes: string | null
        }
        Insert: {
          id?: string
          master_lead_id: string
          merge_decisions?: Json | null
          merge_strategy: string
          merged_at?: string | null
          merged_by?: string | null
          merged_data?: Json
          merged_lead_id: string
          notes?: string | null
        }
        Update: {
          id?: string
          master_lead_id?: string
          merge_decisions?: Json | null
          merge_strategy?: string
          merged_at?: string | null
          merged_by?: string | null
          merged_data?: Json
          merged_lead_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_merges_master_lead_id_fkey"
            columns: ["master_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_merges_merged_lead_id_fkey"
            columns: ["merged_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          bant_details: Json | null
          created_at: string | null
          email: string | null
          empresa: string | null
          id: string
          metadata: Json | null
          necessidade: string | null
          nome: string | null
          os_funil_lead: string | null
          proposta_ia: string | null
          score_bant: number | null
          stage: string | null
          telefone: string
          updated_at: string | null
        }
        Insert: {
          bant_details?: Json | null
          created_at?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          metadata?: Json | null
          necessidade?: string | null
          nome?: string | null
          os_funil_lead?: string | null
          proposta_ia?: string | null
          score_bant?: number | null
          stage?: string | null
          telefone: string
          updated_at?: string | null
        }
        Update: {
          bant_details?: Json | null
          created_at?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          metadata?: Json | null
          necessidade?: string | null
          nome?: string | null
          os_funil_lead?: string | null
          proposta_ia?: string | null
          score_bant?: number | null
          stage?: string | null
          telefone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          cancelled_at: string | null
          contexto_reuniao: Json | null
          created_at: string | null
          duration: number | null
          google_event_id: string | null
          id: string
          lead_id: string | null
          meeting_link: string | null
          scheduled_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          contexto_reuniao?: Json | null
          created_at?: string | null
          duration?: number | null
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          meeting_link?: string | null
          scheduled_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          contexto_reuniao?: Json | null
          created_at?: string | null
          duration?: number | null
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          meeting_link?: string | null
          scheduled_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel: string | null
          content: string
          conversation_id: string | null
          external_message_id: string | null
          id: string
          role: string
          timestamp: string | null
          tools_used: Json | null
        }
        Insert: {
          channel?: string | null
          content: string
          conversation_id?: string | null
          external_message_id?: string | null
          id?: string
          role: string
          timestamp?: string | null
          tools_used?: Json | null
        }
        Update: {
          channel?: string | null
          content?: string
          conversation_id?: string | null
          external_message_id?: string | null
          id?: string
          role?: string
          timestamp?: string | null
          tools_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          link: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      oauth_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          provider: string
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          provider: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reminder_settings: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          interval_minutes: number
          label: string
          message_template: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          interval_minutes: number
          label: string
          message_template: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          interval_minutes?: number
          label?: string
          message_template?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string | null
          id: string
          meeting_id: string | null
          scheduled_for: string
          sent: boolean | null
          sent_at: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          scheduled_for: string
          sent?: boolean | null
          sent_at?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          scheduled_for?: string
          sent?: boolean | null
          sent_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          cancel_reason: string | null
          canceled: boolean | null
          created_at: string | null
          id: string
          lead_id: string | null
          message: string
          scheduled_for: string
          sent: boolean | null
          sent_at: string | null
        }
        Insert: {
          cancel_reason?: string | null
          canceled?: boolean | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          message: string
          scheduled_for: string
          sent?: boolean | null
          sent_at?: string | null
        }
        Update: {
          cancel_reason?: string | null
          canceled?: boolean | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          message?: string
          scheduled_for?: string
          sent?: boolean | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          details: Json | null
          event_type: string
          id: string
          severity: string
          timestamp: string | null
          user_phone: string | null
        }
        Insert: {
          details?: Json | null
          event_type: string
          id?: string
          severity: string
          timestamp?: string | null
          user_phone?: string | null
        }
        Update: {
          details?: Json | null
          event_type?: string
          id?: string
          severity?: string
          timestamp?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      slot_batches: {
        Row: {
          active: boolean | null
          created_at: string | null
          days_of_week: number[]
          end_date: string
          end_time: string
          gap_minutes: number
          id: string
          name: string
          slot_duration: number
          start_date: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          days_of_week: number[]
          end_date: string
          end_time: string
          gap_minutes?: number
          id?: string
          name: string
          slot_duration?: number
          start_date: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          days_of_week?: number[]
          end_date?: string
          end_time?: string
          gap_minutes?: number
          id?: string
          name?: string
          slot_duration?: number
          start_date?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          agenda_link: string | null
          briefing_link: string | null
          created_at: string | null
          dias_antecedencia_agendamento: number | null
          endereco_comercial: string | null
          endereco_fiscal: string | null
          id: string
          samuel_email: string | null
          samuel_whatsapp: string | null
          updated_at: string | null
        }
        Insert: {
          agenda_link?: string | null
          briefing_link?: string | null
          created_at?: string | null
          dias_antecedencia_agendamento?: number | null
          endereco_comercial?: string | null
          endereco_fiscal?: string | null
          id?: string
          samuel_email?: string | null
          samuel_whatsapp?: string | null
          updated_at?: string | null
        }
        Update: {
          agenda_link?: string | null
          briefing_link?: string | null
          created_at?: string | null
          dias_antecedencia_agendamento?: number | null
          endereco_comercial?: string | null
          endereco_fiscal?: string | null
          id?: string
          samuel_email?: string | null
          samuel_whatsapp?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      test_mode_config: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      test_numbers: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string | null
          telefone: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string | null
          telefone: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string | null
          telefone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tool_execution_logs: {
        Row: {
          conversation_id: string | null
          error_message: string | null
          executed_at: string | null
          execution_time_ms: number | null
          id: string
          lead_id: string | null
          params: Json | null
          result: Json | null
          success: boolean
          tool_name: string
        }
        Insert: {
          conversation_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          lead_id?: string | null
          params?: Json | null
          result?: Json | null
          success: boolean
          tool_name: string
        }
        Update: {
          conversation_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          lead_id?: string | null
          params?: Json | null
          result?: Json | null
          success?: boolean
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_execution_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_execution_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agent_metrics: {
        Row: {
          conversas_negativas: number | null
          conversas_positivas: number | null
          handoffs_solicitados: number | null
          horas_ate_qualificacao: number | null
          leads_novos_7d: number | null
          leads_qualificados_7d: number | null
          reunioes_agendadas_7d: number | null
          taxa_qualificacao_7d: number | null
        }
        Relationships: []
      }
      available_slots_view: {
        Row: {
          available: boolean | null
          batch_id: string | null
          date: string | null
          duration: number | null
          id: string | null
          is_exception: boolean | null
          is_future_slot: boolean | null
          reserved_at: string | null
          reserved_by: string | null
          template_id: string | null
          time: string | null
        }
        Insert: {
          available?: boolean | null
          batch_id?: string | null
          date?: string | null
          duration?: number | null
          id?: string | null
          is_exception?: boolean | null
          is_future_slot?: never
          reserved_at?: string | null
          reserved_by?: string | null
          template_id?: string | null
          time?: string | null
        }
        Update: {
          available?: boolean | null
          batch_id?: string | null
          date?: string | null
          duration?: number | null
          id?: string | null
          is_exception?: boolean | null
          is_future_slot?: never
          reserved_at?: string | null
          reserved_by?: string | null
          template_id?: string | null
          time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_slots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "slot_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_slots_reserved_by_fkey"
            columns: ["reserved_by"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_slots_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "availability_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      find_potential_duplicates: {
        Args: {
          p_email?: string
          p_exclude_id?: string
          p_nome?: string
          p_telefone?: string
        }
        Returns: {
          lead_data: Json
          lead_id: string
          match_score: number
          match_type: string
        }[]
      }
      generate_slots_from_batch: {
        Args: {
          p_batch_id: string
          p_days_of_week: number[]
          p_end_date: string
          p_end_time: string
          p_gap_minutes: number
          p_slot_duration: number
          p_start_date: string
          p_start_time: string
        }
        Returns: number
      }
      generate_slots_from_template: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_template_id: string
        }
        Returns: number
      }
      is_slot_past: {
        Args: { slot_date: string; slot_time: string }
        Returns: boolean
      }
      match_knowledge_base: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          id: string
          metadata: Json
          similarity: number
          title: string
        }[]
      }
      normalize_phone: { Args: { phone_number: string }; Returns: string }
      normalize_phone_for_comparison: {
        Args: { phone_number: string }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sync_all_slots: {
        Args: never
        Returns: {
          slots_liberados: number
        }[]
      }
      sync_slots_with_meetings: { Args: never; Returns: number }
      validate_phone_format: {
        Args: { phone_number: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
