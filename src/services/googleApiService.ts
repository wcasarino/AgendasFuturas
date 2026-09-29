import { AgendaItem, LecturaData } from '../types';
import { parseExcelDate } from '../utils/dateUtils';

const STORAGE_KEY_API_URL = 'wcasarino_google_api_url';
const STORAGE_KEY_LAST_SYNC = 'wcasarino_google_api_last_sync';

export interface GoogleApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  updatedAt?: string;
  fileName?: string;
  lectura?: {
    fecha: string;
    fechaOriginal?: string;
  };
  agendas?: Array<{
    id?: string;
    dpto: string;
    caps: string;
    fecha: string;
    turno: string;
    especialidad: string;
    profesional: string;
    turnos: number | string;
  }>;
}

/**
 * Gets the configured Google Apps Script Web App URL
 */
export function getGoogleApiUrl(): string {
  const stored = localStorage.getItem(STORAGE_KEY_API_URL);
  if (stored && stored.trim()) {
    return stored.trim();
  }
  const envUrl = (import.meta as unknown as { env?: { VITE_GOOGLE_API_URL?: string } })?.env?.VITE_GOOGLE_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }
  return '';
}

/**
 * Saves the Google API URL in localStorage
 */
export function setGoogleApiUrl(url: string): void {
  if (!url || !url.trim()) {
    localStorage.removeItem(STORAGE_KEY_API_URL);
  } else {
    localStorage.setItem(STORAGE_KEY_API_URL, url.trim());
  }
}

/**
 * Checks if the API is configured
 */
export function isGoogleApiConfigured(): boolean {
  return Boolean(getGoogleApiUrl());
}

/**
 * Gets the timestamp of the last successful sync
 */
export function getLastSyncTime(): string | null {
  return localStorage.getItem(STORAGE_KEY_LAST_SYNC);
}

/**
 * Sets the timestamp of the last sync
 */
export function setLastSyncTime(timestamp: string): void {
  localStorage.setItem(STORAGE_KEY_LAST_SYNC, timestamp);
}

/**
 * Uploads/Stores lectura and agendas in the user's free Google API (Apps Script)
 */
export async function saveDataToGoogleApi(data: {
  lectura: LecturaData;
  agendas: AgendaItem[];
  fileName?: string;
}): Promise<{ success: boolean; message: string; timestamp?: string }> {
  const apiUrl = getGoogleApiUrl();
  if (!apiUrl) {
    return {
      success: false,
      message: 'No se ha configurado la URL de tu API externa de Google.',
    };
  }

  const payload = {
    action: 'SAVE_AGENDAS',
    source: 'wcasarino_agendas_dashboard',
    user: 'wcasarino@gmail.com',
    timestamp: new Date().toISOString(),
    fileName: data.fileName || 'AGENDAS FUTURAS.xlsx',
    totalTurnos: data.agendas.reduce((acc, curr) => acc + curr.turnos, 0),
    totalRegistros: data.agendas.length,
    lectura: {
      fecha: data.lectura.fecha,
      fechaOriginal: data.lectura.fechaOriginal,
    },
    agendas: data.agendas.map(item => ({
      dpto: item.dpto,
      caps: item.caps,
      fecha: item.fecha,
      turno: item.turno,
      especialidad: item.especialidad,
      profesional: item.profesional,
      turnos: Number(item.turnos) || 0,
    })),
  };

  try {
    // Note: We send as text/plain to prevent CORS preflight issues with Google Apps Script
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const now = new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (!response.ok) {
      // In case of non-200 HTTP status
      return {
        success: false,
        message: `Error al comunicar con la API de Google (HTTP ${response.status}).`,
      };
    }

    const text = await response.text();
    try {
      const jsonRes = JSON.parse(text);
      if (jsonRes.success === false) {
        return {
          success: false,
          message: jsonRes.error || jsonRes.message || 'Error reportado por el script de Google.',
        };
      }
    } catch {
      // If Apps Script returns raw HTML or plain text confirmation
    }

    setLastSyncTime(now);
    return {
      success: true,
      message: `¡Datos sincronizados exitosamente en tu API de Google (${now})!`,
      timestamp: now,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `No se pudo conectar a la API de Google: ${errorMsg}`,
    };
  }
}

/**
 * Loads stored data from the user's free Google API (Apps Script)
 */
