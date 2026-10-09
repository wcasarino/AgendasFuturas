import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { TwoMonthCalendar } from './components/TwoMonthCalendar';
import { DayDetailView } from './components/DayDetailView';
import { FileUploadModal } from './components/FileUploadModal';
import { ExportModal } from './components/ExportModal';
import { FirebaseModal } from './components/FirebaseModal';
import { ShareModal } from './components/ShareModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { PasswordAuthModal } from './components/PasswordAuthModal';
import { AgendaItem, FilterState, LecturaData, MonthCalendarData, DayAggregation } from './types';
import { generateSampleDataset } from './utils/sampleData';
import { buildMonthCalendarGrid, SPANISH_MONTHS, getNextMonth, getPrevMonth } from './utils/dateUtils';
import { downloadSampleExcel, ParseResult } from './utils/excelParser';
import {
  saveExcelSheetsToFirebase,
  loadDatasetToPCMemory,
  subscribeToFirebaseSyncUpdates,
  validateFirebaseConnection,
} from './services/firebaseService';
import {
  fetchGoogleSheetData,
  getLastGoogleSheetFetchTime,
  getSavedSpreadsheetUrl,
} from './services/googleSheetsService';
import { getLocalCachedVersion } from './utils/localCache';
import { CheckCircle2, Info, X } from 'lucide-react';

