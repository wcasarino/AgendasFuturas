import React, { useState } from 'react';
import {
  X,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Users,
  Database,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  // The permanent preview / shared URL for this application
  const sharedUrl = 'https://ais-pre-vkozpb2x5uf6r3vhvfzrj5-52778677634.us-east1.run.app';

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sharedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Publicación y Acceso Web
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  En línea
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Comparte este enlace para que cualquier persona acceda desde internet
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

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700">

          {/* Link box */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Enlace público directo (URL de la aplicación)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-800 break-all select-all flex items-center justify-between gap-2">
                <span className="truncate">{sharedUrl}</span>
                <span className="shrink-0 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-sans font-semibold">
                  HTTPS
                </span>
              </div>
              <button
                id="btn-copy-shared-url"
                onClick={handleCopy}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
              </button>
              <a
                href={sharedUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                title="Abrir en nueva pestaña"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Features cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-slate-800 text-xs">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Acceso Multi-usuario</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Cualquier persona con el enlace puede ingresar desde computadoras, tablets o teléfonos sin necesidad de instalar nada.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-slate-800 text-xs">
                <Database className="w-4 h-4 text-amber-600" />
                <span>Firebase Sincronizado</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Cuando subas un nuevo archivo Excel, se borran los datos anteriores y todos los usuarios verán los nuevos datos actualizados en tiempo real.
              </p>
            </div>
          </div>

          {/* Security note */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1 text-amber-900">
              <span className="font-bold text-xs block">Seguridad para Carga de Datos</span>
              <p className="text-[11px] leading-relaxed">
                La visualización de turnos y calendarios es abierta para consulta de los empleados. La carga de nuevos archivos Excel y actualización en Firebase está protegida por la clave de seguridad del administrador.
              </p>
            </div>
          </div>

          {/* Deploy options in AI Studio */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/60 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-blue-900 text-xs">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Opciones adicionales de despliegue</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              En el menú superior de Google AI Studio, puedes hacer clic en <strong>Share</strong> para gestionar permisos o en <strong>Deploy to Cloud Run</strong> para asociar un dominio personalizado si lo deseas.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
