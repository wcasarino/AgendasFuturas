import React, { useState, useMemo } from 'react';
import { Calendar, Download, FileSpreadsheet, FileText, Search, X, ChevronDown, ChevronUp, User, Stethoscope, Building2, Clock } from 'lucide-react';
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
  const [sortField, setSortField] = useState<'turnos' | 'profesional' | 'especialidad' | 'caps' | 'turno'>('turnos');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Decide if showing single selected day or all filtered records
  const isSingleDay = Boolean(selectedDate);
  const activeItems = isSingleDay ? items : allFilteredItems;

  // Summary by Turno
  const turnosSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    activeItems.forEach(item => {
      summary[item.turno] = (summary[item.turno] || 0) + item.turnos;
    });
    return summary;
  }, [activeItems]);

  // Summary by Top Especialidades
  const topEspecialidades = useMemo(() => {
    const map: Record<string, number> = {};
    activeItems.forEach(item => {
      map[item.especialidad] = (map[item.especialidad] || 0) + item.turnos;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [activeItems]);

  // Filtered and sorted table items
  const processedItems = useMemo(() => {
    let result = activeItems;

    if (daySearch.trim()) {
      const q = daySearch.toLowerCase();
      result = result.filter(
        i =>
          i.profesional.toLowerCase().includes(q) ||
          i.especialidad.toLowerCase().includes(q) ||
          i.caps.toLowerCase().includes(q) ||
          i.dpto.toLowerCase().includes(q) ||
          i.turno.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      let valA: string | number = a[sortField];
      let valB: string | number = b[sortField];

      if (typeof valA === 'string') {
        return sortAsc
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      } else {
        return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      }
    });

    return result;
  }, [activeItems, daySearch, sortField, sortAsc]);

  const totalSumTurnos = activeItems.reduce((acc, c) => acc + c.turnos, 0);
  const totalPages = Math.ceil(processedItems.length / itemsPerPage);
  const paginatedItems = processedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (field: 'turnos' | 'profesional' | 'especialidad' | 'caps' | 'turno') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default desc for counts
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
                      <span>Detalle del Día: {formatFriendlyDate(selectedDate!)}</span>
                      <button
                        onClick={onClearDateSelection}
                        className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
                        title="Ver todos los días"
                      >
                        Ver todos
                      </button>
                    </>
                  ) : (
                    <span>Detalle Consolidado de Agendas (Todos los días filtrados)</span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {processedItems.length} registros • Suma de turnos: <strong className="text-blue-700 font-bold">{totalSumTurnos.toLocaleString('es-AR')}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Export Day Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-export-day-excel"
              onClick={handleExportDayExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Excel</span>
            </button>
            <button
              id="btn-export-day-pdf"
              onClick={handleExportDayPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Exportar PDF</span>
            </button>
          </div>

        </div>

        {/* Shift / Turno Chips Summary */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-200/80">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Por Turno:
          </span>
          {Object.entries(turnosSummary).map(([turnoName, count]) => (
            <span
              key={turnoName}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>{turnoName}:</span>
              <strong className="text-blue-700">{count} turnos</strong>
            </span>
          ))}

          {topEspecialidades.length > 0 && (
            <>
              <span className="text-slate-300 mx-1 hidden sm:inline">|</span>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider hidden sm:inline">
                Top Especialidades:
              </span>
              <div className="hidden sm:flex flex-wrap items-center gap-1.5">
                {topEspecialidades.map(([esp, count]) => (
                  <span
                    key={esp}
                    className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                  >
                    {esp}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Table Quick Search Toolbar */}
      <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <input
            type="text"
            placeholder="Filtrar por médico, CAPS, especialidad..."
            value={daySearch}
            onChange={e => {
              setDaySearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs rounded-lg border border-slate-200 pl-8 pr-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-500 outline-hidden"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          {daySearch && (
            <button
              onClick={() => setDaySearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <span className="text-xs text-slate-500">
          Mostrando {processedItems.length} de {activeItems.length} registros
        </span>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th
                onClick={() => handleSort('caps')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>DPTO / CAPS</span>
                  {sortField === 'caps' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              {!isSingleDay && (
                <th className="py-3 px-4">
                  <span>Fecha</span>
                </th>
              )}
              <th
                onClick={() => handleSort('turno')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Turno</span>
                  {sortField === 'turno' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('especialidad')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Especialidad</span>
                  {sortField === 'especialidad' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('profesional')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Profesional</span>
                  {sortField === 'profesional' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th
                onClick={() => handleSort('turnos')}
                className="py-3 px-4 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Turnos (Col. G)</span>
                  {sortField === 'turnos' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  {isSingleDay && allDayItems && allDayItems.length > 0 ? (
                    <div className="max-w-md mx-auto p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-950 text-center">
                      <p className="font-bold text-xs mb-1">
                        Esta fecha tiene {allDayItems.reduce((acc, c) => acc + c.turnos, 0)} turnos agendados en total, pero ninguno coincide con los filtros aplicados.
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
              paginatedItems.map(item => (
                <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-2.5 px-4">
                    <span className="font-semibold text-slate-900 block">{item.caps}</span>
                    <span className="text-[11px] text-slate-500 font-medium">{item.dpto}</span>
                  </td>
                  {!isSingleDay && (
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {item.fechaOriginal || item.fecha}
                    </td>
                  )}
                  <td className="py-2.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {item.turno}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-800">
                    {item.especialidad}
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {item.profesional}
                  </td>
                  <td className="py-2.5 px-4 text-right font-black text-blue-700 text-sm">
                    {item.turnos}
                  </td>
                </tr>
              ))
            )}
          </tbody>
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
              className="px-2.5 py-1 rounded border border-slate-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-medium"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-medium"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
