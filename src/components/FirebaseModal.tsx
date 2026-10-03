import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Trash2,
  Cpu,
  HardDrive,
} from 'lucide-react';
import {
  saveExcelSheetsToFirebase,
  loadDatasetToPCMemory,
  clearAllExcelCollectionsFromFirebase,
  getFirebaseCollectionsStatus,
  validateFirebaseConnection,
  firebaseConfig,
  OWNER_EMAIL,
} from '../services/firebaseService';
import { AgendaItem, LecturaData } from '../types';
import { getLocalCachedVersion } from '../utils/localCache';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  lectura: LecturaData;
  allAgendas: AgendaItem[];
  activeFileName: string;
  onDataLoaded: (data: { lectura: LecturaData; agendas: AgendaItem[]; fileName: string }) => void;
  onShowNotification: (notification: { type: 'success' | 'info'; message: string }) => void;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({
  isOpen,
  onClose,
  lectura,
  allAgendas,
  activeFileName,
  onDataLoaded,
  onShowNotification,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFromFirebase, setIsLoadingFromFirebase] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [statusInfo, setStatusInfo] = useState<{
    totalLectura: number;
    totalAgendas: number;
    version: string | null;
    updatedAt: string | null;
    fileName: string | null;
  } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTestResult(null);
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const status = await getFirebaseCollectionsStatus();
      setStatusInfo(status);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await validateFirebaseConnection();
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveToFirebase = async () => {
    setIsSaving(true);
    setTestResult(null);
    try {
      const res = await saveExcelSheetsToFirebase({
        lectura,
        agendas: allAgendas,
        fileName: activeFileName,
      });

      if (res.success) {
        const time = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(time);
        setTestResult({
          success: true,
          message: res.message,
        });
        onShowNotification({
          type: 'success',
          message: res.message,
        });
        loadStatus();
      } else {
        setTestResult({
          success: false,
          message: res.message,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadFromFirebase = async () => {
    setIsLoadingFromFirebase(true);
    setTestResult(null);
    try {
      const res = await loadDatasetToPCMemory();
      if (res.success && res.lectura && res.agendas) {
        onDataLoaded({
          lectura: res.lectura,
          agendas: res.agendas,
          fileName: res.fileName || 'AGENDAS A 30 DÍAS.xlsx',
        });
        onShowNotification({
          type: 'success',
          message: res.message || `¡Cargado en memoria de la PC! ${res.agendas.length} agendas y fecha ${res.lectura.fechaOriginal}.`,
        });
        onClose();
      } else {
        setTestResult({
          success: false,
          message: res.message || 'No se pudieron recuperar los datos de Firebase.',
        });
      }
    } finally {
      setIsLoadingFromFirebase(false);
    }
  };

  const handleClearFirebase = async () => {
    setIsClearing(true);
    setTestResult(null);
    try {
      const res = await clearAllExcelCollectionsFromFirebase();
      setTestResult(res);
      setConfirmClear(false);
      onShowNotification({
        type: res.success ? 'success' : 'info',
        message: res.message,
      });
      loadStatus();
    } finally {
      setIsClearing(false);
    }
  };

  const localVersion = getLocalCachedVersion();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-amber-50/60 to-orange-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Firebase Firestore &bull; Colecciones por Hoja
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Activo
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Cuenta vinculada: <strong className="text-slate-800">{OWNER_EMAIL}</strong>
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">

          {/* Connection status badge card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold text-slate-800 text-xs">Proyecto Firestore conectado</span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Project: {firebaseConfig.projectId}
              </p>
              {lastSavedTime && (
                <p className="text-[11px] text-amber-700 font-medium">
                  Última sincronización en esta sesión: {lastSavedTime}
                </p>
              )}
            </div>
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-600" />}
              <span>Verificar Conexión</span>
            </button>
          </div>

          {/* Memory Architecture Notice */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <span className="font-bold text-emerald-900 block text-xs">
                Arquitectura en Memoria Local de la PC
              </span>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Al conectarte a la página, los datos de Firebase se suben a la <strong>memoria de tu PC</strong> (IndexedDB). Durante toda tu navegación, filtros por CAPS, búsquedas y cambios de mes, <strong>no se vuelve a consultar a Firebase</strong> a menos que se detecte una actualización en la base de datos.
              </p>
              {localVersion && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-mono pt-0.5">
                  <HardDrive className="w-3 h-3" />
                  <span>Versión en memoria local de tu PC: {localVersion}</span>
                </div>
              )}
            </div>
          </div>

          {/* Test/Sync Notification */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {/* Main Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleSaveToFirebase}
              disabled={isSaving}
              className="p-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-all shadow-xs flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                <span className="text-xs font-bold">Subir y Sincronizar en Firebase</span>
              </div>
              <span className="text-[11px] font-normal text-amber-100">
                Borra documentos previos y graba en colecciones &lsquo;Lectura&rsquo; y &lsquo;Agendas&rsquo;
              </span>
            </button>

            <button
              onClick={handleLoadFromFirebase}
              disabled={isLoadingFromFirebase}
              className="p-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all shadow-xs flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                {isLoadingFromFirebase ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                <span className="text-xs font-bold">Descargar a Memoria de la PC</span>
              </div>
              <span className="text-[11px] font-normal text-emerald-100">
                Sube las colecciones completas a la memoria de tu navegador
              </span>
            </button>
          </div>

          {/* Current Collections Status in Firebase */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-500" />
                Colecciones activas en Firebase Firestore
              </span>
              <button
                onClick={loadStatus}
                disabled={isLoadingStatus}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                <span>Actualizar estado</span>
              </button>
            </div>

            {isLoadingStatus ? (
              <div className="py-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Consultando estado en Firestore...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Colección:</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold">
                      /Lectura
                    </span>
                  </div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {statusInfo?.totalLectura || 0}
                  </div>
                  <span className="text-[10px] text-slate-400">documentos guardados</span>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Colección:</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold">
                      /Agendas
                    </span>
                  </div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {statusInfo?.totalAgendas || 0}
                  </div>
                  <span className="text-[10px] text-slate-400">documentos (1 por fila)</span>
                </div>
              </div>
            )}

            {statusInfo?.updatedAt && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                <div className="flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="truncate max-w-[200px]">{statusInfo.fileName || 'AGENDAS A 30 DÍAS.xlsx'}</span>
                </div>
                <span>
                  Actualizado: {new Date(statusInfo.updatedAt).toLocaleString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Clean / Wipe Collections Option */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2 text-slate-700">
              <Trash2 className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold text-slate-800 block">Vaciar colecciones de Firebase:</span>
                Elimina todos los documentos de las colecciones &lsquo;Lectura&rsquo; y &lsquo;Agendas&rsquo; en Firestore.
              </div>
            </div>
            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                disabled={isClearing}
                className="shrink-0 px-2.5 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-700 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar Base de Datos</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in">
                <button
                  type="button"
                  onClick={handleClearFirebase}
                  disabled={isClearing}
                  className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {isClearing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  <span>Confirmar Borrado</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  disabled={isClearing}
                  className="px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-[11px] font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

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
