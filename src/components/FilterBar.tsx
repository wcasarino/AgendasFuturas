import React from 'react';
import { Filter, X, RotateCcw, Building2, Hospital, Radio, Stethoscope, UserCheck, CheckSquare } from 'lucide-react';
import { AgendaItem, FilterState } from '../types';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  allAgendas: AgendaItem[];
  filteredAgendasCount: number;
  totalFilteredTurnos: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  allAgendas,
  filteredAgendasCount,
  totalFilteredTurnos,
}) => {
  // Helper to filter agendas with current filters, ignoring specified keys
  const getFiltered = React.useCallback(
    (ignoredKeys: (keyof FilterState)[] = []): AgendaItem[] => {
      return allAgendas.filter(item => {
        if (!ignoredKeys.includes('dpto') && filters.dpto && item.dpto !== filters.dpto) {
          return false;
        }
        if (!ignoredKeys.includes('caps') && filters.caps && item.caps !== filters.caps) {
          return false;
        }
        if (
          !ignoredKeys.includes('especialidad') &&
          filters.especialidad &&
          item.especialidad !== filters.especialidad
        ) {
          return false;
        }
        if (
          !ignoredKeys.includes('profesional') &&
          filters.profesional &&
          item.profesional !== filters.profesional
        ) {
          return false;
        }
        return true;
      });
    },
    [allAgendas, filters]
  );

  // Extract unique sorted options from matching agendas in cascade
  // DPTO: Shows all DPTOs matching active filters
  const dptos = React.useMemo(() => {
    const matching = getFiltered(['dpto', 'caps']);
    const set = new Set<string>();
    matching.forEach(a => a.dpto && set.add(a.dpto));
    return Array.from(set).sort();
  }, [getFiltered]);

  // CAPS: Dynamically filtered by DPTO, Especialidad, Profesional
  const capsList = React.useMemo(() => {
    const matching = getFiltered(['caps']);
    const set = new Set<string>();
    matching.forEach(a => a.caps && set.add(a.caps));
    return Array.from(set).sort();
  }, [getFiltered]);

  // Especialidad: Dynamically filtered by DPTO, CAPS, Profesional
  const especialidades = React.useMemo(() => {
    const matching = getFiltered(['especialidad']);
    const set = new Set<string>();
    matching.forEach(a => a.especialidad && set.add(a.especialidad));
    return Array.from(set).sort();
  }, [getFiltered]);

  // Profesional: Dynamically filtered by DPTO, CAPS, Especialidad
  const profesionales = React.useMemo(() => {
    const matching = getFiltered(['profesional']);
    const set = new Set<string>();
    matching.forEach(a => a.profesional && set.add(a.profesional));
    return Array.from(set).sort();
  }, [getFiltered]);

  // Handle filter changes with intelligent cascade cleanup
  const handleSelectChange = (newPartial: Partial<FilterState>) => {
    const merged: FilterState = { ...filters, ...newPartial };

    // 1. If DPTO was changed
    if ('dpto' in newPartial) {
      if (merged.caps) {
        const capsStillValid = allAgendas.some(
          a => (!merged.dpto || a.dpto === merged.dpto) && a.caps === merged.caps
        );
        if (!capsStillValid) {
          merged.caps = '';
        }
      }
    }

    // 2. If CAPS was changed and selected, infer DPTO if not already set
    if ('caps' in newPartial && newPartial.caps) {
      if (!merged.dpto) {
        const matched = allAgendas.find(a => a.caps === newPartial.caps);
        if (matched?.dpto) {
          merged.dpto = matched.dpto;
        }
      }
    }

    // 3. Check if 'profesional' is still valid with the new filter combinations
    if (merged.profesional && !('profesional' in newPartial)) {
      const stillValid = allAgendas.some(
        a =>
          (!merged.dpto || a.dpto === merged.dpto) &&
          (!merged.caps || a.caps === merged.caps) &&
          (!merged.especialidad || a.especialidad === merged.especialidad) &&
          a.profesional === merged.profesional
      );
      if (!stillValid) {
        merged.profesional = '';
      }
    }

    // 4. Check if 'especialidad' is still valid with the new filter combinations
    if (merged.especialidad && !('especialidad' in newPartial)) {
      const stillValid = allAgendas.some(
        a =>
          (!merged.dpto || a.dpto === merged.dpto) &&
          (!merged.caps || a.caps === merged.caps) &&
          (!merged.profesional || a.profesional === merged.profesional) &&
          a.especialidad === merged.especialidad
      );
      if (!stillValid) {
        merged.especialidad = '';
      }
    }

    // 5. If CANAL was changed and is not eligible for 'Incluye Todos', turn off incluyeTodos
    if ('canal' in newPartial) {
      const isNewEligible = ['Sólo H.', 'Solo H.', 'Bot', 'Call'].includes(newPartial.canal || '');
      if (!isNewEligible) {
        merged.incluyeTodos = false;
      }
    }

    onFilterChange(merged);
  };

  const isEligibleCanal = ['Sólo H.', 'Solo H.', 'Bot', 'Call'].includes(filters.canal || '');

  const activeCount = [
    filters.dpto,
    filters.caps,
    filters.canal && filters.canal !== 'Sólo H.' ? filters.canal : '',
    filters.incluyeTodos && isEligibleCanal ? 'incluyeTodos' : '',
    filters.especialidad,
    filters.profesional,
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 mb-6">
      
      {/* Top Bar inside Filters: Title & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <Filter className="w-4 h-4" />
          </span>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            Filtros Interactivos
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            (Actualiza automáticamente el almanaque y las estadísticas)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              <span>{activeCount} activo{activeCount > 1 ? 's' : ''}</span>
            </span>
          )}
          {activeCount > 0 && (
            <button
              id="btn-clear-filters"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Select Controls Grid with MODALIDAD at half width (0.5fr) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_0.5fr_1fr_1fr] gap-2.5 sm:gap-3">
        
        {/* DPTO */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-400" />
            <span>DPTO</span>
          </label>
          <select
            id="filter-dpto"
            value={filters.dpto}
            onChange={e => handleSelectChange({ dpto: e.target.value })}
            className={`w-full text-xs rounded-lg border px-2.5 py-2 transition-all outline-hidden ${
              filters.dpto
                ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-semibold'
                : 'border-slate-300 bg-slate-50/50 text-slate-700 hover:border-slate-400'
            }`}
          >
            <option value="">Todos los DPTOs ({dptos.length})</option>
            {dptos.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* CAPS */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Hospital className="w-3 h-3 text-slate-400" />
            <span>CAPS</span>
          </label>
          <select
            id="filter-caps"
            value={filters.caps}
            onChange={e => handleSelectChange({ caps: e.target.value })}
            className={`w-full text-xs rounded-lg border px-2.5 py-2 transition-all outline-hidden ${
              filters.caps
                ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-semibold'
                : 'border-slate-300 bg-slate-50/50 text-slate-700 hover:border-slate-400'
            }`}
          >
            <option value="">
              {capsList.length === 0
                ? 'Sin CAPS disponibles'
                : filters.dpto
                ? `Todos los CAPS de ${filters.dpto} (${capsList.length})`
                : `Todos los CAPS (${capsList.length})`}
            </option>
            {capsList.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* CANAL (Reemplaza a Turno) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Radio className="w-3 h-3 text-blue-500" />
            <span>CANAL</span>
          </label>
          <select
            id="filter-canal"
            value={filters.canal || 'Sólo H.'}
            onChange={e => handleSelectChange({ canal: e.target.value })}
            className="w-full text-xs rounded-lg border border-blue-500 bg-blue-50/60 text-blue-950 font-bold px-2.5 py-2 transition-all outline-hidden cursor-pointer hover:bg-blue-50"
          >
            <option value="Sólo H.">Sólo H.</option>
            <option value="Bot">Bot</option>
            <option value="Call">Call</option>
            <option value="Todos">Todos</option>
            <option value="Todos los Canales">Todos los Canales (Suma Total)</option>
          </select>
        </div>

        {/* Casilla de verificación: Incluye Todos (Mitad de ancho 0.5fr) */}
        <div className="min-w-0">
          <label
            className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1 truncate"
            title="MODALIDAD"
          >
            <CheckSquare className={`w-3 h-3 shrink-0 ${isEligibleCanal ? 'text-blue-500' : 'text-slate-400'}`} />
            <span className="truncate">MODALIDAD</span>
          </label>
          <div
            onClick={() => {
              if (isEligibleCanal) {
                handleSelectChange({ incluyeTodos: !filters.incluyeTodos });
              }
            }}
            title={
              !isEligibleCanal
                ? 'Disponible solo para los canales Sólo H., Bot o Call'
                : 'Suma los turnos Asignados y Libres del canal Todos a este canal'
            }
            className={`flex items-center justify-center gap-1.5 h-[38px] px-1.5 sm:px-2 rounded-lg border transition-all ${
              !isEligibleCanal
                ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed select-none'
                : filters.incluyeTodos
                ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-bold shadow-2xs cursor-pointer'
                : 'border-slate-300 bg-slate-50/50 text-slate-700 hover:border-slate-400 cursor-pointer'
            }`}
          >
            <input
              type="checkbox"
              id="filter-incluye-todos"
              disabled={!isEligibleCanal}
              checked={Boolean(isEligibleCanal && filters.incluyeTodos)}
              onChange={e => handleSelectChange({ incluyeTodos: e.target.checked })}
              onClick={e => e.stopPropagation()}
              className={`w-3.5 h-3.5 shrink-0 rounded text-blue-600 focus:ring-blue-500 border-slate-300 ${
                !isEligibleCanal ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
              }`}
            />
            <label
              htmlFor="filter-incluye-todos"
              onClick={e => e.stopPropagation()}
              className={`text-[10.5px] leading-[1.1] font-bold select-none cursor-pointer flex flex-col justify-center ${
                !isEligibleCanal
                  ? 'cursor-not-allowed text-slate-400'
                  : filters.incluyeTodos
                  ? 'text-blue-950'
                  : 'text-slate-700'
              }`}
            >
              <span>Incluye</span>
              <span className={filters.incluyeTodos && isEligibleCanal ? 'text-blue-600' : 'text-slate-500 font-semibold'}>Todos</span>
            </label>
          </div>
        </div>

        {/* Especialidad */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Stethoscope className="w-3 h-3 text-slate-400" />
            <span>Especialidad</span>
          </label>
          <select
            id="filter-especialidad"
            value={filters.especialidad}
            onChange={e => handleSelectChange({ especialidad: e.target.value })}
            className={`w-full text-xs rounded-lg border px-2.5 py-2 transition-all outline-hidden ${
              filters.especialidad
                ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-semibold'
                : 'border-slate-300 bg-slate-50/50 text-slate-700 hover:border-slate-400'
            }`}
          >
            <option value="">
              {especialidades.length === 0
                ? 'Sin especialidades'
                : filters.caps
                ? `Especialidades en CAPS (${especialidades.length})`
                : filters.dpto
                ? `Especialidades en ${filters.dpto} (${especialidades.length})`
                : `Todas las Especialidades (${especialidades.length})`}
            </option>
            {especialidades.map(esp => (
              <option key={esp} value={esp}>
                {esp}
              </option>
            ))}
          </select>
        </div>

        {/* Profesional */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-slate-400" />
            <span>Profesional</span>
          </label>
          <select
            id="filter-profesional"
            value={filters.profesional}
            onChange={e => handleSelectChange({ profesional: e.target.value })}
            className={`w-full text-xs rounded-lg border px-2.5 py-2 transition-all outline-hidden ${
              filters.profesional
                ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-semibold'
                : 'border-slate-300 bg-slate-50/50 text-slate-700 hover:border-slate-400'
            }`}
          >
            <option value="">
              {profesionales.length === 0
                ? 'Sin profesionales'
                : filters.especialidad
                ? `Profesionales (${profesionales.length})`
                : `Todos los Profesionales (${profesionales.length})`}
            </option>
            {profesionales.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Quick Filter Badges for quick removal */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400 py-0.5">Filtros aplicados:</span>
          {filters.dpto && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
              DPTO: <strong>{filters.dpto}</strong>
              <button onClick={() => handleSelectChange({ dpto: '' })} className="hover:text-red-500 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.caps && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
              CAPS: <strong>{filters.caps}</strong>
              <button onClick={() => handleSelectChange({ caps: '' })} className="hover:text-red-500 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.canal && filters.canal !== 'Todos' && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-medium">
              CANAL: <strong>{filters.canal}</strong>
              <button onClick={() => handleSelectChange({ canal: 'Todos' })} className="hover:text-red-500 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.especialidad && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
              Especialidad: <strong>{filters.especialidad}</strong>
              <button onClick={() => handleSelectChange({ especialidad: '' })} className="hover:text-red-500 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.profesional && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
              Profesional: <strong>{filters.profesional}</strong>
              <button onClick={() => handleSelectChange({ profesional: '' })} className="hover:text-red-500 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

    </div>
  );
};
