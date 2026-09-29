import * as XLSX from 'xlsx';
import { AgendaItem, LecturaData } from '../types';
import { parseExcelDate, formatDateDDMMAAAA } from './dateUtils';

export interface ParseResult {
  success: boolean;
  error?: string;
  lectura?: LecturaData;
  agendas?: AgendaItem[];
  warnings?: string[];
  totalTurnos?: number;
  fileName?: string;
  sheetLecturaName?: string;
  sheetAgendasName?: string;
  lecturaRows?: Array<{ fila: number; fecha: string; fechaOriginal: string; valor: string }>;
}

/**
 * Parses the uploaded AGENDAS FUTURAS.xlsx file
 */
export async function parseAgendasExcel(file: File): Promise<ParseResult> {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { cellDates: true, cellNF: false, cellText: false });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, error: 'El archivo Excel no contiene hojas de cálculo válidas.' };
    }

    const warnings: string[] = [];

    // Find "Lectura" sheet (case insensitive or contains "lectura")
    const sheetLecturaName = workbook.SheetNames.find(
      name => name.trim().toLowerCase() === 'lectura' || name.trim().toLowerCase().includes('lectura')
    ) || workbook.SheetNames[0];

    // Find "Agendas" sheet (case insensitive or contains "agenda")
    const sheetAgendasName = workbook.SheetNames.find(
      name => name.trim().toLowerCase() === 'agendas' || name.trim().toLowerCase().includes('agenda')
    ) || (workbook.SheetNames.length > 1 ? workbook.SheetNames[1] : null);

    if (!sheetAgendasName) {
      return {
        success: false,
        error: `No se encontró la hoja "Agendas". El archivo debe contener dos hojas: "Lectura" y "Agendas". Hojas detectadas: ${workbook.SheetNames.join(', ')}`,
      };
    }

    // 1. Process "Lectura" sheet
    const lecturaSheet = workbook.Sheets[sheetLecturaName];
    // sheet_to_json with header: 1 to get raw 2D array [row][col]
    const lecturaRows = XLSX.utils.sheet_to_json<unknown[]>(lecturaSheet, { header: 1, raw: true });

    let detectedLecturaDate: { iso: string; formatted: string; dateObj: Date } | null = null;
    const lecturaDocsList: Array<{ fila: number; fecha: string; fechaOriginal: string; valor: string }> = [];

    // Scan rows of Lectura sheet
    for (let r = 0; r < lecturaRows.length; r++) {
      const row = lecturaRows[r];
      if (Array.isArray(row) && row.length > 0) {
        const cellVal = row[0];
        // Skip header if it says "Fecha"
        if (typeof cellVal === 'string' && cellVal.toLowerCase().includes('fecha')) {
          continue;
        }
        const parsed = parseExcelDate(cellVal);
        if (parsed) {
          if (!detectedLecturaDate) {
            detectedLecturaDate = parsed;
          }
          lecturaDocsList.push({
            fila: r + 1,
            fecha: parsed.iso,
            fechaOriginal: parsed.formatted,
            valor: String(cellVal || parsed.formatted),
          });
        } else if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '') {
          lecturaDocsList.push({
            fila: r + 1,
            fecha: detectedLecturaDate ? detectedLecturaDate.iso : new Date().toISOString().split('T')[0],
            fechaOriginal: String(cellVal).trim(),
            valor: String(cellVal).trim(),
          });
        }
      }
    }

    if (!detectedLecturaDate) {
      // Fallback: search anywhere in the Lectura sheet for a valid date
      for (let r = 0; r < lecturaRows.length; r++) {
        const row = lecturaRows[r];
        if (Array.isArray(row)) {
          for (const cell of row) {
            const parsed = parseExcelDate(cell);
            if (parsed) {
              detectedLecturaDate = parsed;
              lecturaDocsList.push({
                fila: r + 1,
                fecha: parsed.iso,
                fechaOriginal: parsed.formatted,
                valor: String(cell || parsed.formatted),
              });
              break;
            }
          }
        }
        if (detectedLecturaDate) break;
      }
    }

    if (!detectedLecturaDate) {
      // Fallback to today if none found
      const today = new Date();
      warnings.push('No se pudo detectar una fecha válida en la columna A de la hoja "Lectura". Se usó la fecha actual.');
      const parsedToday = parseExcelDate(formatDateDDMMAAAA(today))!;
      detectedLecturaDate = parsedToday;
      lecturaDocsList.push({
        fila: 1,
        fecha: parsedToday.iso,
        fechaOriginal: parsedToday.formatted,
        valor: parsedToday.formatted,
      });
    }

    const lecturaData: LecturaData = {
      fecha: detectedLecturaDate.iso,
      fechaOriginal: detectedLecturaDate.formatted,
      dateObj: detectedLecturaDate.dateObj,
    };

    // 2. Process "Agendas" sheet
    const agendasSheet = workbook.Sheets[sheetAgendasName];
    const agendasRows = XLSX.utils.sheet_to_json<unknown[]>(agendasSheet, { header: 1, raw: true });

    if (!agendasRows || agendasRows.length < 2) {
      return {
        success: false,
        error: `La hoja "Agendas" no contiene filas de datos suficientes.`,
      };
    }

    // Determine header row (usually row 0 or 1)
    let headerRowIdx = 0;
    let colIndices = {
      dpto: 0,
      caps: 1,
      fecha: 2,
      turno: 3,
      especialidad: 4,
      profesional: 5,
      turnos: 6,
    };

    // Check first 5 rows to see if headers exist
    for (let r = 0; r < Math.min(5, agendasRows.length); r++) {
      const row = agendasRows[r];
      if (Array.isArray(row)) {
        const strRow = row.map(c => String(c || '').toLowerCase().trim());
        const hasDpto = strRow.some(s => s.includes('dpto') || s.includes('departamento'));
        const hasCaps = strRow.some(s => s.includes('caps') || s.includes('centro'));
        const hasFecha = strRow.some(s => s.includes('fecha'));
        const hasTurnos = strRow.some(s => s.includes('turno'));

        if (hasDpto || hasCaps || hasFecha || hasTurnos) {
          headerRowIdx = r;
          // Map column indices dynamically if headers present
          strRow.forEach((colName, idx) => {
            if (colName.includes('dpto') || colName.includes('departamento')) colIndices.dpto = idx;
            else if (colName.includes('caps') || colName.includes('centro') || colName.includes('efector')) colIndices.caps = idx;
            else if (colName.includes('fecha')) colIndices.fecha = idx;
            else if (colName === 'turno' || (colName.includes('turno') && !colName.includes('turnos'))) colIndices.turno = idx;
            else if (colName.includes('especialidad') || colName.includes('servicio')) colIndices.especialidad = idx;
            else if (colName.includes('profesional') || colName.includes('médico') || colName.includes('medico') || colName.includes('doctor')) colIndices.profesional = idx;
            else if (colName.includes('turnos') || colName.includes('cantidad') || colName.includes('cupos')) colIndices.turnos = idx;
          });
          break;
        }
      }
    }

    const agendas: AgendaItem[] = [];
    let idCounter = 1;
    let skippedRows = 0;

    for (let r = headerRowIdx + 1; r < agendasRows.length; r++) {
      const row = agendasRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const rawDpto = row[colIndices.dpto];
      const rawCaps = row[colIndices.caps];
      const rawFecha = row[colIndices.fecha];
      const rawTurno = row[colIndices.turno];
      const rawEspecialidad = row[colIndices.especialidad];
      const rawProfesional = row[colIndices.profesional];
      const rawTurnos = row[colIndices.turnos];

      // Parse date
      const parsedDate = parseExcelDate(rawFecha);
      if (!parsedDate) {
        skippedRows++;
        continue;
      }

      // Parse turnos number
      let turnosNum = 0;
      if (typeof rawTurnos === 'number') {
        turnosNum = Math.max(0, Math.round(rawTurnos));
      } else if (rawTurnos !== undefined && rawTurnos !== null) {
        const cleaned = String(rawTurnos).replace(/[^0-9]/g, '');
        turnosNum = parseInt(cleaned, 10) || 0;
      }

      agendas.push({
        id: `row-${r}-${idCounter++}`,
        dpto: String(rawDpto || 'Sin Departamento').trim(),
        caps: String(rawCaps || 'Sin CAPS').trim(),
        fecha: parsedDate.iso,
        fechaOriginal: parsedDate.formatted,
        dateObj: parsedDate.dateObj,
        turno: String(rawTurno || 'General').trim(),
        especialidad: String(rawEspecialidad || 'General').trim(),
        profesional: String(rawProfesional || 'Sin Profesional').trim(),
        turnos: turnosNum,
      });
    }

    if (agendas.length === 0) {
      return {
        success: false,
        error: 'No se pudieron extraer registros válidos de la hoja "Agendas". Verifique que las columnas A a G contengan los datos en el orden esperado.',
      };
    }

    if (skippedRows > 0) {
      warnings.push(`Se omitieron ${skippedRows} filas con fechas inválidas o vacías.`);
    }

    const totalTurnos = agendas.reduce((acc, curr) => acc + curr.turnos, 0);

    return {
      success: true,
      lectura: lecturaData,
      agendas,
      warnings,
      totalTurnos,
      fileName: file.name,
      sheetLecturaName: sheetLecturaName || 'Lectura',
      sheetAgendasName: sheetAgendasName || 'Agendas',
      lecturaRows: lecturaDocsList,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido al procesar el archivo Excel';
    return {
      success: false,
      error: `Error al leer el archivo Excel: ${errorMsg}`,
    };
  }
}