export default function App() {
  // Initialize with realistic sample dataset
  const initialData = useMemo(() => generateSampleDataset(), []);

  const [lectura, setLectura] = useState<LecturaData>(initialData.lectura);
  const [allAgendas, setAllAgendas] = useState<AgendaItem[]>(initialData.agendas);
  const [activeFileName, setActiveFileName] = useState<string>('Google Sheets (link.txt)');
  const [isCustomFile, setIsCustomFile] = useState(true);
  const [currentSyncVersion, setCurrentSyncVersion] = useState<string | null>(null);

  // Google Sheets state
  const [isFetchingGoogleSheet, setIsFetchingGoogleSheet] = useState(false);
  const [lastGoogleSheetSync, setLastGoogleSheetSync] = useState<string | null>(getLastGoogleSheetFetchTime());
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    dpto: '',
    caps: '',
    canal: 'Sólo H.',
    incluyeTodos: false,
    especialidad: '',
    profesional: '',
    search: '',
  });

  // Selected date for day drilldown (YYYY-MM-DD) - starts on the Lectura date
  const [selectedDate, setSelectedDate] = useState<string | null>(initialData.lectura.fecha);

  // Month offset relative to Lectura date (0 = Lectura month + next month)
  const [monthOffset, setMonthOffset] = useState<number>(0);

  // Admin Password Protection State ('Walter')
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('agendas_admin_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingAuthAction, setPendingAuthAction] = useState<{
    action: () => void;
    title: string;
    description: string;
  } | null>(null);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [lastFirebaseSync, setLastFirebaseSync] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Al iniciar la aplicación: obtener SIEMPRE los datos en vivo desde Google Sheet (link.txt)
  useEffect(() => {
    let isMounted = true;
    setIsFetchingGoogleSheet(true);

    fetchGoogleSheetData()
      .then(res => {
        if (!isMounted) return;
        if (res.success && res.lectura && res.agendas && res.agendas.length > 0) {
          setLectura(res.lectura);
          setAllAgendas(res.agendas);
          setActiveFileName('Google Sheets (link.txt)');
          setIsCustomFile(true);
          setSelectedDate(res.lectura.fecha);
          setLastGoogleSheetSync(res.fetchedAt || null);

          setNotification({
            type: 'success',
            message: `¡Tablero conectado a Google Sheet en vivo! Se cargaron ${res.agendas.length} agendas y ${res.totalTurnos} turnos (Fecha corte: ${res.lectura.fechaOriginal}).`,
          });
        } else {
          // Si no hay conexión a internet, intentar cargar desde la memoria local (IndexedDB)
          loadDatasetToPCMemory().then(localRes => {
            if (!isMounted) return;
            if (localRes.success && localRes.lectura && localRes.agendas) {
              setLectura(localRes.lectura);
              setAllAgendas(localRes.agendas);
              setSelectedDate(localRes.lectura.fecha);
              setNotification({
                type: 'info',
                message: `Cargado desde la memoria de la PC (${localRes.agendas.length} agendas). Revisa tu conexión para sincronizar Google Sheets.`,
              });
            }
          });
        }
      })
      .catch(err => {
        console.warn('Initial Google Sheet fetch error:', err);
      })
      .finally(() => {
        if (isMounted) setIsFetchingGoogleSheet(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Actualizar manualmente los datos desde Google Sheets
  const handleRefreshGoogleSheet = async () => {
    setIsFetchingGoogleSheet(true);
    try {
      const res = await fetchGoogleSheetData();
      if (res.success && res.lectura && res.agendas) {
        setLectura(res.lectura);
        setAllAgendas(res.agendas);
        setActiveFileName('Google Sheets (link.txt)');
        setIsCustomFile(true);
        setMonthOffset(0);
        setSelectedDate(res.lectura.fecha);
        setLastGoogleSheetSync(res.fetchedAt || null);
        setNotification({
          type: 'success',
          message: `¡Datos actualizados desde Google Sheet! ${res.agendas.length} agendas y ${res.totalTurnos} turnos cargados.`,
        });
      } else {
        setNotification({
          type: 'info',
          message: res.error || 'No se pudo actualizar desde Google Sheet.',
        });
      }
    } finally {
      setIsFetchingGoogleSheet(false);
    }
  };

  // Handle uploaded file: Borra previas colecciones y graba en 'Lectura' y 'Agendas'
  const handleFileLoaded = (result: ParseResult) => {
    if (result.lectura && result.agendas) {
      const uploadedLectura = result.lectura;
      const uploadedAgendas = result.agendas;
      const uploadedFileName = result.fileName || 'AGENDAS A 30 DÍAS.xlsx';

      // Actualizar memoria local en pantalla de inmediato
      setLectura(uploadedLectura);
      setAllAgendas(uploadedAgendas);
      setActiveFileName(uploadedFileName);
      setIsCustomFile(true);
      setMonthOffset(0);
      setSelectedDate(uploadedLectura.fecha);
      setFilters({
        dpto: '',
        caps: '',
        canal: 'Sólo H.',
        incluyeTodos: false,
        especialidad: '',
        profesional: '',
        search: '',
      });

      // Grabar en Firebase: Borra colecciones previas y crea un doc por fila en Lectura y Agendas
      setIsSyncingFirebase(true);
      saveExcelSheetsToFirebase({
        sheetLecturaName: result.sheetLecturaName || 'Lectura',
        sheetAgendasName: result.sheetAgendasName || 'Agendas',
        lectura: uploadedLectura,
        agendas: uploadedAgendas,
        lecturaRows: result.lecturaRows,
        fileName: uploadedFileName,
      })
        .then(syncRes => {
          const time = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
          if (syncRes.success) {
            setLastFirebaseSync(time);
            if (syncRes.version) setCurrentSyncVersion(syncRes.version);
            setNotification({
              type: 'success',
              message: `¡Base de datos actualizada! Se borraron los documentos anteriores y se grabaron en Firebase: ${syncRes.savedLecturaCount} docs en 'Lectura' y ${syncRes.savedAgendasCount} docs en 'Agendas'.`,
            });
          } else {
            setNotification({
              type: 'info',
              message: `Archivo cargado (${uploadedAgendas.length} registros). Nota Firebase: ${syncRes.message}`,
            });
          }
        })
        .finally(() => {
          setIsSyncingFirebase(false);
        });
    }
  };

  // Quick sync current data with Firebase
  const handleQuickSyncFirebase = async () => {
    setIsSyncingFirebase(true);
    try {
      const res = await saveExcelSheetsToFirebase({
        lectura,
        agendas: allAgendas,
        fileName: activeFileName,
      });
      const time = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      if (res.success) {
        setLastFirebaseSync(time);
        if (res.version) setCurrentSyncVersion(res.version);
        setNotification({
          type: 'success',
          message: `¡Sincronizado con Firebase Firestore (${time})! Colecciones 'Lectura' y 'Agendas' guardadas.`,
        });
      } else {
        setNotification({
          type: 'info',
          message: res.message,
        });
      }
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  // Handle data loaded directly from Firebase modal
  const handleDataLoadedFromFirebase = (data: { lectura: LecturaData; agendas: AgendaItem[]; fileName: string }) => {
    setLectura(data.lectura);
    setAllAgendas(data.agendas);
    setActiveFileName(data.fileName);
    setIsCustomFile(true);
    setMonthOffset(0);
    setSelectedDate(data.lectura.fecha);
    const time = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    setLastFirebaseSync(time);
  };

  // Reset to initial sample dataset
  const handleResetToSample = () => {
    const fresh = generateSampleDataset();
    setLectura(fresh.lectura);
    setAllAgendas(fresh.agendas);
    setActiveFileName('AGENDAS A 30 DÍAS.xlsx (Plantilla Activa)');
    setIsCustomFile(false);
    setMonthOffset(0);
    setSelectedDate(fresh.lectura.fecha);
    setFilters({
      dpto: '',
      caps: '',
      canal: 'Sólo H.',
      incluyeTodos: false,
      especialidad: '',
      profesional: '',
      search: '',
    });
    setNotification({
      type: 'info',
      message: 'Se han restaurado los datos de ejemplo predeterminados.',
    });
  };

  // Authorization helper: ensures 'Walter' password is required for protected actions
  const executeWithAuth = (action: () => void, title: string, description: string) => {
    if (isAdminAuthenticated) {
      action();
    } else {
      setPendingAuthAction({ action, title, description });
      setIsPasswordModalOpen(true);
    }
  };

  const handlePasswordAuthSuccess = () => {
    setIsAdminAuthenticated(true);
    try {
      sessionStorage.setItem('agendas_admin_auth', 'true');
    } catch {
      // ignore
    }
    if (pendingAuthAction) {
      pendingAuthAction.action();
      setPendingAuthAction(null);
    }
    setNotification({
      type: 'success',
      message: 'Acceso autorizado como administrador (Walter).',
    });
  };

  const handleLockAdmin = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem('agendas_admin_auth');
    } catch {
      // ignore
    }
    setNotification({
      type: 'info',
      message: 'Modo administrador bloqueado. Las opciones protegidas volverán a requerir contraseña.',
    });
  };

  // Protected Action 1: Abrir Planilla en Google Drive
  const handleOpenSpreadsheetProtected = () => {
    executeWithAuth(
      () => {
        const url = getSavedSpreadsheetUrl();
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      'Abrir Planilla Google Sheets',
      'Ingrese la contraseña de administrador para abrir y visualizar la planilla de Google Sheets.'
    );
  };

  // Protected Action 2: Configuración del Google Sheet
  const handleOpenConfigProtected = () => {
    executeWithAuth(
      () => {
        setIsGoogleSheetsModalOpen(true);
      },
      'Configuración de Google Sheets',
      'Ingrese la contraseña de administrador para acceder a la configuración del enlace de Google Sheets.'
    );
  };

  // Protected Action 3: Subir archivo Excel alternativo
  const handleOpenUploadProtected = () => {
    executeWithAuth(
      () => {
        setIsUploadModalOpen(true);
      },
      'Subir Archivo Excel',
      'Ingrese la contraseña de administrador para cargar un archivo Excel alternativo.'
    );
  };

  const handleDownloadTemplate = () => {
    downloadSampleExcel(lectura, allAgendas, 'AGENDAS A 30 DÍAS.xlsx');
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      dpto: '',
      caps: '',
      canal: 'Sólo H.',
      incluyeTodos: false,
      especialidad: '',
      profesional: '',
      search: '',
    });
  };

  // Helper to extract turnos for an item according to the active Canal and optional incluyeTodos
  const getTurnosByCanal = (item: AgendaItem, canal: string, incluyeTodos = false): number => {
    const isEligible = ['Sólo H.', 'Solo H.', 'Bot', 'Call'].includes(canal);
    const addTodos = isEligible && incluyeTodos ? (item.todos ?? 0) : 0;

    switch (canal) {
      case 'Sólo H.':
      case 'Solo H.':
        return (item.soloH ?? 0) + addTodos;
      case 'Bot':
        return (item.bot ?? 0) + addTodos;
      case 'Call':
        return (item.call ?? 0) + addTodos;
      case 'Todos los Canales':
        return (item.todos ?? 0) + (item.soloH ?? 0) + (item.bot ?? 0) + (item.call ?? 0);
      case 'Todos':
      default:
        return item.todos ?? 0;
    }
  };

  // Filter agendas according to active filters (Search filter removed, Turno replaced by Canal)
  // Only keeps rows that have turnos > 0 in the corresponding CANAL
  const filteredAgendas = useMemo(() => {
    return allAgendas
      .filter(item => {
        if (filters.dpto && item.dpto !== filters.dpto) return false;
        if (filters.caps && item.caps !== filters.caps) return false;
        if (filters.especialidad && item.especialidad !== filters.especialidad) return false;
        if (filters.profesional && item.profesional !== filters.profesional) return false;
        return true;
      })
      .map(item => ({
        ...item,
        turnos: getTurnosByCanal(item, filters.canal || 'Sólo H.', filters.incluyeTodos),
      }))
      .filter(item => item.turnos > 0);
  }, [allAgendas, filters.dpto, filters.caps, filters.canal, filters.incluyeTodos, filters.especialidad, filters.profesional]);

  // Aggregate turnos by date string from filteredAgendas (calendar reacts to active filters)
  const turnosByDateMap = useMemo(() => {
    const map = new Map<string, {
      total: number;
      turnosAsignados: number;
      turnosLibres: number;
      byCanal: Record<string, number>;
      byEspecialidad: Record<string, number>;
      byCaps: Record<string, number>;
      items: AgendaItem[];
    }>();

    filteredAgendas.forEach(item => {
      let agg = map.get(item.fecha);
      if (!agg) {
        agg = {
          total: 0,
          turnosAsignados: 0,
          turnosLibres: 0,
          byCanal: {},
          byEspecialidad: {},
          byCaps: {},
          items: [],
        };
        map.set(item.fecha, agg);
      }
      agg.total += item.turnos;

      const estadoNorm = (item.estado || '').toLowerCase().trim();
      if (estadoNorm.includes('asig')) {
        agg.turnosAsignados += item.turnos;
      } else {
        // 'Libre'
        agg.turnosLibres += item.turnos;
      }

      agg.byEspecialidad[item.especialidad] = (agg.byEspecialidad[item.especialidad] || 0) + item.turnos;
      agg.byCaps[item.caps] = (agg.byCaps[item.caps] || 0) + item.turnos;
      agg.items.push(item);
    });

    return map;
  }, [filteredAgendas]);

  // Calculate year and month for Month 1 (base from Lectura date + offset)
  const { year1, month1Idx } = useMemo(() => {
    let y: number;
    let m: number;
    if (lectura.fecha && /^\d{4}-\d{2}-\d{2}$/.test(lectura.fecha)) {
      const parts = lectura.fecha.split('-');
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
    } else {
      const d = new Date(lectura.dateObj);
      y = d.getFullYear();
      m = d.getMonth();
    }
    const totalMonths = y * 12 + m + monthOffset;
    const resYear = Math.floor(totalMonths / 12);
    const resMonth = ((totalMonths % 12) + 12) % 12;
    return { year1: resYear, month1Idx: resMonth };
  }, [lectura.fecha, lectura.dateObj, monthOffset]);

  // Month 2 is the next month
  const { year: year2, month: month2Idx } = useMemo(() => {
    return getNextMonth(year1, month1Idx);
  }, [year1, month1Idx]);

  // Build Calendar Data for Month 1
  const month1Data: MonthCalendarData = useMemo(() => {
    const gridCells = buildMonthCalendarGrid(year1, month1Idx);
    let totalTurnos = 0;
    let totalAsignados = 0;
    let totalLibres = 0;
    let daysWithTurnos = 0;

    const days: DayAggregation[] = gridCells.map(cell => {
      const agg = turnosByDateMap.get(cell.dateStr);
      const cellTurnos = agg ? agg.total : 0;
      const cellAsignados = agg ? agg.turnosAsignados : 0;
      const cellLibres = agg ? agg.turnosLibres : 0;
      const hasTurnos = cellTurnos > 0;

      if (cell.isCurrentMonth && hasTurnos) {
        totalTurnos += cellTurnos;
        totalAsignados += cellAsignados;
        totalLibres += cellLibres;
        daysWithTurnos++;
      }

      return {
        dateStr: cell.dateStr,
        dateObj: cell.dateObj,
        dayNumber: cell.dayNumber,
        totalTurnos: cellTurnos,
        turnosAsignados: cellAsignados,
        turnosLibres: cellLibres,
        hasTurnos,
        isLecturaDate: cell.dateStr === lectura.fecha,
        isCurrentMonth: cell.isCurrentMonth,
        byCanal: agg ? agg.byCanal : {},
        byEspecialidad: agg ? agg.byEspecialidad : {},
        byCaps: agg ? agg.byCaps : {},
        items: agg ? agg.items : [],
      };
    });

    return {
      year: year1,
      month: month1Idx,
      monthName: SPANISH_MONTHS[month1Idx],
      yearMonthKey: `${year1}-${String(month1Idx + 1).padStart(2, '0')}`,
      days,
      totalTurnos,
      totalAsignados,
      totalLibres,
      workingDaysWithTurnos: daysWithTurnos,
    };
  }, [year1, month1Idx, turnosByDateMap, lectura.fecha]);

  // Build Calendar Data for Month 2
  const month2Data: MonthCalendarData = useMemo(() => {
    const gridCells = buildMonthCalendarGrid(year2, month2Idx);
    let totalTurnos = 0;
    let totalAsignados = 0;
    let totalLibres = 0;
    let daysWithTurnos = 0;

    const days: DayAggregation[] = gridCells.map(cell => {
      const agg = turnosByDateMap.get(cell.dateStr);
      const cellTurnos = agg ? agg.total : 0;
      const cellAsignados = agg ? agg.turnosAsignados : 0;
      const cellLibres = agg ? agg.turnosLibres : 0;
      const hasTurnos = cellTurnos > 0;

      if (cell.isCurrentMonth && hasTurnos) {
        totalTurnos += cellTurnos;
        totalAsignados += cellAsignados;
        totalLibres += cellLibres;
        daysWithTurnos++;
      }

      return {
        dateStr: cell.dateStr,
        dateObj: cell.dateObj,
        dayNumber: cell.dayNumber,
        totalTurnos: cellTurnos,
        turnosAsignados: cellAsignados,
        turnosLibres: cellLibres,
        hasTurnos,
        isLecturaDate: cell.dateStr === lectura.fecha,
        isCurrentMonth: cell.isCurrentMonth,
        byCanal: agg ? agg.byCanal : {},
        byEspecialidad: agg ? agg.byEspecialidad : {},
        byCaps: agg ? agg.byCaps : {},
        items: agg ? agg.items : [],
      };
    });

    return {
      year: year2,
      month: month2Idx,
      monthName: SPANISH_MONTHS[month2Idx],
      yearMonthKey: `${year2}-${String(month2Idx + 1).padStart(2, '0')}`,
      days,
      totalTurnos,
      totalAsignados,
      totalLibres,
      workingDaysWithTurnos: daysWithTurnos,
    };
  }, [year2, month2Idx, turnosByDateMap, lectura.fecha]);

  // Total summary metrics
  const totalFilteredTurnos = useMemo(() => {
    return filteredAgendas.reduce((acc, curr) => acc + curr.turnos, 0);
  }, [filteredAgendas]);

  const totalRawTurnos = useMemo(() => {
    return allAgendas.reduce((acc, curr) => acc + curr.turnos, 0);
  }, [allAgendas]);

  // Selected day items
  const selectedDayItems = useMemo(() => {
    if (!selectedDate) return [];
    return filteredAgendas.filter(a => a.fecha === selectedDate);
  }, [filteredAgendas, selectedDate]);

  // All items on selected date (regardless of filters)
  const selectedAllDayItems = useMemo(() => {
    if (!selectedDate) return [];
    return allAgendas.filter(a => a.fecha === selectedDate);
  }, [allAgendas, selectedDate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* Global Header */}
      <Header
        lectura={lectura}
        totalFilteredTurnos={totalFilteredTurnos}
        totalRawTurnos={totalRawTurnos}
        onOpenExport={() => setIsExportModalOpen(true)}
        onRefreshGoogleSheet={handleRefreshGoogleSheet}
        isFetchingGoogleSheet={isFetchingGoogleSheet}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Toast / Notification Banner */}
        {notification && (
          <div
            className={`mb-5 p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in slide-in-from-top-2 duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filter Controls Bar */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          allAgendas={allAgendas}
          filteredAgendasCount={filteredAgendas.length}
          totalFilteredTurnos={totalFilteredTurnos}
        />

        {/* Two-Month Calendars View */}
        <TwoMonthCalendar
          month1={month1Data}
          month2={month2Data}
          lecturaDateIso={lectura.fecha}
          selectedDate={selectedDate}
          onSelectDate={dateStr => {
            setSelectedDate(dateStr);
            if (dateStr) {
              // Smooth scroll to detail table
              const el = document.getElementById('day-detail-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          onPrevMonths={() => setMonthOffset(prev => prev - 2)}
          onNextMonths={() => setMonthOffset(prev => prev + 2)}
          onResetToLecturaMonth={() => {
            setMonthOffset(0);
            setSelectedDate(lectura.fecha);
          }}
          isCustomOffset={monthOffset !== 0}
          activeCanal={`${filters.canal || 'Sólo H.'}${
            filters.incluyeTodos && ['Sólo H.', 'Solo H.', 'Bot', 'Call'].includes(filters.canal || '')
              ? ' (+ Todos)'
              : ''
          }`}
        />

        {/* Detailed Drilldown Table */}
        <DayDetailView
          selectedDate={selectedDate}
          items={selectedDayItems}
          allFilteredItems={filteredAgendas}
          allDayItems={selectedAllDayItems}
          lectura={lectura}
          filters={filters}
          onClearDateSelection={() => setSelectedDate(null)}
          onResetFilters={handleResetFilters}
        />

      </main>

      {/* Upload Excel Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onFileLoaded={handleFileLoaded}
        onDownloadTemplate={handleDownloadTemplate}
      />

      {/* Export Report Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        lectura={lectura}
        filteredAgendas={filteredAgendas}
        allAgendas={allAgendas}
        filters={filters}
        selectedDate={selectedDate}
        month1YearMonth={month1Data.yearMonthKey}
        month2YearMonth={month2Data.yearMonthKey}
      />

      {/* Firebase Firestore Storage Modal */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        lectura={lectura}
        allAgendas={allAgendas}
        activeFileName={activeFileName}
        onDataLoaded={handleDataLoadedFromFirebase}
        onShowNotification={setNotification}
      />

      {/* Share / Public Access Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Google Sheets Modal */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        onDataLoaded={data => {
          setLectura(data.lectura);
          setAllAgendas(data.agendas);
          setActiveFileName(data.fileName);
          setIsCustomFile(true);
          setMonthOffset(0);
          setSelectedDate(data.lectura.fecha);
        }}
        onShowNotification={setNotification}
        currentAgendasCount={allAgendas.length}
        currentLecturaDate={lectura.fechaOriginal}
      />

      {/* Admin Password Authentication Modal ('Walter') */}
      <PasswordAuthModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPendingAuthAction(null);
        }}
        onSuccess={handlePasswordAuthSuccess}
        actionTitle={pendingAuthAction?.title}
        actionDescription={pendingAuthAction?.description}
      />

    </div>
  );
}
