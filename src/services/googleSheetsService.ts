import * as XLSX from 'xlsx';
import { AgendaItem, LecturaData } from '../types';
import { parseExcelDate, formatDateDDMMAAAA } from '../utils/dateUtils';
import { saveDatasetToLocalCache } from '../utils/localCache';

export const DEFAULT_SPREADSHEET_ID = '1iNormbynqtutnzwcDTWiQ7Kd0GjG5QfbyWzCZTJOw08';
export const DEFAULT_SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1iNormbynqtutnzwcDTWiQ7Kd0GjG5QfbyWzCZTJOw08/edit?usp=drive_link';

const SPREADSHEET_URL_KEY = 'agendas_google_sheet_url';
const LAST_FETCH_TIMESTAMP_KEY = 'agendas_google_sheet_last_fetch';

/**
 * Extracts Google Spreadsheet ID from a standard URL or returns the ID as is
 */
export function extractSpreadsheetId(urlOrId: string): string {
  if (!urlOrId) return DEFAULT_SPREADSHEET_ID;
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]{15,})/);
  if (match && match[1]) {
    return match[1];
  }
  // If it's already an ID
  if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) {
    return trimmed;
  }
  return DEFAULT_SPREADSHEET_ID;
}

export function getSavedSpreadsheetUrl(): string {
  try {
    const saved = localStorage.getItem(SPREADSHEET_URL_KEY);
    return saved && saved.trim() ? saved.trim() : DEFAULT_SPREADSHEET_URL;
  } catch {
    return DEFAULT_SPREADSHEET_URL;
  }
}

export function saveSpreadsheetUrl(url: string): void {
  try {
    localStorage.setItem(SPREADSHEET_URL_KEY, url.trim());
  } catch {
    // Ignore storage issues
  }
}

export function getLastGoogleSheetFetchTime(): string | null {
  try {
    return localStorage.getItem(LAST_FETCH_TIMESTAMP_KEY);
  } catch {
    return null;
  }
}

export function setLastGoogleSheetFetchTime(timeStr: string): void {
  try {
    localStorage.setItem(LAST_FETCH_TIMESTAMP_KEY, timeStr);
  } catch {
    // Ignore storage issues
  }
}

export interface GoogleSheetsFetchResult {
  success: boolean;
  lectura?: LecturaData;
  agendas?: AgendaItem[];
  totalTurnos?: number;
  totalAgendas?: number;
  spreadsheetId: string;
  spreadsheetUrl: string;
  fileName: string;
  error?: string;
  fetchedAt?: string;
}

/**
 * Fetches and parses the Google Sheet live data for 'Lectura' and 'Agendas' tabs.
 */
