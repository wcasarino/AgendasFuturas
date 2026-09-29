import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Lock,
  Code,
} from 'lucide-react';
import {
  getGoogleApiUrl,
  setGoogleApiUrl,
  testGoogleApiConnection,
  saveDataToGoogleApi,
  loadDataFromGoogleApi,
  getLastSyncTime,
  GOOGLE_APPS_SCRIPT_SAMPLE_CODE,
} from '../services/googleApiService';
import { AgendaItem, LecturaData } from '../types';

interface GoogleApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  lectura: LecturaData;
  allAgendas: AgendaItem[];
  activeFileName: string;
  onDataLoadedFromApi: (data: { lectura: LecturaData; agendas: AgendaItem[]; fileName: string }) => void;
  onShowNotification: (notification: { type: 'success' | 'info'; message: string }) => void;
}

export const GoogleApiModal: React.FC<GoogleApiModalProps> = ({
  isOpen,
  onClose,
  lectura,
  allAgendas,
  activeFileName,
  onDataLoadedFromApi,
  onShowNotification,
}) => {
  const [apiUrl, setApiUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFromApi, setIsLoadingFromApi] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiUrl(getGoogleApiUrl());
      setTestResult(null);
      setLastSync(getLastSyncTime());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    setGoogleApiUrl(apiUrl.trim());
    setTestResult({
      success: true,
      message: 'Configuración guardada correctamente.',
    });
    onShowNotification({
      type: 'success',
      message: 'URL de tu API de Google guardada con éxito.',
    });
  };

  const handleTestConnection = async () => {
    if (!apiUrl.trim()) {
      setTestResult({
        success: false,
        message: 'Por favor, ingresa una URL válida de Google Apps Script.',
      });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGoogleApiConnection(apiUrl.trim());
      setTestResult(res);
      if (res.success) {
        setGoogleApiUrl(apiUrl.trim());
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handlePushToApi = async () => {
    if (!apiUrl.trim()) {
      setTestResult({
        success: false,
        message: 'Primero ingresa y guarda la URL de tu API de Google.',
      });
      return;
    }

    setGoogleApiUrl(apiUrl.trim());
    setIsSaving(true);
    setTestResult(null);

    try {
      const res = await saveDataToGoogleApi({
        lectura,
        agendas: allAgendas,
        fileName: activeFileName,
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: res.message,
        });
        setLastSync(res.timestamp || new Date().toLocaleTimeString('es-AR'));
        onShowNotification({
          type: 'success',
          message: res.message,
        });
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

  const handlePullFromApi = async () => {
    if (!apiUrl.trim()) {
      setTestResult({
        success: false,
        message: 'Primero ingresa y guarda la URL de tu API de Google.',
      });
      return;
    }

    setGoogleApiUrl(apiUrl.trim());
    setIsLoadingFromApi(true);
    setTestResult(null);

    try {
      const res = await loadDataFromGoogleApi();
      if (res.success && res.lectura && res.agendas) {
        onDataLoadedFromApi({
          lectura: res.lectura,
          agendas: res.agendas,
          fileName: res.fileName || 'API_Google_Agendas.xlsx',
        });
        setTestResult({
          success: true,
          message: `¡Datos descargados exitosamente! (${res.agendas.length} agendas cargadas).`,
        });
        onShowNotification({
          type: 'success',
          message: `¡Se cargaron ${res.agendas.length} agendas desde tu API de Google!`,
        });
        onClose();
      } else {
        setTestResult({
          success: false,
          message: res.message || 'No se pudieron recuperar las agendas.',
        });
      }
    } finally {
      setIsLoadingFromApi(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_SAMPLE_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Almacenamiento en API Externa de Google
              </h2>
              <p className="text-xs text-slate-500">
                Propiedad de <strong>wcasarino@gmail.com</strong> (Google Apps Script gratuito)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700">
          
          {/* Status info banner */}
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/70 text-blue-900 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-xs text-blue-950">
                Almacenamiento 100% gratuito en tu nube de Google
              </p>
              <p className="text-[11px] text-blue-800 mt-0.5">
                Esta función permite que las agendas y la fecha de corte se guarden y consulten en un endpoint REST propio desplegado en tu cuenta de Google (Apps Script), sin costo y con acceso privado.
              </p>
              {lastSync && (
                <p className="text-[10px] text-blue-700 font-medium mt-1">
                  Última sincronización: <strong>{lastSync}</strong>
                </p>
              )}
            </div>
          </div>

          {/* URL Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              URL de tu API de Google (Google Apps Script Web App)
            </label>
            <div className="flex gap-2">
              <input
                id="input-google-api-url"
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden font-mono"
              />
              <button
                onClick={handleTestConnection}
                disabled={isTesting || !apiUrl.trim()}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                <span>Probar</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Pega aquí la URL que termina en <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">/exec</code> generada al implementar la aplicación web en Google Apps Script.
            </p>
          </div>

          {/* Test/Sync Result Alert */}
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

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              onClick={handleSaveConfig}
              className="px-3 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 text-slate-500" />
              <span>Guardar URL</span>
            </button>

            <button
              onClick={handlePushToApi}
              disabled={isSaving || !apiUrl.trim()}
              className="px-3 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              <span>Guardar en API</span>
            </button>

            <button
              onClick={handlePullFromApi}
              disabled={isLoadingFromApi || !apiUrl.trim()}
              className="px-3 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              {isLoadingFromApi ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <DownloadCloud className="w-4 h-4" />
              )}
              <span>Cargar de API</span>
            </button>
          </div>

          {/* Guide to deploy Google Apps Script */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Code className="w-4 h-4 text-blue-600" />
                ¿Cómo activar tu API gratuita en Google con wcasarino@gmail.com?
              </span>
              <button
                onClick={() => setShowCode(prev => !prev)}
                className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                {showCode ? 'Ocultar código' : 'Ver código de script'}
              </button>
            </div>

            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed">
              <li>
                Abre{' '}
                <a
                  href="https://script.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                >
                  script.google.com
                  <ExternalLink className="w-3 h-3" />
                </a>{' '}
                iniciando sesión con <strong>wcasarino@gmail.com</strong>.
              </li>
              <li>
                Haz clic en <strong>&ldquo;Nuevo proyecto&rdquo;</strong> y pega el código que proporcionamos abajo.
              </li>
              <li>
                Arriba a la derecha, haz clic en <strong>Implementar &gt; Nueva implementación</strong>.
              </li>
              <li>
                Selecciona Tipo: <strong>Aplicación web</strong>. En <em>&ldquo;Ejecutar como&rdquo;</em> elige <strong>Yo (wcasarino@gmail.com)</strong> y en <em>&ldquo;Quién tiene acceso&rdquo;</em> elige <strong>Cualquier usuario</strong>.
              </li>
              <li>
                Copia la <strong>URL de la aplicación web</strong> que termina en <code>/exec</code> y pégala en el campo de arriba.
              </li>
            </ol>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">¡Código copiado al portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copiar código de Google Apps Script</span>
                  </>
                )}
              </button>
            </div>

            {showCode && (
              <pre className="p-3 bg-slate-900 text-slate-200 text-[10px] font-mono rounded-lg overflow-x-auto max-h-56 leading-relaxed">
                {GOOGLE_APPS_SCRIPT_SAMPLE_CODE}
              </pre>
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
