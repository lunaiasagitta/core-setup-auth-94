const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') || '';
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') || '';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE_NAME') || '';

interface EvolutionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

async function makeEvolutionRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<EvolutionResponse> {
  try {
    const url = `${EVOLUTION_API_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      console.error('Evolution API error:', data);
      return { success: false, error: data.message || 'Evolution API error' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Evolution API request failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendMessage(phone: string, text: string): Promise<EvolutionResponse> {
  console.log(`Sending message to ${phone}:`, text);
  
  return await makeEvolutionRequest(
    `/message/sendText/${EVOLUTION_INSTANCE}`,
    'POST',
    {
      number: phone,
      text: text,
    }
  );
}

export async function sendMedia(
  phone: string,
  mediaUrl: string,
  caption?: string,
  mediatype: 'document' | 'image' | 'audio' = 'document',
  fileName?: string
): Promise<EvolutionResponse> {
  console.log(`Sending media to ${phone}:`, mediaUrl);
  
  // Determinar mimetype baseado no mediatype e URL
  let mimetype = 'application/octet-stream';
  let finalFileName = fileName;
  
  if (mediatype === 'document') {
    if (mediaUrl.toLowerCase().includes('.pdf')) {
      mimetype = 'application/pdf';
      finalFileName = finalFileName || 'documento.pdf';
    } else if (mediaUrl.toLowerCase().includes('.doc')) {
      mimetype = 'application/msword';
      finalFileName = finalFileName || 'documento.doc';
    } else if (mediaUrl.toLowerCase().includes('.docx')) {
      mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      finalFileName = finalFileName || 'documento.docx';
    }
  } else if (mediatype === 'image') {
    if (mediaUrl.toLowerCase().includes('.png')) {
      mimetype = 'image/png';
      finalFileName = finalFileName || 'imagem.png';
    } else if (mediaUrl.toLowerCase().includes('.jpg') || mediaUrl.toLowerCase().includes('.jpeg')) {
      mimetype = 'image/jpeg';
      finalFileName = finalFileName || 'imagem.jpg';
    }
  } else if (mediatype === 'audio') {
    mimetype = 'audio/mpeg';
    finalFileName = finalFileName || 'audio.mp3';
  }
  
  console.log(`[Evolution] Sending ${mediatype} with mimetype: ${mimetype}, fileName: ${finalFileName}`);
  
  return await makeEvolutionRequest(
    `/message/sendMedia/${EVOLUTION_INSTANCE}`,
    'POST',
    {
      number: phone,
      mediatype,
      mimetype,
      media: mediaUrl,
      caption: caption || '',
      fileName: finalFileName,
    }
  );
}

export async function getInstanceStatus(): Promise<EvolutionResponse> {
  console.log('Getting instance status...');
  
  return await makeEvolutionRequest(
    `/instance/connectionState/${EVOLUTION_INSTANCE}`,
    'GET'
  );
}

export async function getQRCode(): Promise<EvolutionResponse> {
  console.log('Getting QR Code...');
  
  return await makeEvolutionRequest(
    `/instance/qr/${EVOLUTION_INSTANCE}`,
    'GET'
  );
}