export async function fetchGoogleSheetData(customUrlOrId?: string): Promise<GoogleSheetsFetchResult> {
  const urlToUse = customUrlOrId || getSavedSpreadsheetUrl();
  const spreadsheetId = extractSpreadsheetId(urlToUse);
  const canonicalUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const baseUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
  const lecturaUrl = `${baseUrl}&sheet=Lectura`;
  const agendasUrl = `${baseUrl}&sheet=Agendas`;

  try {
    // Fetch both sheets in parallel with cache-busting timestamp
    const timestamp = Date.now();
    const [lecturaRes, agendasRes] = await Promise.all([
      fetch(`${lecturaUrl}&_ts=${timestamp}`, { cache: 'no-cache' }),
      fetch(`${agendasUrl}&_ts=${timestamp}`, { cache: 'no-cache' }),
    ]);

    if (!lecturaRes.ok) {
      throw new Error(
        `No se pudo acceder a la hoja "Lectura" (código HTTP ${lecturaRes.status}). Verifica los permisos de acceso del Google Sheet.`
      );
    }

    if (!agendasRes.ok) {
      throw new Error(
        `No se pudo acceder a la hoja "Agendas" (código HTTP ${agendasRes.status}). Verifica los permisos de acceso del Google Sheet.`
      );
    }

    const [lecturaCsv, agendasCsv] = await Promise.all([lecturaRes.text(), agendasRes.text()]);

    if (!agendasCsv || agendasCsv.trim().length === 0) {
      throw new Error('La hoja "Agendas" del Google Sheet está vacía.');
    }

    // Parse Lectura sheet with raw: true so SheetJS preserves exact "dd/mm/aaaa" text
    const lecturaWb = XLSX.read(lecturaCsv, { type: 'string', raw: true });
    const lecturaSheet = lecturaWb.Sheets[lecturaWb.SheetNames[0]];
    const lecturaRawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(lecturaSheet, { raw: true });

    let lecturaDateObj: Date = new Date();
    let lecturaIso = '';
    let lecturaFormatted = '';

    // Check first row or values in Lectura (format "dd/mm/aaaa" or "dd/mm/aa")
    if (lecturaRawRows.length > 0) {
      const firstRow = lecturaRawRows[0];
      const val = firstRow['Fecha'] || firstRow['FECHA'] || firstRow['fecha'] || Object.values(firstRow)[0];
      const parsed = parseExcelDate(val);
      if (parsed) {
        lecturaDateObj = parsed.dateObj;
        lecturaIso = parsed.iso;
        lecturaFormatted = parsed.formatted;
      }
    }

    // Fallback if not detected from rows: try raw 2D array
    if (!lecturaIso) {
      const lecturaArray = XLSX.utils.sheet_to_json<unknown[]>(lecturaSheet, { header: 1, raw: true });
      for (const row of lecturaArray) {
        if (Array.isArray(row)) {
          for (const cell of row) {
            const parsed = parseExcelDate(cell);
            if (parsed) {
              lecturaDateObj = parsed.dateObj;
              lecturaIso = parsed.iso;
              lecturaFormatted = parsed.formatted;
              break;
            }
          }
        }
        if (lecturaIso) break;
      }
    }

    // Default to today if still empty
    if (!lecturaIso) {
      const now = new Date();
      lecturaDateObj = now;
      lecturaFormatted = formatDateDDMMAAAA(now);
      lecturaIso = now.toISOString().split('T')[0];
    }

    const lectura: LecturaData = {
      fecha: lecturaIso,
      fechaOriginal: lecturaFormatted,
      dateObj: lecturaDateObj,
    };

    // Parse Agendas sheet with raw: true so column C (Fecha) remains "dd/mm/aaaa"
    const agendasWb = XLSX.read(agendasCsv, { type: 'string', raw: true });
    const agendasSheet = agendasWb.Sheets[agendasWb.SheetNames[0]];
    const agendasRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(agendasSheet, { raw: true });

    const parsedAgendas: AgendaItem[] = [];
    let totalTurnosCount = 0;

    const parseNumber = (val: unknown): number => {
      if (typeof val === 'number') return isNaN(val) ? 0 : Math.max(0, Math.round(val));
      if (val === null || val === undefined) return 0;
      const cleaned = String(val).replace(/[^0-9]/g, '');
      return parseInt(cleaned, 10) || 0;
    };

    for (let i = 0; i < agendasRows.length; i++) {
      const row = agendasRows[i];

      // Col A: DPTO
      const dptoRaw = row['DPTO'] || row['dpto'] || row['DEPARTAMENTO'] || row['Departamento'] || '';
      const dpto = String(dptoRaw).trim().toUpperCase();

      // Col B: CAPS
      const capsRaw = row['CAPS'] || row['caps'] || row['Centro'] || '';
      const caps = String(capsRaw).trim().toUpperCase();

      // Skip empty separator rows
      if (!dpto && !caps) continue;

      // Col C: Fecha
      const fechaRaw = row['Fecha'] || row['FECHA'] || row['fecha'] || '';
      const dateParsed = parseExcelDate(fechaRaw);
      if (!dateParsed) continue;

      // Col D: Especialidad
      const espRaw = row['Especialidad'] || row['ESPECIALIDAD'] || row['especialidad'] || '';
      const especialidad = String(espRaw).trim();

      // Col E: Profesional
      const profRaw = row['Profesional'] || row['PROFESIONAL'] || row['profesional'] || '';
      const profesional = String(profRaw).trim();

      // Col F: Estado (Asignado, Libre, etc.)
      const estadoRaw = row['Estado'] || row['ESTADO'] || row['estado'] || '';
      const estado = String(estadoRaw).trim();

      // Col G: Todos (número entero)
      const todos = parseNumber(row['Todos'] ?? row['todos'] ?? row['TODOS']);

      // Col H: Sólo H. (número entero)
      const soloH = parseNumber(
        row['Sólo H.'] ?? row['Solo H.'] ?? row['Sólo H'] ?? row['Solo H'] ?? row['SÓLO H.'] ?? row['SOLO H.']
      );

      // Col I: Bot (número entero)
      const bot = parseNumber(row['Bot'] ?? row['BOT'] ?? row['bot']);

      // Col J: Call (número entero)
      const call = parseNumber(row['Call'] ?? row['CALL'] ?? row['call']);

      // Fallback for legacy files that only had a single "Turnos" column
      let legacyTurnos = 0;
      if (todos === 0 && soloH === 0 && bot === 0 && call === 0 && (row['Turnos'] || row['turnos'])) {
        legacyTurnos = parseNumber(row['Turnos'] || row['turnos']);
      }

      const activeTodos = todos || legacyTurnos;
      // Default initial turnos representation
      const initialTurnos = activeTodos || soloH || bot || call || 0;
      totalTurnosCount += (todos + soloH + bot + call) || initialTurnos;

      parsedAgendas.push({
        id: `gs-${i + 1}-${caps}-${dateParsed.iso}-${profesional.substring(0, 10)}`,
        dpto: dpto || 'SIN ESPECIFICAR',
        caps: caps || 'GENERAL',
        fecha: dateParsed.iso,
        fechaOriginal: dateParsed.formatted,
        dateObj: dateParsed.dateObj,
        especialidad: especialidad || 'Medicina General',
        profesional: profesional || 'SIN PROFESIONAL ASIGNADO',
        estado: estado || 'General',
        todos: activeTodos,
        soloH,
        bot,
        call,
        turnos: initialTurnos,
      });
    }

    const fetchedTime = new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLastGoogleSheetFetchTime(fetchedTime);

    // Also persist into local cache for instantaneous load on refresh
    saveDatasetToLocalCache({
      lectura,
      agendas: parsedAgendas,
      version: `gs_${spreadsheetId}_${Date.now()}`,
      fileName: `Google Sheet (${canonicalUrl})`,
      updatedAt: new Date().toISOString(),
    }).catch(() => {
      // Local cache persistence failure is non-blocking
    });

    return {
      success: true,
      lectura,
      agendas: parsedAgendas,
      totalTurnos: totalTurnosCount,
      totalAgendas: parsedAgendas.length,
      spreadsheetId,
      spreadsheetUrl: canonicalUrl,
      fileName: 'Google Sheets (link.txt)',
      fetchedAt: fetchedTime,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error fetching Google Sheets data:', err);
    return {
      success: false,
      error: errorMsg,
      spreadsheetId,
      spreadsheetUrl: canonicalUrl,
      fileName: 'Google Sheets (link.txt)',
    };
  }
}
