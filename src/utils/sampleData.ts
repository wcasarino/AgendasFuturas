import { AgendaItem, LecturaData } from '../types';
import { parseExcelDate, formatDateDDMMAAAA } from './dateUtils';

export function generateSampleDataset(): { lectura: LecturaData; agendas: AgendaItem[] } {
  // Use current date or September 2026 as the base reading date
  const now = new Date();
  const baseYear = now.getFullYear();
  const baseMonth = now.getMonth(); // 0-indexed

  // Lectura date: middle of the base month (e.g. 15th)
  const lecturaDateObj = new Date(baseYear, baseMonth, 15, 12, 0, 0);
  const lecturaFormatted = formatDateDDMMAAAA(lecturaDateObj);
  const lecturaParsed = parseExcelDate(lecturaFormatted)!;

  const dptosAndCaps: Record<string, string[]> = {
    'CAPITAL': ['CAPS N° 01 San Martín', 'CAPS N° 02 Bombal', 'CAPS N° 300 San Francisco'],
    'GODOY CRUZ': ['CAPS N° 148 El Trapiche', 'CAPS N° 172 Las Tortugas', 'CAPS N° 204 Centro'],
    'GUAYMALLÉN': ['CAPS N° 16 Villa Nueva', 'CAPS N° 24 El Bermejo', 'CAPS N° 222 Dorrego'],
    'LAS HERAS': ['CAPS N° 18 El Plumerillo', 'CAPS N° 25 Panquehua', 'CAPS N° 136 Uspallata'],
    'LUJÁN DE CUYO': ['CAPS N° 31 Mayor Drummond', 'CAPS N° 45 Carrodilla', 'CAPS N° 119 Chacras de Coria'],
    'MAIPÚ': ['CAPS N° 55 Coquimbito', 'CAPS N° 60 Fray Luis Beltrán', 'CAPS N° 101 Russell'],
  };

  const specialtiesAndPros = [
    { esp: 'Clínica Médica', pros: ['Dr. Gómez, Juan Carlos', 'Dra. Álvarez, Sofía', 'Dr. Morales, Cristian'] },
    { esp: 'Pediatría', pros: ['Dra. Rodríguez, María Elena', 'Dr. Martínez, Alejandro', 'Dra. Rossi, Valentina'] },
    { esp: 'Ginecología y Obstetricia', pros: ['Dra. Benítez, Lucía', 'Dra. Quiroga, Mariana'] },
    { esp: 'Odontología', pros: ['Dr. Fernández, Pablo', 'Dra. Morales, Florencia'] },
    { esp: 'Cardiología', pros: ['Dr. Navarro, Esteban', 'Dr. Castro, Roberto'] },
    { esp: 'Traumatología', pros: ['Dr. Suárez, Hernán', 'Dr. Blanco, Marcelo'] },
    { esp: 'Salud Mental / Psicología', pros: ['Lic. Pereyra, Camila', 'Lic. Díaz, Matías'] },
    { esp: 'Nutrición', pros: ['Lic. Soria, Andrea', 'Lic. Romero, Paula'] },
  ];

  const turnos = ['Mañana', 'Tarde', 'Vespertino'];

  const agendas: AgendaItem[] = [];
  let idCounter = 1;

  // Generate appointments across Month 1 and Month 2
  // For each month, distribute realistically across working days (Mon-Fri) and some Saturdays
  const monthsToGenerate = [
    { year: baseYear, month: baseMonth },
    { year: baseMonth === 11 ? baseYear + 1 : baseYear, month: (baseMonth + 1) % 12 }
  ];

  for (const { year, month } of monthsToGenerate) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day, 12, 0, 0);
      const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday

      // Skip Sundays
      if (dayOfWeek === 0) continue;

      const formatted = formatDateDDMMAAAA(currentDate);
      const parsed = parseExcelDate(formatted);
      if (!parsed) continue;

      // On Saturdays, fewer turnos; weekdays have good volume
      const numSlotsPerDay = dayOfWeek === 6 ? 4 + ((day * 7) % 5) : 10 + ((day * 13) % 12);

      for (let s = 0; s < numSlotsPerDay; s++) {
        const dptoKeys = Object.keys(dptosAndCaps);
        const dpto = dptoKeys[(day + s) % dptoKeys.length];
        const capsList = dptosAndCaps[dpto];
        const caps = capsList[(day * 3 + s) % capsList.length];

        const specItem = specialtiesAndPros[(s * 2 + day) % specialtiesAndPros.length];
        const especialidad = specItem.esp;
        const profesional = specItem.pros[(day + s) % specItem.pros.length];

        const turno = turnos[(s + day) % (dayOfWeek === 6 ? 2 : turnos.length)];

        // Realistic turnos count per shift slot (e.g. 8 to 22)
        const turnosCount = 8 + ((day * 5 + s * 3) % 15);
        const estado = (day + s) % 3 === 0 ? 'Asignado' : 'Libre';
        const todos = Math.round(turnosCount * 0.1);
        const soloH = Math.round(turnosCount * 0.45);
        const bot = Math.round(turnosCount * 0.25);
        const call = Math.max(0, turnosCount - todos - soloH - bot);

        agendas.push({
          id: `sample-${idCounter++}`,
          dpto,
          caps,
          fecha: parsed.iso,
          fechaOriginal: parsed.formatted,
          dateObj: parsed.dateObj,
          especialidad,
          profesional,
          estado,
          todos,
          soloH,
          bot,
          call,
          turnos: turnosCount,
          turno,
        });
      }
    }
  }

  return {
    lectura: {
      fecha: lecturaParsed.iso,
      fechaOriginal: lecturaParsed.formatted,
      dateObj: lecturaParsed.dateObj,
    },
    agendas,
  };
}