/**
 * Creates and downloads a complete sample Excel file "AGENDAS FUTURAS.xlsx"
 * with both sheets "Lectura" and "Agendas" pre-populated.
 */
export function downloadSampleExcel(lectura: LecturaData, agendas: AgendaItem[], filename = 'AGENDAS FUTURAS.xlsx') {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Lectura
  const lecturaData = [
    ['Fecha'],
    [lectura.fechaOriginal],
  ];
  const wsLectura = XLSX.utils.aoa_to_sheet(lecturaData);
  // Column width
  wsLectura['!cols'] = [{ wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsLectura, 'Lectura');

  // Sheet 2: Agendas
  const agendasHeader = ['DPTO', 'CAPS', 'Fecha', 'Turno', 'Especialidad', 'Profesional', 'Turnos'];
  const agendasData = agendas.map(item => [
    item.dpto,
    item.caps,
    item.fechaOriginal,
    item.turno,
    item.especialidad,
    item.profesional,
    item.turnos,
  ]);
  const wsAgendas = XLSX.utils.aoa_to_sheet([agendasHeader, ...agendasData]);
  wsAgendas['!cols'] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 14 },
    { wch: 14 },
    { wch: 26 },
    { wch: 28 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsAgendas, 'Agendas');

  XLSX.writeFile(wb, filename);
}
