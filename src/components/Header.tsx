import React from 'react';
import {
  Calendar,
  FileSpreadsheet,
  Download,
  Database,
  Cpu,
  RefreshCw,
  Settings,
  Lock,
  Unlock,
} from 'lucide-react';
import { LecturaData } from '../types';

interface HeaderProps {
  lectura: LecturaData;
  activeFileName: string;
  totalFilteredTurnos: number;
  totalRawTurnos: number;
  onOpenUpload?: () => void;
  onDownloadTemplate?: () => void;
  onOpenExport: () => void;
  isCustomFile: boolean;
  onOpenFirebase?: () => void;
  lastFirebaseSync?: string | null;
  isLocalMemoryLoaded?: boolean;
  onRefreshGoogleSheet: () => void;
  isFetchingGoogleSheet: boolean;
  onOpenGoogleSheetsModal: () => void;
  onOpenSpreadsheet: () => void;
  lastGoogleSheetSync?: string | null;
  isAdminAuthenticated?: boolean;
  onLockAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lectura,
  activeFileName,
  totalFilteredTurnos,
  totalRawTurnos,
  onOpenUpload,
  onDownloadTemplate,
  onOpenExport,
  isCustomFile,
  onOpenFirebase,
  lastFirebaseSync,
  isLocalMemoryLoaded = true,
  onRefreshGoogleSheet,
  isFetchingGoogleSheet,
  onOpenGoogleSheetsModal,
  onOpenSpreadsheet,
  lastGoogleSheetSync,
  isAdminAuthenticated = false,
  onLockAdmin,
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
                  Agendas Futuras
                </h1>

                {/* Google Sheet Active Badge */}
                <button
                  onClick={onOpenGoogleSheetsModal}
                  title="Datos obtenidos en tiempo real de Google Sheet (link.txt). Clic para configurar."
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Google Sheets Activo</span>
                  {lastGoogleSheetSync && (
                    <span className="text-[10px] text-emerald-700 font-normal">({lastGoogleSheetSync})</span>
                  )}
                </button>

                {isLocalMemoryLoaded && (
                  <span
                    title="Los datos están disponibles de forma instantánea en la memoria de tu PC (IndexedDB)."
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200"
                  >
                    <Cpu className="w-3 h-3 text-blue-600" />
                    <span>En Memoria PC</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span className="font-mono text-slate-600 truncate max-w-[280px]" title={activeFileName}>
                  📊 {activeFileName}
                </span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                  Fecha Lectura (Hoja Lectura):{' '}
                  <strong className="text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold border border-emerald-200">
                    {lectura.fechaOriginal}
                  </strong>
                </span>

                {isAdminAuthenticated && onLockAdmin && (
                  <button
                    type="button"
                    onClick={onLockAdmin}
                    title="Bloquear modo administrador"
                    className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.2 rounded cursor-pointer transition-colors"
                  >
                    <Unlock className="w-3 h-3 text-amber-600" />
                    <span>Admin Activo (Bloquear)</span>
                  </button>
                )}
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
              title="Obtener los datos más recientes directamente desde Google Sheets (link.txt)"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingGoogleSheet ? 'animate-spin' : ''}`} />
              <span>{isFetchingGoogleSheet ? 'Actualizando...' : 'Actualizar Google Sheet'}</span>
            </button>

            {/* Configure Google Sheet Modal (Protected by password) */}
            <button
              id="btn-config-google-sheet"
              onClick={onOpenGoogleSheetsModal}
              title="Configuración y estado del Google Sheet vinculado (Acceso protegido con contraseña)"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
            >
              {isAdminAuthenticated ? (
                <Unlock className="w-3 h-3 text-emerald-600" />
              ) : (
                <Lock className="w-3 h-3 text-amber-600" />
              )}
              <Settings className="w-3.5 h-3.5 text-slate-600" />
              <span>Configuración</span>
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