export async function loadDataFromGoogleApi(): Promise<{
  success: boolean;
  lectura?: LecturaData;
  agendas?: AgendaItem[];
  fileName?: string;
  updatedAt?: string;
  message?: string;
}> {
  const apiUrl = getGoogleApiUrl();
  if (!apiUrl) {
    return {
      success: false,
      message: 'No se ha configurado la URL de la API de Google.',
    };
  }

  try {
    // Add cache buster
    const urlWithParam = apiUrl.includes('?')
      ? `${apiUrl}&action=GET_AGENDAS&_t=${Date.now()}`
      : `${apiUrl}?action=GET_AGENDAS&_t=${Date.now()}`;

    const response = await fetch(urlWithParam, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Error HTTP ${response.status} al consultar la API de Google.`,
      };
    }

    const result = await response.json() as GoogleApiResponse;

    if (!result || !result.agendas || !Array.isArray(result.agendas)) {
      return {
        success: false,
        message: 'La API de Google respondió pero no contiene registros de agendas aún.',
      };
    }

    // Process lectura
    let lecturaData: LecturaData;
    if (result.lectura && result.lectura.fecha) {
      const parsed = parseExcelDate(result.lectura.fecha);
      lecturaData = {
        fecha: result.lectura.fecha,
        fechaOriginal: result.lectura.fechaOriginal || (parsed ? parsed.formatted : result.lectura.fecha),
        dateObj: parsed ? parsed.dateObj : new Date(),
      };
    } else {
      // Fallback
      const today = new Date();
      lecturaData = {
        fecha: today.toISOString().split('T')[0],
        fechaOriginal: today.toLocaleDateString('es-AR'),
        dateObj: today,
      };
    }

    // Process agendas
    const formattedAgendas: AgendaItem[] = result.agendas.map((item, idx) => {
      const parsedDate = parseExcelDate(item.fecha);
      const iso = parsedDate ? parsedDate.iso : String(item.fecha);
      const original = parsedDate ? parsedDate.formatted : String(item.fecha);

      return {
        id: item.id || `api-${idx}-${item.fecha}`,
        dpto: String(item.dpto || 'SIN DPTO').trim().toUpperCase(),
        caps: String(item.caps || 'SIN CAPS').trim(),
        fecha: iso,
        fechaOriginal: original,
        dateObj: parsedDate ? parsedDate.dateObj : new Date(iso),
        turno: String(item.turno || 'General').trim(),
        especialidad: String(item.especialidad || 'General').trim(),
        profesional: String(item.profesional || 'No asignado').trim(),
        turnos: Math.max(0, parseInt(String(item.turnos), 10) || 0),
      };
    });

    return {
      success: true,
      lectura: lecturaData,
      agendas: formattedAgendas,
      fileName: result.fileName || 'Google_API_Agendas.xlsx',
      updatedAt: result.updatedAt,
      message: `Se descargaron ${formattedAgendas.length} agendas desde tu API de Google.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Error al obtener datos de la API de Google: ${errorMsg}`,
    };
  }
}

/**
 * Tests connection to a Google API endpoint
 */
export async function testGoogleApiConnection(url: string): Promise<{ success: boolean; message: string }> {
  if (!url || !url.startsWith('http')) {
    return { success: false, message: 'La URL debe comenzar con http:// o https://' };
  }

  try {
    const testUrl = url.includes('?') ? `${url}&test=1&_t=${Date.now()}` : `${url}?test=1&_t=${Date.now()}`;
    const res = await fetch(testUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    if (res.ok) {
      return { success: true, message: '¡Conexión exitosa con tu API de Google!' };
    }
    return { success: false, message: `El servidor respondió con código HTTP ${res.status}.` };
  } catch (err: unknown) {
    return {
      success: false,
      message: `No se pudo conectar: ${err instanceof Error ? err.message : String(err)}. Verifica los permisos de la implementación de Google Apps Script.`,
    };
  }
}

/**
 * Google Apps Script standard source code for the user to copy and paste into script.google.com
 */
export const GOOGLE_APPS_SCRIPT_SAMPLE_CODE = `/**
 * API REST GRATUITA EN GOOGLE APPS SCRIPT (wcasarino@gmail.com)
 * Permite almacenar y consultar datos de Agendas Futuras de forma persistente y 100% gratuita.
 * 
 * Instrucciones:
 * 1. Ve a https://script.google.com con tu cuenta wcasarino@gmail.com
 * 2. Crea un "Nuevo proyecto" y reemplaza todo el contenido con este código.
 * 3. Haz clic en "Implementar" -> "Nueva implementación".
 * 4. Tipo: "Aplicación web".
 * 5. Ejecutar como: "Yo (wcasarino@gmail.com)".
 * 6. Quién tiene acceso: "Cualquier usuario" (Anyone).
 * 7. Copia la URL de la aplicación web generada (termina en /exec) y pégala en el panel de la Web.
 */

function doGet(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var dataJson = props.getProperty('WCASARINO_AGENDAS_DATA');
    
    if (!dataJson) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'API lista. No hay datos almacenados aún.',
        agendas: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(dataJson)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var rawContent = e.postData.contents;
    var parsed = JSON.parse(rawContent);
    
    // Guardar en almacenamiento seguro y gratuito de Apps Script
    PropertiesService.getScriptProperties().setProperty('WCASARINO_AGENDAS_DATA', rawContent);
    
    // Registrar última actualización
    PropertiesService.getScriptProperties().setProperty('LAST_SYNC_AT', new Date().toISOString());

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Datos de agendas almacenados exitosamente en Google de wcasarino.',
      totalRegistros: parsed.agendas ? parsed.agendas.length : 0,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
