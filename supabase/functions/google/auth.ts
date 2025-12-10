import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-callback`;

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<any> {
  const tokenEndpoint = 'https://oauth2.googleapis.com/token';
  
  const body = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  return await response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<any> {
  const tokenEndpoint = 'https://oauth2.googleapis.com/token';
  
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh access token: ${error}`);
  }

  return await response.json();
}

export async function saveTokens(tokens: any): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Verificar se já existe um token do Google
  const { data: existing } = await supabase
    .from('oauth_tokens')
    .select('id')
    .eq('provider', 'google')
    .single();

  if (existing) {
    // Buscar o token completo para ter o refresh_token
    const { data: fullToken } = await supabase
      .from('oauth_tokens')
      .select('refresh_token')
      .eq('id', existing.id)
      .single();

    // Atualizar
    const { error } = await supabase
      .from('oauth_tokens')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || fullToken?.refresh_token,
        expires_at: expiresAt,
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    // Inserir
    const { error } = await supabase
      .from('oauth_tokens')
      .insert({
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expires_at: expiresAt,
        scope: tokens.scope,
      });

    if (error) throw error;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: token, error } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('provider', 'google')
    .single();

  if (error || !token) {
    console.error('No Google token found');
    return null;
  }

  const expiresAt = new Date(token.expires_at);
  const now = new Date();

  // Se o token expira em menos de 5 minutos, renovar
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Token expiring soon, refreshing...');
    
    if (!token.refresh_token) {
      console.error('No refresh token available');
      return null;
    }

    const newTokens = await refreshAccessToken(token.refresh_token);
    await saveTokens({
      ...newTokens,
      refresh_token: token.refresh_token, // Manter refresh token original
    });

    return newTokens.access_token;
  }

  return token.access_token;
}
