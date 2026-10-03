import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AgendaItem, FilterState, LecturaData } from '../types';
import { formatFriendlyDate, SPANISH_DAYS_SHORT } from './dateUtils';

interface ExportOptions {
  lectura: LecturaData;
  agendas: AgendaItem[];
  filters: FilterState;
  selectedDate?: string | null;
  reportType?: 'filtered' | 'selectedDay' | 'dailySummary';
}

export function exportToExcel(options: ExportOptions, filename = 'Reporte_Agendas_Futuras.xlsx') {
  const { lectura, agendas, filters, selectedDate } = options;
  const wb = XLSX.utils.book_new();

  // 1. Resumen Diario Sheet
  const dayAggregates = new Map<string, {
    fecha: string;
    totalTurnos: number;
    todos: number;
    soloH: number;
    bot: number;
    call: number;
    capsCount: Set<string>;
    prosCount: Set<string>;
  }>();

  agendas.forEach(item => {
    let agg = dayAggregates.get(item.fecha);
    if (!agg) {
      agg = {
        fecha: item.fechaOriginal || item.fecha,
        totalTurnos: 0,
        todos: 0,
        soloH: 0,
        bot: 0,
        call: 0,
        capsCount: new Set<string>(),
        prosCount: new Set<string>(),
      };
      dayAggregates.set(item.fecha, agg);
    }
    agg.totalTurnos += item.turnos;
    agg.todos += item.todos || 0;
    agg.soloH += item.soloH || 0;
    agg.bot += item.bot || 0;
    agg.call += item.call || 0;
    agg.capsCount.add(item.caps);
    agg.prosCount.add(item.profesional);
  });

  const sortedDates = Array.from(dayAggregates.keys()).sort();
  const resumenRows = [
    ['Fecha', 'Día', 'Turnos Canal Activo', 'Todos (Col. G)', 'Sólo H. (Col. H)', 'Bot (Col. I)', 'Call (Col. J)', 'CAPS Activos', 'Profesionales'],
    ...sortedDates.map(isoDate => {
      const agg = dayAggregates.get(isoDate)!;
      const d = new Date(isoDate + 'T12:00:00');
      let dayName = '';
      if (!isNaN(d.getTime())) {
        const dayIdx = (d.getDay() + 6) % 7; // Monday = 0
        dayName = SPANISH_DAYS_SHORT[dayIdx] || '';
      }
      return [
        agg.fecha,
        dayName,
        agg.totalTurnos,
        agg.todos,
        agg.soloH,
        agg.bot,
        agg.call,
        agg.capsCount.size,
        agg.prosCount.size,
      ];
    }),
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen['!cols'] = [
    { wch: 14 },
    { wch: 8 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Diario');

  // 2. Detalle de Agendas Sheet
  const agendasHeader = [
    'DPTO',
    'CAPS',
    'Fecha',
    'Especialidad',
    'Profesional',
    'Estado',
    'Todos (G)',
    'Sólo H. (H)',
    'Bot (I)',
    'Call (J)',
    `Turnos (${filters.canal || 'Todos'})`,
  ];
  const agendasData = agendas.map(item => [
    item.dpto,
    item.caps,
    item.fechaOriginal || item.fecha,
    item.especialidad,
    item.profesional,
    item.estado || 'Libre',
    item.todos ?? 0,
    item.soloH ?? 0,
    item.bot ?? 0,
    item.call ?? 0,
    item.turnos,
  ]);
  const wsAgendas = XLSX.utils.aoa_to_sheet([agendasHeader, ...agendasData]);
  wsAgendas['!cols'] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 14 },
    { wch: 26 },
    { wch: 28 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsAgendas, 'Detalle de Agendas');

  // 3. Metadata & Filtros Sheet
  const metaRows = [
    ['REPORTE DE AGENDAS A 30 DÍAS', ''],
    ['Fecha de Generación', new Date().toLocaleString('es-AR')],
    ['Fecha de Lectura (Corte)', lectura.fechaOriginal],
    ['', ''],
    ['FILTROS APLICADOS', ''],
    ['Departamento (DPTO)', filters.dpto || 'Todos'],
    ['CAPS / Centro de Salud', filters.caps || 'Todos'],
    ['Canal seleccionado', filters.canal || 'Todos'],
    ['Especialidad', filters.especialidad || 'Todas'],
    ['Profesional', filters.profesional || 'Todos'],
    ['Día seleccionado', selectedDate ? formatFriendlyDate(selectedDate) : 'Todos los días'],
    ['', ''],
    ['MÉTRICAS DEL REPORTE', ''],
    ['Total Turnos (Canal Activo)', agendas.reduce((acc, curr) => acc + curr.turnos, 0)],
    ['Registros Detallados', agendas.length],
    ['Días con Agenda', sortedDates.length],
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(metaRows);
  wsMeta['!cols'] = [{ wch: 26 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Info y Filtros');

  XLSX.writeFile(wb, filename);
}

export function exportToPDF(options: ExportOptions, filename = 'Reporte_Agendas_Futuras.pdf') {
  const { lectura, agendas, filters, selectedDate } = options;

  // Portrait A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const totalTurnos = agendas.reduce((acc, c) => acc + c.turnos, 0);
  const totalRegistros = agendas.length;
  const uniquePros = new Set(agendas.map(a => a.profesional)).size;
  const uniqueCaps = new Set(agendas.map(a => a.caps)).size;
  const uniqueDays = new Set(agendas.map(a => a.fecha)).size;

  // Header band
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE AGENDAS A 30 DÍAS', 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Fecha de Lectura: ${lectura.fechaOriginal}  |  Emisión: ${new Date().toLocaleDateString('es-AR')}`, 14, 21);

  // Sub-bar with applied filters
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(14, 32, 182, 22, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(14, 32, 182, 22, 'S');

  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('FILTROS APLICADOS:', 18, 38);

  doc.setFont('helvetica', 'normal');
  const fTextCol1 = [
    `DPTO: ${filters.dpto || 'Todos'}`,
    `CAPS: ${filters.caps || 'Todos'}`,
    `CANAL: ${filters.canal || 'Todos'}`,
  ].join('   |   ');

  const fTextCol2 = [
    `Especialidad: ${filters.especialidad || 'Todas'}`,
    `Profesional: ${filters.profesional || 'Todos'}`,
    selectedDate ? `Día: ${selectedDate}` : 'Días: Período completo',
  ].join('   |   ');

  doc.text(fTextCol1, 18, 44);
  doc.text(fTextCol2, 18, 50);

  // Summary Metrics Box
  const metricY = 58;
  const boxWidth = 43;
  const boxHeight = 16;
  const metrics = [
    { label: 'TOTAL TURNOS', val: totalTurnos.toLocaleString('es-AR') },
    { label: 'DÍAS AGENDADOS', val: String(uniqueDays) },
    { label: 'CAPS ACTIVOS', val: String(uniqueCaps) },
    { label: 'PROFESIONALES', val: String(uniquePros) },
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (boxWidth + 3.3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, metricY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + 4, metricY + 5);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(m.val, x + 4, metricY + 12);
  });

  let startY = 82;

  // Section 2: Detailed Items Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  const detailTitle = selectedDate
    ? `Detalle de Agendas del Día ${formatFriendlyDate(selectedDate)} (Canal: ${filters.canal || 'Todos'})`
    : `Detalle de Agendas (Canal: ${filters.canal || 'Todos'} - Muestra hasta 150 registros)`;
  doc.text(detailTitle, 14, startY - 2);

  const detailRows = agendas.slice(0, 150).map(item => [
    item.dpto,
    item.caps,
    item.fechaOriginal || item.fecha,
    item.especialidad,
    item.profesional,
    item.estado || 'Libre',
    String(item.todos ?? 0),
    String(item.soloH ?? 0),
    String(item.bot ?? 0),
    String(item.call ?? 0),
    String(item.turnos),
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['DPTO', 'CAPS', 'Fecha', 'Especialidad', 'Profesional', 'Estado', 'Todos', 'Sólo H.', 'Bot', 'Call', 'Activo']],
    body: detailRows,
    theme: 'striped',
    headStyles: {
      fillColor: [14, 116, 144], // cyan-700
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: 51,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 25 },
      2: { cellWidth: 16 },
      3: { cellWidth: 24 },
      4: { cellWidth: 28 },
      5: { cellWidth: 14 },
      6: { cellWidth: 11, halign: 'right' },
      7: { cellWidth: 11, halign: 'right' },
      8: { cellWidth: 11, halign: 'right' },
      9: { cellWidth: 11, halign: 'right' },
      10: { cellWidth: 13, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14, bottom: 15 },
    didDrawPage: data => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}  -  Sistema de Agendas a 30 Días`,
        14,
        290
      );
    },
  });

  doc.save(filename);
}
