import React from 'react';
import { Bookmark, Calendar as CalendarIcon } from 'lucide-react';
import { MonthCalendarData } from '../types';
import { SPANISH_DAYS_SHORT } from '../utils/dateUtils';

interface TwoMonthCalendarProps {
  month1: MonthCalendarData;
  month2: MonthCalendarData;
  lecturaDateIso: string;
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
  onPrevMonths?: () => void;
  onNextMonths?: () => void;
  onResetToLecturaMonth?: () => void;
  isCustomOffset?: boolean;
  activeCanal?: string;
}

export const TwoMonthCalendar: React.FC<TwoMonthCalendarProps> = ({
  month1,
  month2,
  lecturaDateIso,
  selectedDate,
  onSelectDate,
  activeCanal = 'Todos',
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 sm:p-5 mb-5">
      
      {/* Unified Single-Line Header: Title + All References on the Same Line to minimize vertical space */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-2.5 mb-3 border-b border-slate-100">
        
        {/* Left: Title + Canal Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <CalendarIcon className="w-5 h-5 text-blue-600 shrink-0" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
            Calendarios de Agendas a 30 Días
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 whitespace-nowrap">
            Canal: {activeCanal}
          </span>
        </div>

        {/* Right / Inline: Referencias compactas en la misma línea */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap text-xs text-slate-600">
          <span className="font-bold text-slate-800 text-xs">Referencia:</span>

          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-black text-[10px] shadow-2xs">
              A: #
            </span>
            <span className="text-xs font-semibold text-amber-800">
              A: Asignados
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-emerald-300 font-black text-[10px] shadow-2xs">
              L: #
            </span>
            <span className="text-xs font-semibold text-emerald-800">
              L: Libres
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-white border border-slate-300 text-slate-400 font-mono text-[11px] flex items-center justify-center">
              —
            </span>
            <span className="text-xs text-slate-500">Sin turnos</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <Bookmark className="w-3 h-3 fill-amber-500 text-amber-600" />
            <span>Fecha de Lectura</span>
          </div>

          {selectedDate && (
            <button
              onClick={() => onSelectDate(null)}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline ml-1 cursor-pointer"
            >
              Quitar selección
            </button>
          )}
        </div>
      </div>

      {/* The Two Calendars Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        
        {/* Calendar 1: Mes de Lectura */}
        <SingleMonthCalendarView
          calendarData={month1}
          badgeLabel="Mes de Lectura"
          badgeColor="bg-blue-100 text-blue-800"
          lecturaDateIso={lecturaDateIso}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
        />

        {/* Calendar 2: Mes Siguiente */}
        <SingleMonthCalendarView
          calendarData={month2}
          badgeLabel="Mes Siguiente"
          badgeColor="bg-emerald-100 text-emerald-800"
          lecturaDateIso={lecturaDateIso}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
        />

      </div>
    </div>
  );
};

interface SingleMonthCalendarViewProps {
  calendarData: MonthCalendarData;
  badgeLabel: string;
  badgeColor: string;
  lecturaDateIso: string;
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
}

const SingleMonthCalendarView: React.FC<SingleMonthCalendarViewProps> = ({
  calendarData,
  badgeLabel,
  badgeColor,
  lecturaDateIso,
  selectedDate,
  onSelectDate,
}) => {
  return (
    <div className="flex flex-col bg-slate-50/50 rounded-xl p-3 sm:p-4 border border-slate-200/80">
      
      {/* Month Header Banner */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800 capitalize">
              {calendarData.monthName} {calendarData.year}
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
              {badgeLabel}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {calendarData.workingDaysWithTurnos} días con turnos
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Total Mes</span>
          <div className="flex items-center justify-end gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-slate-700">
              Total: {calendarData.totalTurnos.toLocaleString('es-AR')}
            </span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              A: {calendarData.totalAsignados?.toLocaleString('es-AR') || 0}
            </span>
            {/* L highlighted with greater size */}
            <span className="text-base sm:text-lg font-black text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-lg border-2 border-emerald-400 shadow-xs tracking-tight">
              L: {calendarData.totalLibres?.toLocaleString('es-AR') || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Days of week header (Lun - Dom) */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {SPANISH_DAYS_SHORT.map((dayName, idx) => (
          <div
            key={dayName}
            className={`text-[11px] font-bold py-1 ${
              idx >= 5 ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar Days Matrix */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 auto-rows-fr">
        {calendarData.days.map(day => {
          // If not part of current month, display an empty placeholder cell
          if (!day.isCurrentMonth) {
            return (
              <div
                key={day.dateStr}
                className="min-h-[68px] sm:min-h-[76px] p-1.5 sm:p-2 rounded-xl border border-transparent select-none pointer-events-none"
                aria-hidden="true"
              />
            );
          }

          const isSelected = selectedDate === day.dateStr;
          const isLectura = day.dateStr === lecturaDateIso;
          const hasTurnos = day.hasTurnos || day.totalTurnos > 0;

          // Color calculation: dark slate card with vivid A and L text if hasTurnos, white/slate if no turnos
          let cellStyle = '';
          if (hasTurnos) {
            cellStyle = 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-white shadow-xs';
          } else {
            cellStyle = 'bg-white border-slate-200/80 text-slate-400 hover:bg-slate-50 hover:border-slate-300';
          }

          if (isSelected) {
            cellStyle += ' ring-3 ring-blue-500 ring-offset-2 z-10';
          }

          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => onSelectDate(isSelected ? null : day.dateStr)}
              title={`Día ${day.dayNumber}: Asignados (A): ${day.turnosAsignados}, Libres (L): ${day.turnosLibres}, Total: ${day.totalTurnos}`}
              className={`relative flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl border text-center min-h-[68px] sm:min-h-[76px] transition-all cursor-pointer ${cellStyle}`}
            >
              {/* Day number (top-left) */}
              <span className={`absolute top-1 left-1.5 text-[11px] font-bold ${hasTurnos ? 'text-slate-300' : 'text-slate-600'}`}>
                {day.dayNumber}
              </span>

              {/* Lectura pin (top-right) */}
              {isLectura && (
                <span
                  title="Fecha de Lectura"
                  className="absolute top-1 right-1 flex items-center justify-center"
                >
                  <Bookmark className="w-3.5 h-3.5 fill-amber-400 text-amber-300 drop-shadow-xs" />
                </span>
              )}

              {/* Day contents: A: valor, L: valor with distinct colors */}
              {hasTurnos ? (
                <div className="flex flex-col items-center justify-center w-full pt-3">
                  <span className="text-[11px] sm:text-xs font-black tracking-tight leading-tight text-amber-300 drop-shadow-xs">
                    A: {day.turnosAsignados.toLocaleString('es-AR')}
                  </span>
                  <span className="text-[11px] sm:text-xs font-black tracking-tight leading-tight text-emerald-300 drop-shadow-xs">
                    L: {day.turnosLibres.toLocaleString('es-AR')}
                  </span>
                </div>
              ) : (
                <span className="text-xs sm:text-sm font-mono text-slate-300 leading-none pt-2">
                  —
                </span>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
};
