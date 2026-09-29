import React from 'react';
import { ChevronLeft, ChevronRight, Bookmark, Calendar as CalendarIcon } from 'lucide-react';
import { MonthCalendarData } from '../types';
import { SPANISH_DAYS_SHORT } from '../utils/dateUtils';

interface TwoMonthCalendarProps {
  month1: MonthCalendarData;
  month2: MonthCalendarData;
  lecturaDateIso: string;
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
  onPrevMonths: () => void;
  onNextMonths: () => void;
  onResetToLecturaMonth: () => void;
  isCustomOffset: boolean;
}

export const TwoMonthCalendar: React.FC<TwoMonthCalendarProps> = ({
  month1,
  month2,
  lecturaDateIso,
  selectedDate,
  onSelectDate,
  onPrevMonths,
  onNextMonths,
  onResetToLecturaMonth,
  isCustomOffset,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 mb-6">
      
      {/* Calendar Header with Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Calendarios de Agendas Futuras
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Suma de turnos diarios (Col. G) para el mes de corte de Lectura y el mes siguiente. Haga clic en cualquier día para ver el detalle.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isCustomOffset && (
            <button
              id="btn-reset-lectura-month"
              onClick={onResetToLecturaMonth}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Ir a Mes de Lectura
            </button>
          )}

          <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              id="btn-prev-months"
              onClick={onPrevMonths}
              title="Meses anteriores"
              className="p-1.5 rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition-colors shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-slate-200 mx-0.5" />
            <button
              id="btn-next-months"
              onClick={onNextMonths}
              title="Meses siguientes"
              className="p-1.5 rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition-colors shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend & Hint */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 pb-3 mb-4 border-b border-slate-100/80">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="font-bold text-slate-800">Referencia:</span>
          
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-blue-600 border border-blue-700 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
              #
            </span>
            <span className="text-xs font-semibold text-slate-700">
              Cantidad de turnos
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-400 font-mono text-xs flex items-center justify-center">
              —
            </span>
            <span className="text-xs text-slate-500">Sin turnos</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <Bookmark className="w-3 h-3 fill-amber-500 text-amber-600" />
            Fecha de Lectura
          </span>
          {selectedDate && (
            <button
              onClick={() => onSelectDate(null)}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline ml-2 cursor-pointer"
            >
              Deseleccionar día
            </button>
          )}
        </div>
      </div>

      {/* The Two Calendars Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Mes</span>
          <div>
            <span className="text-lg font-black text-slate-900 tracking-tight">
              {calendarData.totalTurnos.toLocaleString('es-AR')}
            </span>
            <span className="text-xs font-black text-slate-700 ml-1">T</span>
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
                className="min-h-[64px] sm:min-h-[72px] p-1.5 sm:p-2 rounded-xl border border-transparent select-none pointer-events-none"
                aria-hidden="true"
              />
            );
          }

          const isSelected = selectedDate === day.dateStr;
          const isLectura = day.dateStr === lecturaDateIso;
          const hasTurnos = day.hasTurnos || day.totalTurnos > 0;

          // Color calculation: intense color if hasTurnos, white/slate if no turnos
          let cellStyle = '';
          if (hasTurnos) {
            cellStyle = 'bg-blue-600 hover:bg-blue-700 border-blue-700 text-white shadow-xs';
          } else {
            cellStyle = 'bg-white border-slate-200/80 text-slate-400 hover:bg-slate-50 hover:border-slate-300';
          }

          if (isSelected) {
            cellStyle += ' ring-3 ring-amber-400 ring-offset-2 z-10';
          }

          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => onSelectDate(isSelected ? null : day.dateStr)}
              className={`relative flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border text-center min-h-[64px] sm:min-h-[72px] transition-all cursor-pointer ${cellStyle}`}
            >
              {/* Day number (top-left) */}
              <span className={`absolute top-1.5 left-2 text-xs font-bold ${hasTurnos ? 'text-white' : 'text-slate-600'}`}>
                {day.dayNumber}
              </span>

              {/* Lectura pin (top-right) */}
              {isLectura && (
                <span
                  title="Fecha de Lectura"
                  className="absolute top-1.5 right-1.5 flex items-center justify-center"
                >
                  <Bookmark className="w-3.5 h-3.5 fill-amber-400 text-amber-300 drop-shadow-xs" />
                </span>
              )}

              {/* Middle and centered: quantity of turnos if has turnos, or — if no turnos */}
              {hasTurnos ? (
                <span className="text-sm sm:text-base font-black tracking-tight leading-none text-white drop-shadow-xs">
                  {day.totalTurnos.toLocaleString('es-AR')}
                </span>
              ) : (
                <span className="text-xs sm:text-sm font-mono text-slate-300 leading-none">
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
