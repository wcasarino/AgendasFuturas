import React, { useState, useMemo } from 'react';
import { Calendar, FileSpreadsheet, FileText, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { AgendaItem, FilterState, LecturaData } from '../types';
import { formatFriendlyDate } from '../utils/dateUtils';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

interface DayDetailViewProps {
  selectedDate: string | null;
  items: AgendaItem[];
  allFilteredItems: AgendaItem[];
  allDayItems?: AgendaItem[];
  lectura: LecturaData;
  filters: FilterState;
  onClearDateSelection: () => void;
  onResetFilters?: () => void;
}

interface GroupedRow {
  id: string;
  dpto: string;
  caps: string;
  fecha?: string;
  fechaOriginal?: string;
  especialidad: string;
  profesional: string;
  // Todos
  todosA: number;
  todosL: number;
  // Sólo H.
  soloHA: number;
  soloHL: number;
  // Bot
  botA: number;
  botL: number;
  // Call
  callA: number;
  callL: number;
  // Totales de la fila
  totalA: number;
  totalL: number;
  totalRow: number;
}

type SortField =
  | 'caps'
  | 'especialidad'
  | 'profesional'
  | 'todosA'
  | 'todosL'
  | 'soloHA'
  | 'soloHL'
  | 'botA'
  | 'botL'
  | 'callA'
  | 'callL'
  | 'totalA'
  | 'totalL'
  | 'totalRow';

export const DayDetailView: React.FC<DayDetailViewProps> = ({
  selectedDate,
  items,
  allFilteredItems,
  allDayItems = [],
  lectura,
  filters,
  onClearDateSelection,
  onResetFilters,
}) => {
  const [daySearch, setDaySearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalRow');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Decide if showing single selected day or all filtered records
  const isSingleDay = Boolean(selectedDate);
  const activeItems = isSingleDay ? items : allFilteredItems;

  // Group items by DPTO, CAPS, Especialidad, Profesional (and Fecha if multiple days)
  const groupedRows: GroupedRow[] = useMemo(() => {
    const map = new Map<string, GroupedRow>();

    activeItems.forEach(item => {
      const groupKey = isSingleDay
        ? `${item.dpto}||${item.caps}||${item.especialidad}||${item.profesional}`
        : `${item.fecha}||${item.dpto}||${item.caps}||${item.especialidad}||${item.profesional}`;

      let row = map.get(groupKey);
      if (!row) {
        row = {
          id: groupKey,
          dpto: item.dpto,
          caps: item.caps,
          fecha: item.fecha,
          fechaOriginal: item.fechaOriginal || item.fecha,
          especialidad: item.especialidad,
          profesional: item.profesional,
          todosA: 0,
          todosL: 0,
          soloHA: 0,
          soloHL: 0,
          botA: 0,
          botL: 0,
          callA: 0,
          callL: 0,
          totalA: 0,
          totalL: 0,
          totalRow: 0,
        };
        map.set(groupKey, row);
      }

      const isAsignado = (item.estado || '').toLowerCase().trim().includes('asig');

      if (isAsignado) {
        row.todosA += item.todos || 0;
        row.soloHA += item.soloH || 0;
        row.botA += item.bot || 0;
        row.callA += item.call || 0;
      } else {
        // Libre
        row.todosL += item.todos || 0;
        row.soloHL += item.soloH || 0;
        row.botL += item.bot || 0;
        row.callL += item.call || 0;
      }

      row.totalA = row.todosA + row.soloHA + row.botA + row.callA;
      row.totalL = row.todosL + row.soloHL + row.botL + row.callL;
      row.totalRow = row.totalA + row.totalL;
    });

    return Array.from(map.values());
  }, [activeItems, isSingleDay]);

  // Global summary of the current view
  const globalSummary = useMemo(() => {
    let todosA = 0;
    let todosL = 0;
    let soloHA = 0;
    let soloHL = 0;
    let botA = 0;
    let botL = 0;
    let callA = 0;
    let callL = 0;

    groupedRows.forEach(row => {
      todosA += row.todosA;
      todosL += row.todosL;
      soloHA += row.soloHA;
      soloHL += row.soloHL;
      botA += row.botA;
      botL += row.botL;
      callA += row.callA;
      callL += row.callL;
    });

    const totalA = todosA + soloHA + botA + callA;
    const totalL = todosL + soloHL + botL + callL;

    return {
      todosA,
      todosL,
      soloHA,
      soloHL,
      botA,
      botL,
      callA,
      callL,
      totalA,
      totalL,
      totalGlobal: totalA + totalL,
    };
  }, [groupedRows]);

  // Filtered and sorted table items
  const processedRows = useMemo(() => {
    let result = groupedRows;

    if (daySearch.trim()) {
      const q = daySearch.toLowerCase();
      result = result.filter(
        r =>
          r.profesional.toLowerCase().includes(q) ||
          r.especialidad.toLowerCase().includes(q) ||
          r.caps.toLowerCase().includes(q) ||
          r.dpto.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      let valA: string | number = a[sortField] ?? '';
      let valB: string | number = b[sortField] ?? '';

      if (typeof valA === 'string') {
        return sortAsc
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      } else {
        return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      }
    });

    return result;
  }, [groupedRows, daySearch, sortField, sortAsc]);

  const totalPages = Math.ceil(processedRows.length / itemsPerPage);
  const paginatedRows = processedRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default desc for numbers
    }
  };

  const handleExportDayExcel = () => {
    exportToExcel(
      {
        lectura,
        agendas: activeItems,
        filters,
        selectedDate,
      },
      selectedDate ? `Agendas_${selectedDate}.xlsx` : 'Agendas_Detalle_Filtrado.xlsx'
    );
  };

  const handleExportDayPDF = () => {
    exportToPDF(
      {
        lectura,
        agendas: activeItems,
        filters,
        selectedDate,
      },
      selectedDate ? `Agendas_${selectedDate}.pdf` : 'Agendas_Detalle_Filtrado.pdf'
    );
  };

  return (
    <div id="day-detail-section" className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mb-12">
      
      {/* Section Header */}
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  {isSingleDay ? (
                    <>
                      <span>Detalle del Día:</span>
                      <span className="text-blue-600 font-extrabold">{formatFriendlyDate(selectedDate!)}</span>
                      <button
                        onClick={onClearDateSelection}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline ml-2 cursor-pointer"
                      >
                        (Ver todos los días)
                      </button>
                    </>
                  ) : (
                    <span>Detalle Consolidado de Agendas (Todos los días filtrados)</span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {processedRows.length} profesionales/agendas • Total Turnos:{' '}
                  <strong className="text-slate-900 font-bold">{globalSummary.totalGlobal.toLocaleString('es-AR')}</strong>{' '}
                  (<strong className="text-amber-700">A: {globalSummary.totalA.toLocaleString('es-AR')}</strong> |{' '}
                  <strong className="text-emerald-700">L: {globalSummary.totalL.toLocaleString('es-AR')}</strong>)
                </p>
              </div>
            </div>
          </div>

          {/* Export Day Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-export-day-excel"
              onClick={handleExportDayExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Excel</span>
            </button>
            <button
              id="btn-export-day-pdf"
              onClick={handleExportDayPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Exportar PDF</span>
            </button>
          </div>

        </div>

        {/* Resumen por Canal con desglose A y L */}
        <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-3 border-t border-slate-200/80 text-xs">
          <span className="font-bold text-slate-600 uppercase tracking-wider">
            Totales por Canal:
          </span>

          {/* Todos */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <span className="font-bold text-slate-700">Todos:</span>
            <span className="font-bold text-amber-700">A: {globalSummary.todosA}</span>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-emerald-700">L: {globalSummary.todosL}</span>
          </div>

          {/* Sólo H. */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <span className="font-bold text-slate-700">Sólo H.:</span>
            <span className="font-bold text-amber-700">A: {globalSummary.soloHA}</span>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-emerald-700">L: {globalSummary.soloHL}</span>
          </div>

          {/* Bot */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <span className="font-bold text-slate-700">Bot:</span>
            <span className="font-bold text-amber-700">A: {globalSummary.botA}</span>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-emerald-700">L: {globalSummary.botL}</span>
          </div>

          {/* Call */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <span className="font-bold text-slate-700">Call:</span>
            <span className="font-bold text-amber-700">A: {globalSummary.callA}</span>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-emerald-700">L: {globalSummary.callL}</span>
          </div>

          {/* Total General */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-bold ml-auto shadow-2xs">
            <span>Total:</span>
            <span className="text-amber-700">A: {globalSummary.totalA}</span>
            <span className="text-blue-300">|</span>
            <span className="text-emerald-700">L: {globalSummary.totalL}</span>
          </div>
        </div>

      </div>

      {/* Table Quick Search Toolbar */}
      <div className="p-3 sm:px-6 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por médico, efector o especialidad..."
            value={daySearch}
            onChange={e => {
              setDaySearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-300 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {daySearch && (
            <button
              onClick={() => setDaySearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Mostrando {paginatedRows.length} de {processedRows.length} filas (agrupadas por DPTO / CAPS, Especialidad y Profesional)
        </div>
      </div>

      {/* Hierarchical Table with Subcolumns A and L */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 border-collapse">
          <thead>
            {/* Header Row 1: Channels and main headers */}
            <tr className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <th
                rowSpan={2}
                onClick={() => handleSort('caps')}
                className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors border-r border-slate-200 align-middle"
              >
                <div className="flex items-center gap-1">
                  <span>DPTO / CAPS</span>
                  {sortField === 'caps' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>

              {!isSingleDay && (
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 align-middle">
                  <span>Fecha</span>
                </th>
              )}

              <th
                rowSpan={2}
                onClick={() => handleSort('especialidad')}
                className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors border-r border-slate-200 align-middle"
              >
                <div className="flex items-center gap-1">
                  <span>Especialidad</span>
                  {sortField === 'especialidad' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>

              <th
                rowSpan={2}
                onClick={() => handleSort('profesional')}
                className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors border-r border-slate-200 align-middle"
              >
                <div className="flex items-center gap-1">
                  <span>Profesional</span>
                  {sortField === 'profesional' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>

              {/* Canal: Todos */}
              <th colSpan={2} className="py-2 px-2 text-center border-r border-slate-200 bg-slate-100 font-extrabold text-slate-800">
                Todos
              </th>

              {/* Canal: Sólo H. */}
              <th colSpan={2} className="py-2 px-2 text-center border-r border-slate-200 bg-slate-100 font-extrabold text-slate-800">
                Sólo H.
              </th>

              {/* Canal: Bot */}
              <th colSpan={2} className="py-2 px-2 text-center border-r border-slate-200 bg-slate-100 font-extrabold text-slate-800">
                Bot
              </th>

              {/* Canal: Call */}
              <th colSpan={2} className="py-2 px-2 text-center border-r border-slate-200 bg-slate-100 font-extrabold text-slate-800">
                Call
              </th>

              {/* Total Row */}
              <th colSpan={2} className="py-2 px-2 text-center bg-blue-100/70 font-black text-blue-900">
                Total Fila
              </th>
            </tr>

            {/* Header Row 2: Sub-columns A and L */}
            <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200 text-center">
              {/* Todos A / L */}
              <th
                onClick={() => handleSort('todosA')}
                title="Todos - Asignados"
                className="py-1 px-2 cursor-pointer hover:bg-amber-100/60 text-amber-800 bg-amber-50/50 border-r border-slate-200"
              >
                A
              </th>
              <th
                onClick={() => handleSort('todosL')}
                title="Todos - Libres"
                className="py-1 px-2 cursor-pointer hover:bg-emerald-100/60 text-emerald-800 bg-emerald-50/50 border-r border-slate-200"
              >
                L
              </th>

              {/* Sólo H. A / L */}
              <th
                onClick={() => handleSort('soloHA')}
                title="Sólo H. - Asignados"
                className="py-1 px-2 cursor-pointer hover:bg-amber-100/60 text-amber-800 bg-amber-50/50 border-r border-slate-200"
              >
                A
              </th>
              <th
                onClick={() => handleSort('soloHL')}
                title="Sólo H. - Libres"
                className="py-1 px-2 cursor-pointer hover:bg-emerald-100/60 text-emerald-800 bg-emerald-50/50 border-r border-slate-200"
              >
                L
              </th>

              {/* Bot A / L */}
              <th
                onClick={() => handleSort('botA')}
                title="Bot - Asignados"
                className="py-1 px-2 cursor-pointer hover:bg-amber-100/60 text-amber-800 bg-amber-50/50 border-r border-slate-200"
              >
                A
              </th>
              <th
                onClick={() => handleSort('botL')}
                title="Bot - Libres"
                className="py-1 px-2 cursor-pointer hover:bg-emerald-100/60 text-emerald-800 bg-emerald-50/50 border-r border-slate-200"
              >
                L
              </th>

              {/* Call A / L */}
              <th
                onClick={() => handleSort('callA')}
                title="Call - Asignados"
                className="py-1 px-2 cursor-pointer hover:bg-amber-100/60 text-amber-800 bg-amber-50/50 border-r border-slate-200"
              >
                A
              </th>
              <th
                onClick={() => handleSort('callL')}
                title="Call - Libres"
                className="py-1 px-2 cursor-pointer hover:bg-emerald-100/60 text-emerald-800 bg-emerald-50/50 border-r border-slate-200"
              >
                L
              </th>

              {/* Total A / L */}
              <th
                onClick={() => handleSort('totalA')}
                title="Total Asignados"
                className="py-1 px-2 cursor-pointer hover:bg-amber-100/80 text-amber-900 bg-amber-100/40 border-r border-slate-200 font-extrabold"
              >
                A
              </th>
              <th
                onClick={() => handleSort('totalL')}
                title="Total Libres"
                className="py-1 px-2 cursor-pointer hover:bg-emerald-100/80 text-emerald-900 bg-emerald-100/40 font-extrabold"
              >
                L
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={isSingleDay ? 13 : 14} className="py-8 text-center text-slate-500">
                  {isSingleDay && allDayItems && allDayItems.length > 0 ? (
                    <div className="max-w-md mx-auto p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-950 text-center">
                      <p className="font-bold text-xs mb-1">
                        Esta fecha tiene turnos registrados, pero ninguno coincide con los filtros aplicados.
                      </p>
                      <p className="text-[11px] text-blue-800 mb-3">
                        Puede restablecer los filtros para consultar todos los turnos registrados en este día.
                      </p>
                      {onResetFilters && (
                        <button
                          type="button"
                          onClick={onResetFilters}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          Restablecer Filtros
                        </button>
                      )}
                    </div>
                  ) : (
                    <span>No se encontraron registros con los filtros actuales.</span>
                  )}
                </td>
              </tr>
            ) : (
              paginatedRows.map(row => (
                <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                  {/* DPTO / CAPS */}
                  <td className="py-2.5 px-3.5 border-r border-slate-100">
                    <span className="font-bold text-slate-900 block text-xs">{row.caps}</span>
                    <span className="text-[11px] text-slate-500 font-medium">{row.dpto}</span>
                  </td>

                  {!isSingleDay && (
                    <td className="py-2.5 px-3 font-mono text-slate-600 border-r border-slate-100 text-xs">
                      {row.fechaOriginal || row.fecha}
                    </td>
                  )}

                  {/* Especialidad */}
                  <td className="py-2.5 px-3.5 font-medium text-slate-800 border-r border-slate-100 text-xs">
                    {row.especialidad}
                  </td>

                  {/* Profesional */}
                  <td className="py-2.5 px-3.5 text-slate-900 font-semibold border-r border-slate-100 text-xs">
                    {row.profesional}
                  </td>

                  {/* Todos A */}
                  <td className={`py-2 px-2 text-center border-r border-slate-100 font-bold ${
                    row.todosA > 0 ? 'text-amber-700 bg-amber-50/30' : 'text-slate-300'
                  }`}>
                    {row.todosA > 0 ? row.todosA : '0'}
                  </td>

                  {/* Todos L */}
                  <td className={`py-2 px-2 text-center border-r border-slate-100 font-bold ${
                    row.todosL > 0 ? 'text-emerald-700 bg-emerald-50/30' : 'text-slate-300'
                  }`}>
                    {row.todosL > 0 ? row.todosL : '0'}
                  </td>

                  {/* Sólo H. A */}
                  <td className={`py-2 px-2 text-center border-r border-slate-100 font-bold ${
                    row.soloHA > 0 ? 'text-amber-700 bg-amber-50/30' : 'text-slate-300'
                  }`}>
                    {row.soloHA > 0 ? row.soloHA : '0'}
                  </td>

                  {/* Sólo H. L */}
                  <td className={`py-2 px-2 text-center border-r border-slate-100 font-bold ${
                    row.soloHL > 0 ? 'text-emerald-700 bg-emerald-50/30' : 'text-slate-300'
                  }`}>
                    {row.soloHL > 0 ? row.soloHL : '0'}
                  </td>

                  {/* Bot A */}
                  <td className={`py-2 px-2 text-center border-r border-slate-100 font-bold ${
                    row.botA > 0 ? 'text-amber-700 bg-amber-50/30' : 'text-slate-300'
                  }`}>
                    {row.botA > 0 ? row.botA : '0'}
                  </td>

                  {/* Bot L */}
                  <td className={`py-2 px-2 text-center border-r border-slate-100 font-bold ${
                    row.botL > 0 ? 'text-emerald-700 bg-emerald-50/30' : 'text-slate-300'
                  }`}>
                    {row.botL > 0 ? row.botL : '0'}
                  </td>

                  {/* Call A */}
                  <td className={`py-2 px-2 text-center border-r border-slate-100 font-bold ${
                    row.callA > 0 ? 'text-amber-700 bg-amber-50/30' : 'text-slate-300'
                  }`}>
                    {row.callA > 0 ? row.callA : '0'}
                  </td>

                  {/* Call L */}
                  <td className={`py-2 px-2 text-center border-r border-slate-100 font-bold ${
                    row.callL > 0 ? 'text-emerald-700 bg-emerald-50/30' : 'text-slate-300'
                  }`}>
                    {row.callL > 0 ? row.callL : '0'}
                  </td>

                  {/* Total Fila A */}
                  <td className={`py-2 px-2 text-center border-r border-slate-100 font-black text-xs ${
                    row.totalA > 0 ? 'text-amber-800 bg-amber-50/60' : 'text-slate-300'
                  }`}>
                    {row.totalA}
                  </td>

                  {/* Total Fila L */}
                  <td className={`py-2 px-2 text-center font-black text-xs ${
                    row.totalL > 0 ? 'text-emerald-800 bg-emerald-50/60' : 'text-slate-300'
                  }`}>
                    {row.totalL}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Table Footer with Consolidated Totals */}
          {processedRows.length > 0 && (
            <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 text-xs font-black text-slate-800">
              <tr>
                <td className="py-2.5 px-3.5" colSpan={isSingleDay ? 3 : 4}>
                  <span>Totales ({processedRows.length} filas):</span>
                </td>
                {/* Todos */}
                <td className="py-2 px-2 text-center text-amber-800 bg-amber-50/50">
                  {globalSummary.todosA}
                </td>
                <td className="py-2 px-2 text-center text-emerald-800 bg-emerald-50/50">
                  {globalSummary.todosL}
                </td>
                {/* Sólo H. */}
                <td className="py-2 px-2 text-center text-amber-800 bg-amber-50/50">
                  {globalSummary.soloHA}
                </td>
                <td className="py-2 px-2 text-center text-emerald-800 bg-emerald-50/50">
                  {globalSummary.soloHL}
                </td>
                {/* Bot */}
                <td className="py-2 px-2 text-center text-amber-800 bg-amber-50/50">
                  {globalSummary.botA}
                </td>
                <td className="py-2 px-2 text-center text-emerald-800 bg-emerald-50/50">
                  {globalSummary.botL}
                </td>
                {/* Call */}
                <td className="py-2 px-2 text-center text-amber-800 bg-amber-50/50">
                  {globalSummary.callA}
                </td>
                <td className="py-2 px-2 text-center text-emerald-800 bg-emerald-50/50">
                  {globalSummary.callL}
                </td>
                {/* Total */}
                <td className="py-2 px-2 text-center text-amber-900 bg-amber-100/60 font-black">
                  {globalSummary.totalA}
                </td>
                <td className="py-2 px-2 text-center text-emerald-900 bg-emerald-100/60 font-black">
                  {globalSummary.totalL}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-medium cursor-pointer"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-medium cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
