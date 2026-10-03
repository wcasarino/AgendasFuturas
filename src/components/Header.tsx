import React from 'react';
import {
  Calendar,
  Download,
  RefreshCw,
} from 'lucide-react';
import { LecturaData } from '../types';

interface HeaderProps {
  lectura: LecturaData;
  activeFileName?: string;
  totalFilteredTurnos: number;
  totalRawTurnos: number;
  onOpenUpload?: () => void;
  onDownloadTemplate?: () => void;
  onOpenExport: () => void;
  isCustomFile?: boolean;
  onOpenFirebase?: () => void;
  lastFirebaseSync?: string | null;
  isLocalMemoryLoaded?: boolean;
  onRefreshGoogleSheet: () => void;
  isFetchingGoogleSheet: boolean;
  onOpenGoogleSheetsModal?: () => void;
  onOpenSpreadsheet?: () => void;
  lastGoogleSheetSync?: string | null;
  isAdminAuthenticated?: boolean;
  onLockAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lectura,
  onOpenExport,
  onRefreshGoogleSheet,
  isFetchingGoogleSheet,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand & File Info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Agendas a 30 Días
                </h1>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                  Fecha Lectura (Hoja Lectura):{' '}
                  <strong className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-mono font-bold border border-emerald-200">
                    {lectura.fechaOriginal}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Primary Action: Refresh from Google Sheets */}
            <button
              id="btn-refresh-google-sheet"
              onClick={onRefreshGoogleSheet}
              disabled={isFetchingGoogleSheet}
              title="Obtener los datos más recientes directamente desde Google Sheets"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingGoogleSheet ? 'animate-spin' : ''}`} />
              <span>{isFetchingGoogleSheet ? 'Actualizando...' : 'Actualizar Datos'}</span>
            </button>

            {/* Export Report */}
            <button
              id="btn-export-report"
              onClick={onOpenExport}
              title="Descargar reporte en Excel o PDF"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Exportar Reporte</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
