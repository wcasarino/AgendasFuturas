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
    manana: number;
    tarde: number;
    vespertino: number;
    capsCount: Set<string>;
    prosCount: Set<string>;
  }>();

  agendas.forEach(item => {
    let agg = dayAggregates.get(item.fecha);
    if (!agg) {
      agg = {
        fecha: item.fechaOriginal || item.fecha,
        totalTurnos: 0,
        manana: 0,
        tarde: 0,
        vespertino: 0,
        capsCount: new Set<string>(),
        prosCount: new Set<string>(),
      };
      dayAggregates.set(item.fecha, agg);
    }
    agg.totalTurnos += item.turnos;
    const tLower = item.turno.toLowerCase();
    if (tLower.includes('mañana') || tLower.includes('manana')) agg.manana += item.turnos;
    else if (tLower.includes('tarde')) agg.tarde += item.turnos;
    else if (tLower.includes('vesp')) agg.vespertino += item.turnos;
    agg.capsCount.add(item.caps);
    agg.prosCount.add(item.profesional);
  });

  const sortedDates = Array.from(dayAggregates.keys()).sort();
  const resumenRows = [
    ['Fecha', 'Día', 'Total Turnos', 'Turno Mañana', 'Turno Tarde', 'Turno Vespertino', 'CAPS Activos', 'Profesionales'],
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
        agg.manana,
        agg.tarde,
        agg.vespertino,
        agg.capsCount.size,
        agg.prosCount.size,
      ];
    }),
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen['!cols'] = [
    { wch: 14 },
    { wch: 8 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Diario');

  // 2. Detalle de Agendas Sheet
  const agendasHeader = ['DPTO', 'CAPS', 'Fecha', 'Turno', 'Especialidad', 'Profesional', 'Turnos'];
  const agendasData = agendas.map(item => [
    item.dpto,
    item.caps,
    item.fechaOriginal || item.fecha,
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
  XLSX.utils.book_append_sheet(wb, wsAgendas, 'Detalle de Agendas');

  // 3. Metadata & Filtros Sheet
  const metaRows = [
    ['REPORTE DE AGENDAS FUTURAS', ''],
    ['Fecha de Generación', new Date().toLocaleString('es-AR')],
    ['Fecha de Lectura (Corte)', lectura.fechaOriginal],
    ['', ''],
    ['FILTROS APLICADOS', ''],
    ['Departamento (DPTO)', filters.dpto || 'Todos'],
    ['CAPS / Centro de Salud', filters.caps || 'Todos'],
    ['Turno', filters.turno || 'Todos'],
    ['Especialidad', filters.especialidad || 'Todas'],
    ['Profesional', filters.profesional || 'Todos'],
    ['Búsqueda libre', filters.search || 'Ninguna'],
    ['Día seleccionado', selectedDate ? formatFriendlyDate(selectedDate) : 'Todos los días'],
    ['', ''],
    ['MÉTRICAS DEL REPORTE', ''],
    ['Total de Turnos', agendas.reduce((acc, curr) => acc + curr.turnos, 0)],
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
  doc.text('REPORTE DE AGENDAS FUTURAS', 14, 13);

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
    `Turno: ${filters.turno || 'Todos'}`,
  ].join('   |   ');

  const fTextCol2 = [
    `Especialidad: ${filters.especialidad || 'Todas'}`,
    `Profesional: ${filters.profesional || 'Todos'}`,
    selectedDate ? `Día: ${selectedDate}` : 'Días: Período completo',
  ].join('   |   ');

  doc.text(fTextCol1, 18, 44);
  doc.text(fTextCol2, 18, 50);

  // Summary Metrics Box
  doc.setFillColor(248, 250, 252);
  const metricY = 58;
  const boxWidth = 43;
  const boxHeight = 16;
  const metrics = [
    { label: 'TOTAL TURNOS', val: totalTurnos.toLocaleString('es-AR'), color: [2, 132, 199] }, // sky-600
    { label: 'DÍAS AGENDADOS', val: String(uniqueDays), color: [16, 185, 129] }, // emerald-500
    { label: 'CAPS ACTIVOS', val: String(uniqueCaps), color: [99, 102, 241] }, // indigo-500
    { label: 'PROFESIONALES', val: String(uniquePros), color: [245, 158, 11] }, // amber-500
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
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, x + 4, metricY + 13);
  });

  // Section 1: Agregado por Día (or listado)
  let startY = 80;

  // If specific day selected, show detailed table directly
  // Otherwise show Daily summary table, followed by detail
  const daySummaryMap = new Map<string, { fecha: string; count: number; m: number; t: number; v: number }>();
  agendas.forEach(a => {
    let s = daySummaryMap.get(a.fecha);
    if (!s) {
      s = { fecha: a.fechaOriginal || a.fecha, count: 0, m: 0, t: 0, v: 0 };
      daySummaryMap.set(a.fecha, s);
    }
    s.count += a.turnos;
    const tl = a.turno.toLowerCase();
    if (tl.includes('mañana') || tl.includes('manana')) s.m += a.turnos;
    else if (tl.includes('tarde')) s.t += a.turnos;
    else if (tl.includes('vesp')) s.v += a.turnos;
  });

  const dailyTableData = Array.from(daySummaryMap.keys()).sort().map(iso => {
    const s = daySummaryMap.get(iso)!;
    return [s.fecha, String(s.count), String(s.m), String(s.t), String(s.v)];
  });

  if (dailyTableData.length > 0 && !selectedDate) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Distribución Diaria de Turnos', 14, startY - 2);

    autoTable(doc, {
      startY: startY,
      head: [['Fecha', 'Total Turnos', 'Mañana', 'Tarde', 'Vespertino']],
      body: dailyTableData.slice(0, 20), // Show top rows in summary
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: 51,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;
    startY = finalY + 10;
  }

  // Section 2: Detailed Items Table
  if (startY > 230) {
    doc.addPage();
    startY = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  const detailTitle = selectedDate
    ? `Detalle de Agendas del Día ${formatFriendlyDate(selectedDate)}`
    : 'Detalle de Agendas (Muestra hasta 150 registros)';
  doc.text(detailTitle, 14, startY - 2);

  const detailRows = agendas.slice(0, 150).map(item => [
    item.dpto,
    item.caps,
    item.fechaOriginal || item.fecha,
    item.turno,
    item.especialidad,
    item.profesional,
    String(item.turnos),
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['DPTO', 'CAPS', 'Fecha', 'Turno', 'Especialidad', 'Profesional', 'Turnos']],
    body: detailRows,
    theme: 'striped',
    headStyles: {
      fillColor: [14, 116, 144], // cyan-700
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: 51,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 32 },
      2: { cellWidth: 18 },
      3: { cellWidth: 18 },
      4: { cellWidth: 34 },
      5: { cellWidth: 38 },
      6: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14, bottom: 15 },
    didDrawPage: data => {
      // Footer page number
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}  -  Sistema de Agendas Futuras`,
        14,
        290
      );
    },
  });

  doc.save(filename);
}
