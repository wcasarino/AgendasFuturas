import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Link,
  Database,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  DEFAULT_SPREADSHEET_URL,
  DEFAULT_SPREADSHEET_ID,
  getSavedSpreadsheetUrl,
  saveSpreadsheetUrl,
  extractSpreadsheetId,
  fetchGoogleSheetData,
  GoogleSheetsFetchResult,
  getLastGoogleSheetFetchTime,
} from '../services/googleSheetsService';
import { AgendaItem, LecturaData } from '../types';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (data: { lectura: LecturaData; agendas: AgendaItem[]; fileName: string }) => void;
  onShowNotification: (notification: { type: 'success' | 'info'; message: string }) => void;
  currentAgendasCount: number;
  currentLecturaDate: string;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
  onShowNotification,
  currentAgendasCount,
  currentLecturaDate,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrlInput(getSavedSpreadsheetUrl());
      setLastFetchTime(getLastGoogleSheetFetchTime());
      setResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentId = extractSpreadsheetId(urlInput || DEFAULT_SPREADSHEET_URL);
  const openUrl = `https://docs.google.com/spreadsheets/d/${currentId}/edit`;

  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const trimmed = urlInput.trim();
      if (trimmed) {
        saveSpreadsheetUrl(trimmed);
      }

      const res: GoogleSheetsFetchResult = await fetchGoogleSheetData(trimmed);
      if (res.success && res.lectura && res.agendas) {
        onDataLoaded({
          lectura: res.lectura,
          agendas: res.agendas,
          fileName: 'Google Sheets (link.txt)',
        });
        setLastFetchTime(res.fetchedAt || null);
        setResult({
          success: true,
          message: `¡Sincronización exitosa! Se cargaron ${res.agendas.length} agendas y ${res.totalTurnos} turnos (Fecha corte: ${res.lectura.fechaOriginal}).`,
        });
        onShowNotification({
          type: 'success',
          message: `Datos actualizados en vivo desde Google Sheet (${res.agendas.length} agendas, ${res.totalTurnos} turnos).`,
        });
      } else {
        setResult({
          success: false,
          message: res.error || 'Error al obtener los datos del Google Sheet.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDefault = () => {
    setUrlInput(DEFAULT_SPREADSHEET_URL);
    saveSpreadsheetUrl(DEFAULT_SPREADSHEET_URL);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 to-teal-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Google Sheets &bull; Origen de Datos</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  En Vivo
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Sincronización directa con hojas <strong className="text-slate-800">Lectura</strong> y{' '}
                <strong className="text-slate-800">Agendas</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* Status info card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Planilla vinculada
              </span>
              <a
                href={openUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Abrir en Google Drive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block">Agendas cargadas:</span>
                <strong className="text-sm font-bold text-slate-800">{currentAgendasCount}</strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block">Fecha Corte (Lectura):</span>
                <strong className="text-sm font-bold text-blue-700">{currentLecturaDate}</strong>
              </div>
            </div>
            {lastFetchTime && (
              <p className="text-[10px] text-slate-500 pt-0.5">
                Última sincronización exitosa: <strong className="text-slate-700">{lastFetchTime}</strong>
              </p>
            )}
          </div>

          {/* Result Alert */}
          {result && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                result.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-relaxed">{result.message}</span>
            </div>
          )}

          {/* Google Sheet URL Config */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="gs-url-input" className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-emerald-600" />
                Enlace del Google Sheet (link.txt)
              </label>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-[10px] text-blue-600 hover:underline cursor-pointer"
              >
                Restablecer enlace original
              </button>
            </div>
            <input
              id="gs-url-input"
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono bg-white"
            />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              El Google Sheet debe tener acceso de lectura (&ldquo;Cualquier usuario con el enlace puede ver&rdquo;) y contener las hojas exactas: <strong>Lectura</strong> y <strong>Agendas</strong>.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={handleSync}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Obteniendo datos de Google Sheets...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Sincronizar y Actualizar Tablero Ahora</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
