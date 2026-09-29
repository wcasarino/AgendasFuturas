import React, { useState } from 'react';
import { X, FileSpreadsheet, FileText, CheckCircle2, Download, Filter } from 'lucide-react';
import { AgendaItem, FilterState, LecturaData } from '../types';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { formatFriendlyDate } from '../utils/dateUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lectura: LecturaData;
  filteredAgendas: AgendaItem[];
  allAgendas: AgendaItem[];
  filters: FilterState;
  selectedDate: string | null;
  month1YearMonth: string;
  month2YearMonth: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  lectura,
  filteredAgendas,
  allAgendas,
  filters,
  selectedDate,
  month1YearMonth,
  month2YearMonth,
}) => {
  const [scope, setScope] = useState<'filtered' | 'selectedDay' | 'month1' | 'month2'>('filtered');
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  // Filter items based on selected scope
  let exportItems = filteredAgendas;
  let customFilenameBase = 'Reporte_Agendas_Futuras';

  if (scope === 'selectedDay' && selectedDate) {
    exportItems = filteredAgendas.filter(a => a.fecha === selectedDate);
    customFilenameBase = `Reporte_Agendas_${selectedDate}`;
  } else if (scope === 'month1') {
    exportItems = filteredAgendas.filter(a => a.fecha.startsWith(month1YearMonth));
    customFilenameBase = `Reporte_Agendas_${month1YearMonth}`;
  } else if (scope === 'month2') {
    exportItems = filteredAgendas.filter(a => a.fecha.startsWith(month2YearMonth));
    customFilenameBase = `Reporte_Agendas_${month2YearMonth}`;
  }

  const totalExportTurnos = exportItems.reduce((acc, c) => acc + c.turnos, 0);

  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      const opts = {
        lectura,
        agendas: exportItems,
        filters,
        selectedDate: scope === 'selectedDay' ? selectedDate : null,
      };

      if (format === 'excel') {
        exportToExcel(opts, `${customFilenameBase}.xlsx`);
      } else {
        exportToPDF(opts, `${customFilenameBase}.pdf`);
      }
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Exportar Reporte de Agendas</h3>
              <p className="text-xs text-slate-500">Generación de archivos detallados en PDF o Excel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* 1. Format Choice */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              1. Seleccione el formato de exportación
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('excel')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  format === 'excel'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 block">Formato Excel (.xlsx)</span>
                  <span className="text-[11px] text-slate-500">
                    Incluye hoja de resumen diario, hoja de detalle y hoja de filtros.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  format === 'pdf'
                    ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 block">Documento PDF (.pdf)</span>
                  <span className="text-[11px] text-slate-500">
                    Diseño formal imprimible con tabla diaria y detalle de turnos.
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Scope Choice */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              2. Alcance de los datos
            </label>
            <div className="space-y-2">
              
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'filtered'}
                  onChange={() => setScope('filtered')}
                  className="text-blue-600"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-800 block">
                    Todos los datos según filtros actuales
                  </span>
                  <span className="text-slate-500">
                    {filteredAgendas.length} registros • {filteredAgendas.reduce((a, c) => a + c.turnos, 0)} turnos totales
                  </span>
                </div>
              </label>

              {selectedDate && (
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === 'selectedDay'}
                    onChange={() => setScope('selectedDay')}
                    className="text-blue-600"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-slate-800 block">
                      Únicamente el día seleccionado ({formatFriendlyDate(selectedDate)})
                    </span>
                    <span className="text-slate-500">
                      Exporta el detalle específico de esta jornada
                    </span>
                  </div>
                </label>
              )}

              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'month1'}
                  onChange={() => setScope('month1')}
                  className="text-blue-600"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-800 block">
                    Solo el Mes de Lectura ({month1YearMonth})
                  </span>
                  <span className="text-slate-500">
                    Registros del primer mes del calendario
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'month2'}
                  onChange={() => setScope('month2')}
                  className="text-blue-600"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-slate-800 block">
                    Solo el Mes Siguiente ({month2YearMonth})
                  </span>
                  <span className="text-slate-500">
                    Registros del segundo mes del calendario
                  </span>
                </div>
              </label>

            </div>
          </div>

          {/* Report summary preview */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs flex items-center justify-between">
            <span className="text-slate-600">Total a exportar en este reporte:</span>
            <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
              {exportItems.length} registros | {totalExportTurnos.toLocaleString('es-AR')} turnos
            </span>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            id="btn-confirm-export"
            onClick={handleExecuteExport}
            disabled={isExporting || exportItems.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generando archivo...' : `Descargar ${format === 'excel' ? 'Excel' : 'PDF'}`}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
