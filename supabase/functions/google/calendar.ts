import { getValidAccessToken } from './auth.ts';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

interface CreateEventParams {
  summary: string;
  startTime: string; // ISO format
  endTime: string; // ISO format
  attendees?: string[];
  description?: string;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  meetingLink?: string;
  hangoutLink?: string;
  status: string;
  attendees?: Array<{ email: string; displayName?: string }>;
}

async function makeCalendarRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  const accessToken = await getValidAccessToken();
  
  if (!accessToken) {
    throw new Error('No valid access token available. Please authenticate with Google.');
  }

  const url = `${CALENDAR_API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Google Calendar API error:', error);
    throw new Error(`Google Calendar API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

export async function createEvent(params: CreateEventParams): Promise<{
  eventId: string;
  meetingLink: string;
}> {
  console.log('Creating Google Calendar event:', params);

  const eventData = {
    summary: params.summary,
    description: params.description || '',
    start: {
      dateTime: params.startTime,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: params.endTime,
      timeZone: 'America/Sao_Paulo',
    },
    attendees: params.attendees?.map(email => ({ email })) || [],
    conferenceData: {
      createRequest: {
        requestId: `meet_${Date.now()}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 dia antes
        { method: 'popup', minutes: 60 }, // 1 hora antes
      ],
    },
  };

  const response = await makeCalendarRequest(
    '/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
    'POST',
    eventData
  );

  return {
    eventId: response.id,
    meetingLink: response.hangoutLink || response.conferenceData?.entryPoints?.[0]?.uri || '',
  };
}

export async function listEvents(
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  console.log('Listing Google Calendar events:', { timeMin, timeMax });

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    showDeleted: 'true', // ✅ NECESSÁRIO para pegar eventos cancelados
  });

  const response = await makeCalendarRequest(
    `/calendars/primary/events?${params.toString()}`,
    'GET'
  );

  // 🔍 DEBUG: Ver payload RAW da API do Google
  console.log('🔍 RAW GOOGLE API RESPONSE:', JSON.stringify(response, null, 2));

  return response.items?.map((event: any) => ({
    id: event.id,
    summary: event.summary,
    start: event.start,
    end: event.end,
    meetingLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
    hangoutLink: event.hangoutLink,
    status: event.status,
    attendees: event.attendees || [],
  })) || [];
}

export async function deleteEvent(eventId: string): Promise<void> {
  console.log('Deleting Google Calendar event:', eventId);

  await makeCalendarRequest(
    `/calendars/primary/events/${eventId}?sendUpdates=all`,
    'DELETE'
  );
}

export async function updateEvent(
  eventId: string,
  updates: Partial<CreateEventParams>
): Promise<void> {
  console.log('Updating Google Calendar event:', eventId, updates);

  const eventData: any = {};

  if (updates.summary) eventData.summary = updates.summary;
  if (updates.description) eventData.description = updates.description;
  if (updates.startTime) {
    eventData.start = {
      dateTime: updates.startTime,
      timeZone: 'America/Sao_Paulo',
    };
  }
  if (updates.endTime) {
    eventData.end = {
      dateTime: updates.endTime,
      timeZone: 'America/Sao_Paulo',
    };
  }
  if (updates.attendees) {
    eventData.attendees = updates.attendees.map(email => ({ email }));
  }

  await makeCalendarRequest(
    `/calendars/primary/events/${eventId}?sendUpdates=all`,
    'PATCH',
    eventData
  );
}
