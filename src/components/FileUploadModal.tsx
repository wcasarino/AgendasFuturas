import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldAlert,
  Database,
} from 'lucide-react';
import { parseAgendasExcel, ParseResult } from '../utils/excelParser';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileLoaded: (result: ParseResult) => void;
  onDownloadTemplate: () => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onFileLoaded,
  onDownloadTemplate,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open or close
  useEffect(() => {
    if (isOpen) {
      setIsAuthenticated(false);
      setPasswordInput('');
      setPasswordError(null);
      setError(null);
      setWarnings([]);
      setShowPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === '123456') {
      setIsAuthenticated(true);
      setPasswordError(null);
    } else {
      setPasswordError('Contraseña incorrecta. Ingrese la clave autorizada (123456).');
    }
  };

  const handleProcessFile = async (file: File) => {
    if (!isAuthenticated) {
      setError('Se requiere autorización para importar el archivo.');
      return;
    }

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Por favor suba un archivo en formato Excel válido (.xlsx o .xls).');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setWarnings([]);

    try {
      const result = await parseAgendasExcel(file);
      if (result.success && result.lectura && result.agendas) {
        onFileLoaded(result);
        onClose();
      } else {
        setError(result.error || 'No se pudo leer el archivo Excel.');
        if (result.warnings) setWarnings(result.warnings);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error inesperado al procesar.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isAuthenticated) setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isAuthenticated) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                isAuthenticated ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isAuthenticated ? <Upload className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isAuthenticated ? 'Cargar Archivo Excel' : 'Acceso Protegido - Importación'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAuthenticated
                  ? 'AGENDAS A 30 DÍAS.xlsx (Hojas: Lectura y Agendas)'
                  : 'Ingrese la contraseña para habilitar la importación'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Password Step vs Upload Step */}
        {!isAuthenticated ? (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-slate-800">
                Contraseña de Seguridad Requerida
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Para importar el archivo <strong>AGENDAS A 30 DÍAS.xlsx</strong> y actualizar los datos del sistema, ingrese la contraseña de acceso.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-sm mx-auto">
              <div>
                <label
                  htmlFor="import-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Contraseña de Importación
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="import-password"
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    value={passwordInput}
                    onChange={e => {
                      setPasswordInput(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    placeholder="Ingrese la clave..."
                    className={`w-full text-sm rounded-xl border pl-9 pr-10 py-2.5 outline-hidden transition-all ${
                      passwordError
                        ? 'border-red-400 bg-red-50/40 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 text-slate-800'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700 animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-import-password"
                  type="submit"
                  className="w-1/2 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-500/25 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Desbloquear</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Authorized banner */}
            <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3 py-2 rounded-xl text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Acceso autorizado para importación
              </span>
              <span className="text-[11px] text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                Autorizado
              </span>
            </div>

            {/* Firebase replace notice */}
            <div className="flex items-start gap-2.5 bg-amber-50 text-amber-900 border border-amber-200/90 px-3 py-2.5 rounded-xl text-xs">
              <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong className="text-amber-950 font-semibold block">Sincronización total con Firebase:</strong>
                Al cargar este archivo, se borrarán automáticamente los documentos anteriores de Firebase Firestore y se guardarán únicamente los datos de este nuevo archivo Excel.
              </div>
            </div>

            {/* Format specifications guide */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-700 block">Estructura requerida del archivo Excel:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <span className="font-semibold text-blue-700 block mb-1">Hoja 1: &quot;Lectura&quot;</span>
                  <p>• Columna A: <strong>Fecha</strong> (dd/mm/aaaa, fecha de corte)</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <span className="font-semibold text-emerald-700 block mb-1">Hoja 2: &quot;Agendas&quot;</span>
                  <p>• Col A: <strong>DPTO</strong> | Col B: <strong>CAPS</strong></p>
                  <p>• Col C: <strong>Fecha</strong> | Col D: <strong>Turno</strong></p>
                  <p>• Col E: <strong>Especialidad</strong> | Col F: <strong>Profesional</strong></p>
                  <p>• Col G: <strong>Turnos</strong> (número a sumar)</p>
                </div>
              </div>
            </div>

            {/* Upload Drop Zone */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/60'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileInputChange}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {isProcessing ? 'Procesando archivo...' : 'Haga clic para seleccionar o arrastre el archivo aquí'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Compatible con .xlsx y .xls (Excel)
              </p>
            </div>

            {/* Errors or Warnings */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Error al procesar el archivo:</span>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Advertencias:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Download sample template trigger */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
              <span>¿No tiene el archivo listo o desea probar?</span>
              <button
                type="button"
                onClick={onDownloadTemplate}
                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Descargar plantilla modelo (.xlsx)
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
