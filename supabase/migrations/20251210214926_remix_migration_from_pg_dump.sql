CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: block_slot_on_meeting_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.block_slot_on_meeting_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Se reunião não está cancelada, bloquear slot usando horário brasileiro
  IF NEW.status IN ('scheduled', 'confirmed') AND NEW.lead_id IS NOT NULL THEN
    UPDATE calendar_slots
    SET 
      available = false,
      reserved_by = NEW.lead_id,
      reserved_at = now()
    WHERE 
      date = DATE(NEW.scheduled_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')
      AND time = (NEW.scheduled_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::TIME
      AND duration = NEW.duration
      AND available = true;
    
    RAISE NOTICE 'Slot bloqueado para meeting_id: % (timezone BRT)', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: create_meeting_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_meeting_reminders() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  reminder_config RECORD;
BEGIN
  -- Buscar configurações ativas de lembretes
  FOR reminder_config IN 
    SELECT interval_minutes, label
    FROM reminder_settings
    WHERE enabled = true
  LOOP
    -- Criar lembrete com base na configuração
    INSERT INTO reminders (meeting_id, type, scheduled_for)
    VALUES (
      NEW.id,
      reminder_config.label,
      NEW.scheduled_date - (reminder_config.interval_minutes || ' minutes')::interval
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;


--
-- Name: ensure_single_active_prompt_per_channel(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_single_active_prompt_per_channel() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Se estamos ativando um prompt, desativar outros prompts DO MESMO CANAL
  IF NEW.is_active = true THEN
    UPDATE agent_prompts 
    SET is_active = false 
    WHERE id != NEW.id 
      AND channel = NEW.channel  -- CRÍTICO: só desativar do mesmo canal
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: find_potential_duplicates(text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_potential_duplicates(p_telefone text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_nome text DEFAULT NULL::text, p_exclude_id uuid DEFAULT NULL::uuid) RETURNS TABLE(lead_id uuid, match_type text, match_score integer, lead_data jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    CASE 
      WHEN normalize_phone_for_comparison(l.telefone) = normalize_phone_for_comparison(p_telefone) THEN 'phone_exact'
      WHEN LOWER(TRIM(l.email)) = LOWER(TRIM(p_email)) THEN 'email_exact'
      WHEN similarity(LOWER(l.nome), LOWER(p_nome)) > 0.7 THEN 'name_fuzzy'
      ELSE 'no_match'
    END as match_type,
    CASE 
      WHEN normalize_phone_for_comparison(l.telefone) = normalize_phone_for_comparison(p_telefone) THEN 100
      WHEN LOWER(TRIM(l.email)) = LOWER(TRIM(p_email)) THEN 90
      WHEN similarity(LOWER(l.nome), LOWER(p_nome)) > 0.7 THEN 60
      ELSE 0
    END as match_score,
    jsonb_build_object(
      'id', l.id,
      'nome', l.nome,
      'telefone', l.telefone,
      'email', l.email,
      'empresa', l.empresa,
      'stage', l.stage,
      'score_bant', l.score_bant,
      'created_at', l.created_at,
      'updated_at', l.updated_at
    ) as lead_data
  FROM leads l
  WHERE 
    (l.id != p_exclude_id OR p_exclude_id IS NULL)
    AND (
      (p_telefone IS NOT NULL AND normalize_phone_for_comparison(l.telefone) = normalize_phone_for_comparison(p_telefone))
      OR (p_email IS NOT NULL AND LOWER(TRIM(l.email)) = LOWER(TRIM(p_email)))
      OR (p_nome IS NOT NULL AND similarity(LOWER(l.nome), LOWER(p_nome)) > 0.7)
    )
  ORDER BY match_score DESC;
END;
$$;


--
-- Name: generate_slots_from_batch(uuid, date, date, integer[], time without time zone, time without time zone, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_slots_from_batch(p_batch_id uuid, p_start_date date, p_end_date date, p_days_of_week integer[], p_start_time time without time zone, p_end_time time without time zone, p_slot_duration integer, p_gap_minutes integer) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current_date date;
  v_current_time time;
  v_slots_created integer := 0;
  v_day_of_week integer;
BEGIN
  v_current_date := p_start_date;
  
  WHILE v_current_date <= p_end_date LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date);
    
    IF v_day_of_week = ANY(p_days_of_week) THEN
      v_current_time := p_start_time;
      
      WHILE v_current_time < p_end_time LOOP
        IF NOT EXISTS (
          SELECT 1 FROM calendar_slots
          WHERE date = v_current_date
          AND time = v_current_time
          AND available = true
        ) THEN
          INSERT INTO calendar_slots (
            batch_id,
            date,
            time,
            duration,
            available
          ) VALUES (
            p_batch_id,
            v_current_date,
            v_current_time,
            p_slot_duration,
            true
          );
          
          v_slots_created := v_slots_created + 1;
        END IF;
        
        v_current_time := v_current_time + (p_slot_duration || ' minutes')::interval + (p_gap_minutes || ' minutes')::interval;
      END LOOP;
    END IF;
    
    v_current_date := v_current_date + 1;
  END LOOP;
  
  RETURN v_slots_created;
END;
$$;


--
-- Name: generate_slots_from_template(uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_slots_from_template(p_template_id uuid, p_start_date date, p_end_date date) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current_date DATE;
  v_day_of_week INTEGER;
  v_rule RECORD;
  v_exception RECORD;
  v_current_time TIME;
  v_slots_created INTEGER := 0;
  v_has_exception BOOLEAN;
BEGIN
  -- Loop por cada dia no range
  v_current_date := p_start_date;
  
  WHILE v_current_date <= p_end_date LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date);
    v_has_exception := false;
    
    -- Verificar se há exceção para este dia
    SELECT * INTO v_exception
    FROM availability_exceptions
    WHERE date = v_current_date
    LIMIT 1;
    
    IF FOUND THEN
      v_has_exception := true;
      
      -- Se for indisponível, pular este dia
      IF v_exception.type = 'unavailable' THEN
        v_current_date := v_current_date + 1;
        CONTINUE;
      END IF;
      
      -- Se for custom_hours, criar slots com horário customizado
      IF v_exception.type = 'custom_hours' AND 
         v_exception.custom_start_time IS NOT NULL AND 
         v_exception.custom_end_time IS NOT NULL THEN
        
        v_current_time := v_exception.custom_start_time;
        
        WHILE v_current_time < v_exception.custom_end_time LOOP
          -- Verificar se já existe slot para este horário
          IF NOT EXISTS (
            SELECT 1 FROM calendar_slots 
            WHERE date = v_current_date AND time = v_current_time
          ) THEN
            INSERT INTO calendar_slots (date, time, duration, available, template_id, is_exception)
            VALUES (v_current_date, v_current_time, COALESCE(v_exception.slot_duration, 30), true, p_template_id, true);
            v_slots_created := v_slots_created + 1;
          END IF;
          
          v_current_time := v_current_time + (COALESCE(v_exception.slot_duration, 30) || ' minutes')::INTERVAL;
        END LOOP;
      END IF;
    END IF;
    
    -- Se não há exceção, usar regras do template
    IF NOT v_has_exception THEN
      -- Buscar regra para este dia da semana
      FOR v_rule IN 
        SELECT * FROM availability_template_rules
        WHERE template_id = p_template_id 
        AND day_of_week = v_day_of_week
        ORDER BY priority DESC
      LOOP
        v_current_time := v_rule.start_time;
        
        -- Gerar slots para este período
        WHILE v_current_time < v_rule.end_time LOOP
          -- Verificar se já existe slot para este horário
          IF NOT EXISTS (
            SELECT 1 FROM calendar_slots 
            WHERE date = v_current_date AND time = v_current_time
          ) THEN
            INSERT INTO calendar_slots (date, time, duration, available, template_id, is_exception)
            VALUES (v_current_date, v_current_time, v_rule.slot_duration, true, p_template_id, false);
            v_slots_created := v_slots_created + 1;
          END IF;
          
          -- Avançar para próximo slot (duração + buffer)
          v_current_time := v_current_time + ((v_rule.slot_duration + v_rule.buffer_minutes) || ' minutes')::INTERVAL;
        END LOOP;
      END LOOP;
    END IF;
    
    v_current_date := v_current_date + 1;
  END LOOP;
  
  RETURN v_slots_created;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$;


--
-- Name: is_slot_past(date, time without time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_slot_past(slot_date date, slot_time time without time zone) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT (slot_date + slot_time) AT TIME ZONE 'America/Sao_Paulo' < now() AT TIME ZONE 'America/Sao_Paulo';
$$;


--
-- Name: liberar_slot_on_meeting_cancel(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.liberar_slot_on_meeting_cancel() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Liberar slot se status mudou para 'cancelled' ou 'no_show'
  IF (OLD.status != NEW.status) AND 
     (NEW.status IN ('cancelled', 'no_show')) THEN
    
    UPDATE calendar_slots
    SET 
      available = true,
      reserved_by = NULL,
      reserved_at = NULL
    WHERE 
      reserved_by = OLD.lead_id
      AND date = DATE(OLD.scheduled_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')
      AND time = (OLD.scheduled_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::TIME
      AND duration = OLD.duration;
    
    RAISE NOTICE 'Slot liberado para meeting_id: % (status: %, timezone BRT)', OLD.id, NEW.status;
  END IF;
  
  -- Liberar slot antigo se data foi alterada (reagendamento)
  IF OLD.scheduled_date != NEW.scheduled_date THEN
    UPDATE calendar_slots
    SET 
      available = true,
      reserved_by = NULL,
      reserved_at = NULL
    WHERE 
      reserved_by = OLD.lead_id
      AND date = DATE(OLD.scheduled_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')
      AND time = (OLD.scheduled_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::TIME
      AND duration = OLD.duration;
    
    RAISE NOTICE 'Slot antigo liberado por reagendamento, meeting_id: % (timezone BRT)', OLD.id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: liberar_slot_on_meeting_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.liberar_slot_on_meeting_delete() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE calendar_slots
  SET 
    available = true,
    reserved_by = NULL,
    reserved_at = NULL
  WHERE 
    reserved_by = OLD.lead_id
    AND date = DATE(OLD.scheduled_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')
    AND time = (OLD.scheduled_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::TIME
    AND duration = OLD.duration;
  
  RAISE NOTICE 'Slot liberado por DELETE de meeting_id: % (timezone BRT)', OLD.id;
  RETURN OLD;
END;
$$;


--
-- Name: log_lead_bant_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_lead_bant_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Verifica se bant_details mudou
  IF (OLD.bant_details IS DISTINCT FROM NEW.bant_details) THEN
    INSERT INTO activity_log (lead_id, event_type, details)
    VALUES (
      NEW.id,
      'bant_atualizado',
      jsonb_build_object(
        'bant_anterior', OLD.bant_details,
        'bant_novo', NEW.bant_details,
        'score_anterior', OLD.score_bant,
        'score_novo', NEW.score_bant
      )
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: match_knowledge_base(public.vector, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_knowledge_base(query_embedding public.vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 5) RETURNS TABLE(id uuid, title text, content text, chunk_index integer, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.chunk_index,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: normalize_phone(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_phone(phone_number text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN regexp_replace(phone_number, '[^0-9]', '', 'g');
END;
$$;


--
-- Name: normalize_phone_for_comparison(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_phone_for_comparison(phone_number text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  cleaned TEXT;
  ddd TEXT;
  first_digit TEXT;
BEGIN
  -- Remove caracteres não numéricos
  cleaned := regexp_replace(phone_number, '\D', '', 'g');
  
  -- Se não começa com 55 ou não tem pelo menos 12 dígitos, retorna como está
  IF NOT cleaned ~ '^55' OR length(cleaned) < 12 THEN
    RETURN cleaned;
  END IF;
  
  -- Extrai DDD (caracteres 3 e 4)
  ddd := substring(cleaned, 3, 2);
  
  -- Verifica se tem 13 dígitos (55 + DDD + 9 + 8 dígitos)
  IF length(cleaned) = 13 THEN
    first_digit := substring(cleaned, 5, 1);
    
    -- Se o primeiro dígito após o DDD é 9, remove ele
    IF first_digit = '9' THEN
      RETURN '55' || ddd || substring(cleaned, 6);
    END IF;
  END IF;
  
  -- Retorna normalizado
  RETURN cleaned;
END;
$$;


--
-- Name: release_slot_on_meeting_cancel(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_slot_on_meeting_cancel() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Se a reunião foi cancelada, liberar o slot correspondente
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    
    UPDATE calendar_slots
    SET 
      available = true,
      reserved_by = NULL,
      reserved_at = NULL
    WHERE 
      date = DATE(NEW.scheduled_date) AND
      time = CAST(NEW.scheduled_date AS TIME);
    
    RAISE LOG 'Slot liberado para reunião %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: sync_all_slots(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_all_slots() RETURNS TABLE(slots_liberados integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  count_liberados INTEGER;
BEGIN
  -- Liberar todos os slots órfãos
  UPDATE calendar_slots cs
  SET 
    available = true,
    reserved_by = NULL,
    reserved_at = NULL
  WHERE 
    cs.available = false
    AND NOT EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.lead_id = cs.reserved_by
        AND m.scheduled_date::date = cs.date
        AND m.scheduled_date::time = cs.time
        AND m.status IN ('scheduled', 'confirmed')
        AND m.duration = cs.duration
    );
  
  GET DIAGNOSTICS count_liberados = ROW_COUNT;
  
  RETURN QUERY SELECT count_liberados;
END;
$$;


--
-- Name: sync_slots_with_meetings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_slots_with_meetings() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  rows_updated INTEGER := 0;
BEGIN
  -- Atualizar slots que têm meetings mas estão disponíveis
  WITH occupied_slots AS (
    SELECT DISTINCT
      DATE(m.scheduled_date) as slot_date,
      CAST(m.scheduled_date AS TIME) as slot_time,
      m.lead_id,
      m.created_at
    FROM meetings m
    WHERE m.status IN ('scheduled', 'confirmed')
  )
  UPDATE calendar_slots cs
  SET 
    available = false,
    reserved_by = os.lead_id,
    reserved_at = os.created_at
  FROM occupied_slots os
  WHERE 
    cs.date = os.slot_date
    AND cs.time = os.slot_time
    AND cs.available = true;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  RAISE NOTICE 'Sincronizados % slots com meetings', rows_updated;
  RETURN rows_updated;
END;
$$;


--
-- Name: update_reminder_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_reminder_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_slot_batches_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_slot_batches_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_test_mode_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_test_mode_timestamp() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: validate_and_normalize_phone(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_and_normalize_phone() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.telefone := normalize_phone(NEW.telefone);
  
  IF NOT validate_phone_format(NEW.telefone) THEN
    RAISE EXCEPTION 'Formato de telefone inválido. Use formato internacional (DDI + DDD + número). Exemplo: 5511987654321';
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_phone_format(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_phone_format(phone_number text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  phone_number := regexp_replace(phone_number, '[^0-9]', '', 'g');
  
  IF length(phone_number) >= 8 AND length(phone_number) <= 15 THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    event_type text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    "timestamp" timestamp with time zone DEFAULT now()
);


--
-- Name: agent_branding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_branding (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_agente text DEFAULT 'Luna'::text NOT NULL,
    nome_empresa text DEFAULT 'Sagitta Digital'::text NOT NULL,
    website_empresa text,
    sobre_empresa text,
    tom_comunicacao text DEFAULT 'profissional'::text,
    personalidade text DEFAULT 'Amigável, consultiva, proativa, focada em resultados'::text,
    usa_emojis boolean DEFAULT true,
    assinatura text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    briefing_pos_agendamento jsonb DEFAULT '{"perguntas": ["Qual o principal desafio que você quer resolver?", "Tem alguma referência de site/app que você gosta?", "Você tem algum prazo específico em mente?"]}'::jsonb
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    session_id text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb,
    state jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    current_topic text,
    interest_signals integer DEFAULT 0,
    objections_count integer DEFAULT 0,
    last_sentiment text,
    preferences jsonb DEFAULT '{}'::jsonb,
    bant_progress jsonb DEFAULT '{"need": "not_asked", "budget": "not_asked", "timeline": "not_asked", "authority": "not_asked"}'::jsonb,
    questions_asked text[] DEFAULT '{}'::text[],
    information_provided text[] DEFAULT '{}'::text[],
    objections_raised text[] DEFAULT '{}'::text[],
    channel text DEFAULT 'whatsapp'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    visitor_id text,
    CONSTRAINT conversations_channel_check CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'web'::text, 'instagram'::text, 'telegram'::text, 'messenger'::text, 'sms'::text])))
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text,
    telefone text NOT NULL,
    email text,
    empresa text,
    necessidade text,
    stage text DEFAULT 'Novo'::text,
    score_bant integer DEFAULT 0,
    bant_details jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    proposta_ia text,
    os_funil_lead text,
    CONSTRAINT check_os_funil_lead CHECK (((os_funil_lead IS NULL) OR (os_funil_lead = ANY (ARRAY['Acompanhar'::text, 'Importante'::text, 'Projeto a ser fechado'::text, 'Atendimento humano'::text])))),
    CONSTRAINT leads_necessidade_check CHECK ((necessidade = ANY (ARRAY['Websites'::text, 'Sistemas e Aplicativos'::text, 'Gestão de Redes Sociais'::text, 'Identidade Visual'::text]))),
    CONSTRAINT leads_score_bant_check CHECK (((score_bant >= 0) AND (score_bant <= 100))),
    CONSTRAINT leads_stage_check CHECK ((stage = ANY (ARRAY['Novo'::text, 'Apresentação Enviada'::text, 'Segundo Contato'::text, 'Reunião Agendada'::text, 'Proposta Enviada'::text, 'Fechado'::text, 'Cancelado'::text])))
);


--
-- Name: meetings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meetings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    google_event_id text,
    scheduled_date timestamp with time zone NOT NULL,
    duration integer DEFAULT 30,
    status text DEFAULT 'scheduled'::text,
    meeting_link text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    cancelled_at timestamp with time zone,
    contexto_reuniao jsonb,
    CONSTRAINT meetings_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])))
);


--
-- Name: agent_metrics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.agent_metrics WITH (security_invoker='true') AS
 SELECT ( SELECT count(*) AS count
           FROM public.leads
          WHERE (leads.created_at >= (now() - '7 days'::interval))) AS leads_novos_7d,
    ( SELECT count(*) AS count
           FROM public.leads
          WHERE ((leads.created_at >= (now() - '7 days'::interval)) AND (leads.score_bant >= 70))) AS leads_qualificados_7d,
        CASE
            WHEN (( SELECT count(*) AS count
               FROM public.leads
              WHERE (leads.created_at >= (now() - '7 days'::interval))) > 0) THEN round(((( SELECT (count(*))::numeric AS count
               FROM public.leads
              WHERE ((leads.created_at >= (now() - '7 days'::interval)) AND (leads.score_bant >= 70))) * 100.0) / (( SELECT count(*) AS count
               FROM public.leads
              WHERE (leads.created_at >= (now() - '7 days'::interval))))::numeric), 1)
            ELSE (0)::numeric
        END AS taxa_qualificacao_7d,
    ( SELECT count(*) AS count
           FROM public.meetings
          WHERE (meetings.created_at >= (now() - '7 days'::interval))) AS reunioes_agendadas_7d,
    ( SELECT avg((EXTRACT(epoch FROM (leads.updated_at - leads.created_at)) / (3600)::numeric)) AS avg
           FROM public.leads
          WHERE ((leads.score_bant >= 70) AND (leads.created_at >= (now() - '7 days'::interval)))) AS horas_ate_qualificacao,
    ( SELECT count(DISTINCT conversations.lead_id) AS count
           FROM public.conversations
          WHERE ((conversations.last_sentiment = 'positive'::text) AND (conversations.updated_at >= (now() - '7 days'::interval)))) AS conversas_positivas,
    ( SELECT count(DISTINCT conversations.lead_id) AS count
           FROM public.conversations
          WHERE ((conversations.last_sentiment = 'negative'::text) AND (conversations.updated_at >= (now() - '7 days'::interval)))) AS conversas_negativas,
    ( SELECT count(*) AS count
           FROM public.activity_log
          WHERE ((activity_log.event_type = 'handoff_request'::text) AND (activity_log."timestamp" >= (now() - '7 days'::interval)))) AS handoffs_solicitados;


--
-- Name: agent_prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version text NOT NULL,
    name text NOT NULL,
    prompt_text text NOT NULL,
    is_active boolean DEFAULT false,
    config jsonb DEFAULT '{"max_tokens": 500, "temperature": 0.7}'::jsonb,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    notes text,
    channel text DEFAULT 'whatsapp'::text NOT NULL,
    CONSTRAINT agent_prompts_channel_check CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'web'::text])))
);


--
-- Name: agent_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo text NOT NULL,
    nome text NOT NULL,
    link text NOT NULL,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    preco text,
    descricao text
);


--
-- Name: availability_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_exceptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    type text NOT NULL,
    reason text,
    custom_start_time time without time zone,
    custom_end_time time without time zone,
    slot_duration integer DEFAULT 30,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT availability_exceptions_type_check CHECK ((type = ANY (ARRAY['unavailable'::text, 'custom_hours'::text])))
);


--
-- Name: availability_template_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_template_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    slot_duration integer DEFAULT 30,
    buffer_minutes integer DEFAULT 0,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT availability_template_rules_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: availability_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: calendar_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    "time" time without time zone NOT NULL,
    duration integer DEFAULT 30,
    available boolean DEFAULT true,
    reserved_by uuid,
    reserved_at timestamp with time zone,
    template_id uuid,
    is_exception boolean DEFAULT false,
    batch_id uuid
);


--
-- Name: available_slots_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.available_slots_view WITH (security_invoker='true') AS
 SELECT id,
    date,
    "time",
    duration,
    available,
    reserved_by,
    reserved_at,
    template_id,
    is_exception,
    batch_id,
    (NOT public.is_slot_past(date, "time")) AS is_future_slot
   FROM public.calendar_slots cs
  WHERE ((available = true) AND (reserved_by IS NULL) AND (NOT public.is_slot_past(date, "time")));


--
-- Name: blocked_numbers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_numbers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    telefone text NOT NULL,
    motivo text NOT NULL,
    blocked_at timestamp with time zone DEFAULT now()
);


--
-- Name: experiment_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.experiment_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    experiment_id uuid,
    lead_id uuid,
    variant text NOT NULL,
    assigned_at timestamp with time zone DEFAULT now()
);


--
-- Name: experiment_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.experiment_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    experiment_id uuid,
    lead_id uuid,
    variant text NOT NULL,
    metric text NOT NULL,
    value numeric,
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: experiments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.experiments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    variants jsonb NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone
);


--
-- Name: knowledge_base; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_base (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    chunk_index integer,
    embedding public.vector(1536),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lead_merges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_merges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    master_lead_id uuid NOT NULL,
    merged_lead_id uuid NOT NULL,
    merge_strategy text NOT NULL,
    merged_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    merge_decisions jsonb,
    merged_at timestamp with time zone DEFAULT now(),
    merged_by text,
    notes text
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid,
    role text NOT NULL,
    content text NOT NULL,
    tools_used jsonb,
    "timestamp" timestamp with time zone DEFAULT now(),
    channel text DEFAULT 'whatsapp'::text,
    external_message_id text,
    CONSTRAINT messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text, 'tool'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    description text,
    link text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: oauth_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    token_type text DEFAULT 'Bearer'::text,
    expires_at timestamp with time zone NOT NULL,
    scope text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT oauth_tokens_provider_check CHECK ((provider = ANY (ARRAY['google'::text, 'microsoft'::text, 'other'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    nome text,
    email text,
    telefone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: reminder_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminder_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interval_minutes integer NOT NULL,
    label text NOT NULL,
    enabled boolean DEFAULT true,
    message_template text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meeting_id uuid,
    type text NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    sent boolean DEFAULT false,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: scheduled_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    message text NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    sent boolean DEFAULT false,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    canceled boolean DEFAULT false,
    cancel_reason text
);


--
-- Name: security_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    user_phone text,
    details jsonb DEFAULT '{}'::jsonb,
    severity text NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    CONSTRAINT security_logs_event_type_check CHECK ((event_type = ANY (ARRAY['prompt_injection'::text, 'rate_limit_exceeded'::text, 'pii_detected'::text, 'suspicious_pattern'::text, 'blocked_user'::text]))),
    CONSTRAINT security_logs_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: slot_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slot_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days_of_week integer[] NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    slot_duration integer DEFAULT 30 NOT NULL,
    gap_minutes integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agenda_link text DEFAULT 'https://calendar.app.google/CnGg9rndn1WLWtWL7'::text,
    samuel_whatsapp text DEFAULT '+55 11 94203-8803'::text,
    samuel_email text DEFAULT 'samuel.alves@sagittadigital.com.br'::text,
    briefing_link text DEFAULT 'https://forms.gle/x6eadhkRbWQrCRzh8'::text,
    endereco_fiscal text DEFAULT 'Avenida Paulista 1636, CONJ 04 PAVMTO15, Cond Paulista Corporate, São Paulo, SP 01310-200, BR'::text,
    endereco_comercial text DEFAULT 'Av. Prolongacion Beni, OFICENTRO, Piso 11, BLOQUE B, Oficina 1105, Santa Cruz de la Sierra, Andrés Ibáñez 58920, Bolívia (MX)'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    dias_antecedencia_agendamento integer DEFAULT 3
);


--
-- Name: test_mode_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_mode_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_numbers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_numbers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    telefone text NOT NULL,
    nome text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tool_execution_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tool_execution_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid,
    lead_id uuid,
    tool_name text NOT NULL,
    params jsonb,
    result jsonb,
    success boolean NOT NULL,
    error_message text,
    execution_time_ms integer,
    executed_at timestamp with time zone DEFAULT now()
);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: agent_branding agent_branding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_branding
    ADD CONSTRAINT agent_branding_pkey PRIMARY KEY (id);


--
-- Name: agent_prompts agent_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_prompts
    ADD CONSTRAINT agent_prompts_pkey PRIMARY KEY (id);


--
-- Name: agent_prompts agent_prompts_version_channel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_prompts
    ADD CONSTRAINT agent_prompts_version_channel_key UNIQUE (version, channel);


--
-- Name: agent_resources agent_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_resources
    ADD CONSTRAINT agent_resources_pkey PRIMARY KEY (id);


--
-- Name: availability_exceptions availability_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_exceptions
    ADD CONSTRAINT availability_exceptions_pkey PRIMARY KEY (id);


--
-- Name: availability_template_rules availability_template_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_template_rules
    ADD CONSTRAINT availability_template_rules_pkey PRIMARY KEY (id);


--
-- Name: availability_templates availability_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_templates
    ADD CONSTRAINT availability_templates_pkey PRIMARY KEY (id);


--
-- Name: blocked_numbers blocked_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_numbers
    ADD CONSTRAINT blocked_numbers_pkey PRIMARY KEY (id);


--
-- Name: blocked_numbers blocked_numbers_telefone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_numbers
    ADD CONSTRAINT blocked_numbers_telefone_key UNIQUE (telefone);


--
-- Name: calendar_slots calendar_slots_date_time_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_slots
    ADD CONSTRAINT calendar_slots_date_time_key UNIQUE (date, "time");


--
-- Name: calendar_slots calendar_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_slots
    ADD CONSTRAINT calendar_slots_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_session_id_key UNIQUE (session_id);


--
-- Name: experiment_assignments experiment_assignments_experiment_id_lead_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiment_assignments
    ADD CONSTRAINT experiment_assignments_experiment_id_lead_id_key UNIQUE (experiment_id, lead_id);


--
-- Name: experiment_assignments experiment_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiment_assignments
    ADD CONSTRAINT experiment_assignments_pkey PRIMARY KEY (id);


--
-- Name: experiment_results experiment_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiment_results
    ADD CONSTRAINT experiment_results_pkey PRIMARY KEY (id);


--
-- Name: experiments experiments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiments
    ADD CONSTRAINT experiments_name_key UNIQUE (name);


--
-- Name: experiments experiments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiments
    ADD CONSTRAINT experiments_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base knowledge_base_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_pkey PRIMARY KEY (id);


--
-- Name: lead_merges lead_merges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_merges
    ADD CONSTRAINT lead_merges_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: leads leads_telefone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_telefone_key UNIQUE (telefone);


--
-- Name: meetings meetings_google_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_google_event_id_key UNIQUE (google_event_id);


--
-- Name: meetings meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: oauth_tokens oauth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_tokens
    ADD CONSTRAINT oauth_tokens_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: reminder_settings reminder_settings_interval_minutes_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT reminder_settings_interval_minutes_key UNIQUE (interval_minutes);


--
-- Name: reminder_settings reminder_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT reminder_settings_pkey PRIMARY KEY (id);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- Name: scheduled_messages scheduled_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_messages
    ADD CONSTRAINT scheduled_messages_pkey PRIMARY KEY (id);


--
-- Name: security_logs security_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_logs
    ADD CONSTRAINT security_logs_pkey PRIMARY KEY (id);


--
-- Name: slot_batches slot_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slot_batches
    ADD CONSTRAINT slot_batches_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: test_mode_config test_mode_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_mode_config
    ADD CONSTRAINT test_mode_config_pkey PRIMARY KEY (id);


--
-- Name: test_numbers test_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_numbers
    ADD CONSTRAINT test_numbers_pkey PRIMARY KEY (id);


--
-- Name: test_numbers test_numbers_telefone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_numbers
    ADD CONSTRAINT test_numbers_telefone_key UNIQUE (telefone);


--
-- Name: tool_execution_logs tool_execution_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_execution_logs
    ADD CONSTRAINT tool_execution_logs_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_lead ON public.activity_log USING btree (lead_id);


--
-- Name: idx_activity_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_timestamp ON public.activity_log USING btree ("timestamp" DESC);


--
-- Name: idx_agent_prompts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_prompts_active ON public.agent_prompts USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_agent_prompts_channel_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_prompts_channel_active ON public.agent_prompts USING btree (channel, is_active) WHERE (is_active = true);


--
-- Name: idx_agent_prompts_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_prompts_version ON public.agent_prompts USING btree (version DESC);


--
-- Name: idx_availability_exceptions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_exceptions_date ON public.availability_exceptions USING btree (date);


--
-- Name: idx_availability_template_rules_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_availability_template_rules_template ON public.availability_template_rules USING btree (template_id, day_of_week);


--
-- Name: idx_blocked_telefone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocked_telefone ON public.blocked_numbers USING btree (telefone);


--
-- Name: idx_calendar_slots_date_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_slots_date_available ON public.calendar_slots USING btree (date, available) WHERE (available = true);


--
-- Name: idx_calendar_slots_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_slots_template ON public.calendar_slots USING btree (template_id);


--
-- Name: idx_conv_sentiment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conv_sentiment ON public.conversations USING btree (last_sentiment);


--
-- Name: idx_conv_topic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conv_topic ON public.conversations USING btree (current_topic);


--
-- Name: idx_conversations_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_channel ON public.conversations USING btree (channel);


--
-- Name: idx_conversations_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_lead ON public.conversations USING btree (lead_id);


--
-- Name: idx_conversations_objections; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_objections ON public.conversations USING gin (objections_raised);


--
-- Name: idx_conversations_questions; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_questions ON public.conversations USING gin (questions_asked);


--
-- Name: idx_conversations_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_session ON public.conversations USING btree (session_id);


--
-- Name: idx_conversations_visitor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_visitor ON public.conversations USING btree (visitor_id);


--
-- Name: idx_exp_assignments; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exp_assignments ON public.experiment_assignments USING btree (experiment_id, lead_id);


--
-- Name: idx_exp_results; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exp_results ON public.experiment_results USING btree (experiment_id, variant, metric);


--
-- Name: idx_knowledge_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_embedding ON public.knowledge_base USING ivfflat (embedding public.vector_cosine_ops);


--
-- Name: idx_lead_merges_master; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_merges_master ON public.lead_merges USING btree (master_lead_id);


--
-- Name: idx_lead_merges_merged; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_merges_merged ON public.lead_merges USING btree (merged_lead_id);


--
-- Name: idx_lead_merges_strategy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_merges_strategy ON public.lead_merges USING btree (merge_strategy);


--
-- Name: idx_leads_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_created ON public.leads USING btree (created_at DESC);


--
-- Name: idx_leads_email_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_email_trgm ON public.leads USING gin (lower(email) public.gin_trgm_ops);


--
-- Name: idx_leads_nome_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_nome_trgm ON public.leads USING gin (nome public.gin_trgm_ops);


--
-- Name: idx_leads_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_score ON public.leads USING btree (score_bant);


--
-- Name: idx_leads_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_stage ON public.leads USING btree (stage);


--
-- Name: idx_leads_telefone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_telefone ON public.leads USING btree (telefone);


--
-- Name: idx_leads_telefone_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_telefone_trgm ON public.leads USING gin (telefone public.gin_trgm_ops);


--
-- Name: idx_meetings_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_date ON public.meetings USING btree (scheduled_date);


--
-- Name: idx_meetings_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_lead ON public.meetings USING btree (lead_id);


--
-- Name: idx_meetings_scheduled_date_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_scheduled_date_status ON public.meetings USING btree (scheduled_date, status) WHERE (status = ANY (ARRAY['scheduled'::text, 'confirmed'::text]));


--
-- Name: idx_meetings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_status ON public.meetings USING btree (status);


--
-- Name: idx_messages_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_channel ON public.messages USING btree (channel);


--
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id);


--
-- Name: idx_messages_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_timestamp ON public.messages USING btree ("timestamp" DESC);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_oauth_tokens_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_tokens_provider ON public.oauth_tokens USING btree (provider);


--
-- Name: idx_profiles_telefone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_telefone ON public.profiles USING btree (telefone);


--
-- Name: idx_reminders_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminders_scheduled ON public.reminders USING btree (scheduled_for) WHERE (sent = false);


--
-- Name: idx_scheduled_by_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_by_lead ON public.scheduled_messages USING btree (lead_id, sent);


--
-- Name: idx_scheduled_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_pending ON public.scheduled_messages USING btree (scheduled_for, sent) WHERE ((sent = false) AND (canceled = false));


--
-- Name: idx_security_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_severity ON public.security_logs USING btree (severity);


--
-- Name: idx_security_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_timestamp ON public.security_logs USING btree ("timestamp" DESC);


--
-- Name: idx_slots_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_available ON public.calendar_slots USING btree (available) WHERE (available = true);


--
-- Name: idx_slots_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_date ON public.calendar_slots USING btree (date);


--
-- Name: idx_test_numbers_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_numbers_ativo ON public.test_numbers USING btree (ativo);


--
-- Name: idx_test_numbers_telefone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_numbers_telefone ON public.test_numbers USING btree (telefone);


--
-- Name: idx_tool_logs_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tool_logs_conversation ON public.tool_execution_logs USING btree (conversation_id);


--
-- Name: idx_tool_logs_executed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tool_logs_executed_at ON public.tool_execution_logs USING btree (executed_at DESC);


--
-- Name: idx_tool_logs_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tool_logs_lead ON public.tool_execution_logs USING btree (lead_id);


--
-- Name: idx_tool_logs_success; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tool_logs_success ON public.tool_execution_logs USING btree (success);


--
-- Name: idx_tool_logs_tool_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tool_logs_tool_name ON public.tool_execution_logs USING btree (tool_name);


--
-- Name: messages_external_message_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX messages_external_message_id_idx ON public.messages USING btree (external_message_id) WHERE (external_message_id IS NOT NULL);


--
-- Name: leads after_lead_bant_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER after_lead_bant_change AFTER UPDATE ON public.leads FOR EACH ROW WHEN ((old.bant_details IS DISTINCT FROM new.bant_details)) EXECUTE FUNCTION public.log_lead_bant_change();


--
-- Name: meetings after_meeting_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER after_meeting_insert AFTER INSERT ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.create_meeting_reminders();


--
-- Name: agent_prompts ensure_single_active_prompt_per_channel_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ensure_single_active_prompt_per_channel_trigger BEFORE INSERT OR UPDATE ON public.agent_prompts FOR EACH ROW EXECUTE FUNCTION public.ensure_single_active_prompt_per_channel();


--
-- Name: meetings meeting_deleted_liberar_slot; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER meeting_deleted_liberar_slot AFTER DELETE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.liberar_slot_on_meeting_delete();


--
-- Name: meetings meeting_inserted_block_slot; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER meeting_inserted_block_slot AFTER INSERT ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.block_slot_on_meeting_insert();


--
-- Name: meetings meeting_updated_liberar_slot; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER meeting_updated_liberar_slot AFTER UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.liberar_slot_on_meeting_cancel();


--
-- Name: reminder_settings reminder_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reminder_settings_updated_at BEFORE UPDATE ON public.reminder_settings FOR EACH ROW EXECUTE FUNCTION public.update_reminder_settings_updated_at();


--
-- Name: agent_branding update_agent_branding_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_branding_updated_at BEFORE UPDATE ON public.agent_branding FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_resources update_agent_resources_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_resources_updated_at BEFORE UPDATE ON public.agent_resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: availability_templates update_availability_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_availability_templates_updated_at BEFORE UPDATE ON public.availability_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: conversations update_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: knowledge_base update_knowledge_base_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON public.knowledge_base FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leads update_leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: meetings update_meetings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: oauth_tokens update_oauth_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_oauth_tokens_updated_at BEFORE UPDATE ON public.oauth_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: slot_batches update_slot_batches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_slot_batches_updated_at BEFORE UPDATE ON public.slot_batches FOR EACH ROW EXECUTE FUNCTION public.update_slot_batches_updated_at();


--
-- Name: test_mode_config update_test_mode_config_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_test_mode_config_timestamp BEFORE UPDATE ON public.test_mode_config FOR EACH ROW EXECUTE FUNCTION public.update_test_mode_timestamp();


--
-- Name: test_numbers validate_phone_before_insert_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_phone_before_insert_update BEFORE INSERT OR UPDATE ON public.test_numbers FOR EACH ROW EXECUTE FUNCTION public.validate_and_normalize_phone();


--
-- Name: activity_log activity_log_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: availability_template_rules availability_template_rules_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_template_rules
    ADD CONSTRAINT availability_template_rules_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.availability_templates(id) ON DELETE CASCADE;


--
-- Name: calendar_slots calendar_slots_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_slots
    ADD CONSTRAINT calendar_slots_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.slot_batches(id) ON DELETE SET NULL;


--
-- Name: calendar_slots calendar_slots_reserved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_slots
    ADD CONSTRAINT calendar_slots_reserved_by_fkey FOREIGN KEY (reserved_by) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: calendar_slots calendar_slots_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_slots
    ADD CONSTRAINT calendar_slots_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.availability_templates(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: experiment_assignments experiment_assignments_experiment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiment_assignments
    ADD CONSTRAINT experiment_assignments_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.experiments(id) ON DELETE CASCADE;


--
-- Name: experiment_assignments experiment_assignments_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiment_assignments
    ADD CONSTRAINT experiment_assignments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: experiment_results experiment_results_experiment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiment_results
    ADD CONSTRAINT experiment_results_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.experiments(id) ON DELETE CASCADE;


--
-- Name: experiment_results experiment_results_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiment_results
    ADD CONSTRAINT experiment_results_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_merges lead_merges_master_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_merges
    ADD CONSTRAINT lead_merges_master_lead_id_fkey FOREIGN KEY (master_lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_merges lead_merges_merged_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_merges
    ADD CONSTRAINT lead_merges_merged_lead_id_fkey FOREIGN KEY (merged_lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: meetings meetings_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reminders reminders_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;


--
-- Name: scheduled_messages scheduled_messages_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_messages
    ADD CONSTRAINT scheduled_messages_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: tool_execution_logs tool_execution_logs_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_execution_logs
    ADD CONSTRAINT tool_execution_logs_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: tool_execution_logs tool_execution_logs_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_execution_logs
    ADD CONSTRAINT tool_execution_logs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: tool_execution_logs Admins podem ver todos os logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todos os logs" ON public.tool_execution_logs FOR SELECT USING (true);


--
-- Name: notifications Authenticated users can insert their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert their own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: agent_branding Usuários autenticados podem atualizar agent_branding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar agent_branding" ON public.agent_branding FOR UPDATE USING (true);


--
-- Name: agent_prompts Usuários autenticados podem atualizar agent_prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar agent_prompts" ON public.agent_prompts FOR UPDATE TO authenticated USING (true);


--
-- Name: agent_resources Usuários autenticados podem atualizar agent_resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar agent_resources" ON public.agent_resources FOR UPDATE USING (true);


--
-- Name: conversations Usuários autenticados podem atualizar conversas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar conversas" ON public.conversations FOR UPDATE TO authenticated USING (true);


--
-- Name: experiments Usuários autenticados podem atualizar experiments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar experiments" ON public.experiments FOR UPDATE USING (true);


--
-- Name: knowledge_base Usuários autenticados podem atualizar knowledge_base; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar knowledge_base" ON public.knowledge_base FOR UPDATE TO authenticated USING (true);


--
-- Name: leads Usuários autenticados podem atualizar leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar leads" ON public.leads FOR UPDATE TO authenticated USING (true);


--
-- Name: oauth_tokens Usuários autenticados podem atualizar oauth_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar oauth_tokens" ON public.oauth_tokens FOR UPDATE USING (true);


--
-- Name: reminder_settings Usuários autenticados podem atualizar reminder_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar reminder_settings" ON public.reminder_settings FOR UPDATE TO authenticated USING (true);


--
-- Name: reminders Usuários autenticados podem atualizar reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar reminders" ON public.reminders FOR UPDATE TO authenticated USING (true);


--
-- Name: meetings Usuários autenticados podem atualizar reuniões; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar reuniões" ON public.meetings FOR UPDATE TO authenticated USING (true);


--
-- Name: scheduled_messages Usuários autenticados podem atualizar scheduled_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar scheduled_messages" ON public.scheduled_messages FOR UPDATE USING (true);


--
-- Name: slot_batches Usuários autenticados podem atualizar slot_batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar slot_batches" ON public.slot_batches FOR UPDATE USING (true);


--
-- Name: calendar_slots Usuários autenticados podem atualizar slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar slots" ON public.calendar_slots FOR UPDATE TO authenticated USING (true);


--
-- Name: system_config Usuários autenticados podem atualizar system_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar system_config" ON public.system_config FOR UPDATE TO authenticated USING (true);


--
-- Name: test_mode_config Usuários autenticados podem atualizar test_mode_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar test_mode_config" ON public.test_mode_config FOR UPDATE USING (true);


--
-- Name: test_numbers Usuários autenticados podem atualizar test_numbers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem atualizar test_numbers" ON public.test_numbers FOR UPDATE USING (true);


--
-- Name: agent_resources Usuários autenticados podem deletar agent_resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem deletar agent_resources" ON public.agent_resources FOR DELETE USING (true);


--
-- Name: leads Usuários autenticados podem deletar leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem deletar leads" ON public.leads FOR DELETE TO authenticated USING (true);


--
-- Name: slot_batches Usuários autenticados podem deletar slot_batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem deletar slot_batches" ON public.slot_batches FOR DELETE USING (true);


--
-- Name: calendar_slots Usuários autenticados podem deletar slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem deletar slots" ON public.calendar_slots FOR DELETE TO authenticated USING (true);


--
-- Name: test_numbers Usuários autenticados podem deletar test_numbers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem deletar test_numbers" ON public.test_numbers FOR DELETE USING (true);


--
-- Name: availability_exceptions Usuários autenticados podem gerenciar exceções; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem gerenciar exceções" ON public.availability_exceptions TO authenticated USING (true) WITH CHECK (true);


--
-- Name: availability_template_rules Usuários autenticados podem gerenciar regras; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem gerenciar regras" ON public.availability_template_rules TO authenticated USING (true) WITH CHECK (true);


--
-- Name: availability_templates Usuários autenticados podem gerenciar templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem gerenciar templates" ON public.availability_templates TO authenticated USING (true) WITH CHECK (true);


--
-- Name: activity_log Usuários autenticados podem inserir activity_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir activity_log" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: agent_prompts Usuários autenticados podem inserir agent_prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir agent_prompts" ON public.agent_prompts FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: agent_resources Usuários autenticados podem inserir agent_resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir agent_resources" ON public.agent_resources FOR INSERT WITH CHECK (true);


--
-- Name: blocked_numbers Usuários autenticados podem inserir blocked_numbers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir blocked_numbers" ON public.blocked_numbers FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: conversations Usuários autenticados podem inserir conversas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir conversas" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: experiment_assignments Usuários autenticados podem inserir experiment_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir experiment_assignments" ON public.experiment_assignments FOR INSERT WITH CHECK (true);


--
-- Name: experiment_results Usuários autenticados podem inserir experiment_results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir experiment_results" ON public.experiment_results FOR INSERT WITH CHECK (true);


--
-- Name: experiments Usuários autenticados podem inserir experiments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir experiments" ON public.experiments FOR INSERT WITH CHECK (true);


--
-- Name: knowledge_base Usuários autenticados podem inserir knowledge_base; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir knowledge_base" ON public.knowledge_base FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: lead_merges Usuários autenticados podem inserir lead_merges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir lead_merges" ON public.lead_merges FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: leads Usuários autenticados podem inserir leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: messages Usuários autenticados podem inserir mensagens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir mensagens" ON public.messages FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: oauth_tokens Usuários autenticados podem inserir oauth_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir oauth_tokens" ON public.oauth_tokens FOR INSERT WITH CHECK (true);


--
-- Name: reminder_settings Usuários autenticados podem inserir reminder_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir reminder_settings" ON public.reminder_settings FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: reminders Usuários autenticados podem inserir reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir reminders" ON public.reminders FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: meetings Usuários autenticados podem inserir reuniões; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir reuniões" ON public.meetings FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: scheduled_messages Usuários autenticados podem inserir scheduled_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir scheduled_messages" ON public.scheduled_messages FOR INSERT WITH CHECK (true);


--
-- Name: security_logs Usuários autenticados podem inserir security_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir security_logs" ON public.security_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: slot_batches Usuários autenticados podem inserir slot_batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir slot_batches" ON public.slot_batches FOR INSERT WITH CHECK (true);


--
-- Name: calendar_slots Usuários autenticados podem inserir slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir slots" ON public.calendar_slots FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: system_config Usuários autenticados podem inserir system_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir system_config" ON public.system_config FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: test_numbers Usuários autenticados podem inserir test_numbers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem inserir test_numbers" ON public.test_numbers FOR INSERT WITH CHECK (true);


--
-- Name: activity_log Usuários autenticados podem visualizar activity_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar activity_log" ON public.activity_log FOR SELECT TO authenticated USING (true);


--
-- Name: agent_branding Usuários autenticados podem visualizar agent_branding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar agent_branding" ON public.agent_branding FOR SELECT USING (true);


--
-- Name: agent_prompts Usuários autenticados podem visualizar agent_prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar agent_prompts" ON public.agent_prompts FOR SELECT TO authenticated USING (true);


--
-- Name: agent_resources Usuários autenticados podem visualizar agent_resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar agent_resources" ON public.agent_resources FOR SELECT USING (true);


--
-- Name: blocked_numbers Usuários autenticados podem visualizar blocked_numbers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar blocked_numbers" ON public.blocked_numbers FOR SELECT TO authenticated USING (true);


--
-- Name: conversations Usuários autenticados podem visualizar conversas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar conversas" ON public.conversations FOR SELECT TO authenticated USING (true);


--
-- Name: availability_exceptions Usuários autenticados podem visualizar exceções; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar exceções" ON public.availability_exceptions FOR SELECT TO authenticated USING (true);


--
-- Name: experiment_assignments Usuários autenticados podem visualizar experiment_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar experiment_assignments" ON public.experiment_assignments FOR SELECT USING (true);


--
-- Name: experiment_results Usuários autenticados podem visualizar experiment_results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar experiment_results" ON public.experiment_results FOR SELECT USING (true);


--
-- Name: experiments Usuários autenticados podem visualizar experiments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar experiments" ON public.experiments FOR SELECT USING (true);


--
-- Name: knowledge_base Usuários autenticados podem visualizar knowledge_base; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar knowledge_base" ON public.knowledge_base FOR SELECT TO authenticated USING (true);


--
-- Name: lead_merges Usuários autenticados podem visualizar lead_merges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar lead_merges" ON public.lead_merges FOR SELECT TO authenticated USING (true);


--
-- Name: leads Usuários autenticados podem visualizar leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar leads" ON public.leads FOR SELECT TO authenticated USING (true);


--
-- Name: messages Usuários autenticados podem visualizar mensagens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar mensagens" ON public.messages FOR SELECT TO authenticated USING (true);


--
-- Name: oauth_tokens Usuários autenticados podem visualizar oauth_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar oauth_tokens" ON public.oauth_tokens FOR SELECT USING (true);


--
-- Name: availability_template_rules Usuários autenticados podem visualizar regras; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar regras" ON public.availability_template_rules FOR SELECT TO authenticated USING (true);


--
-- Name: reminder_settings Usuários autenticados podem visualizar reminder_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar reminder_settings" ON public.reminder_settings FOR SELECT TO authenticated USING (true);


--
-- Name: reminders Usuários autenticados podem visualizar reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar reminders" ON public.reminders FOR SELECT TO authenticated USING (true);


--
-- Name: meetings Usuários autenticados podem visualizar reuniões; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar reuniões" ON public.meetings FOR SELECT TO authenticated USING (true);


--
-- Name: scheduled_messages Usuários autenticados podem visualizar scheduled_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar scheduled_messages" ON public.scheduled_messages FOR SELECT USING (true);


--
-- Name: security_logs Usuários autenticados podem visualizar security_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar security_logs" ON public.security_logs FOR SELECT TO authenticated USING (true);


--
-- Name: slot_batches Usuários autenticados podem visualizar slot_batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar slot_batches" ON public.slot_batches FOR SELECT USING (true);


--
-- Name: calendar_slots Usuários autenticados podem visualizar slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar slots" ON public.calendar_slots FOR SELECT TO authenticated USING (true);


--
-- Name: system_config Usuários autenticados podem visualizar system_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar system_config" ON public.system_config FOR SELECT TO authenticated USING (true);


--
-- Name: availability_templates Usuários autenticados podem visualizar templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar templates" ON public.availability_templates FOR SELECT TO authenticated USING (true);


--
-- Name: test_mode_config Usuários autenticados podem visualizar test_mode_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar test_mode_config" ON public.test_mode_config FOR SELECT USING (true);


--
-- Name: test_numbers Usuários autenticados podem visualizar test_numbers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários autenticados podem visualizar test_numbers" ON public.test_numbers FOR SELECT USING (true);


--
-- Name: activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_branding; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_branding ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_prompts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_prompts ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_resources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_resources ENABLE ROW LEVEL SECURITY;

--
-- Name: availability_exceptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.availability_exceptions ENABLE ROW LEVEL SECURITY;

--
-- Name: availability_template_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.availability_template_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: availability_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.availability_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_numbers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocked_numbers ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: experiment_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: experiment_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.experiment_results ENABLE ROW LEVEL SECURITY;

--
-- Name: experiments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_base; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_merges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_merges ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: meetings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: reminder_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: security_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: slot_batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.slot_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: system_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

--
-- Name: test_mode_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_mode_config ENABLE ROW LEVEL SECURITY;

--
-- Name: test_numbers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_numbers ENABLE ROW LEVEL SECURITY;

--
-- Name: tool_execution_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tool_execution_logs ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


