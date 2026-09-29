import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  writeBatch,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, firebaseConfig, validateFirebaseConnection } from '../lib/firebase';
import { AgendaItem, LecturaData } from '../types';
import { parseExcelDate } from '../utils/dateUtils';
import {
  getLocalCachedDataset,
  saveDatasetToLocalCache,
  clearLocalCache,
  getLocalCachedVersion,
  LocalCachedData,
} from '../utils/localCache';

export const OWNER_EMAIL = 'wcasarino@gmail.com';

export interface FirebaseSyncMeta {
  version: string;
  updatedAt: string;
  fileName: string;
  totalAgendas: number;
  totalLectura: number;
  sheetLecturaName: string;
  sheetAgendasName: string;
}

export interface FirebaseLoadResult {
  success: boolean;
  message: string;
  lectura?: LecturaData;
  agendas?: AgendaItem[];
  fileName?: string;
  version?: string;
  source?: 'pc_memory' | 'firebase_synced';
}

/**
 * Deletes all documents from the specified Firestore collection in batches of up to 400
 */
async function deleteCollectionInBatches(collectionName: string): Promise<number> {
  let deletedCount = 0;
  const colRef = collection(db, collectionName);
  const snap = await getDocs(colRef);

  if (snap.empty) {
    return 0;
  }

  const batchSize = 400;
  let batch = writeBatch(db);
  let countInBatch = 0;

  for (const documentSnap of snap.docs) {
    batch.delete(documentSnap.ref);
    countInBatch++;
    deletedCount++;

    if (countInBatch >= batchSize) {
      await batch.commit();
      batch = writeBatch(db);
      countInBatch = 0;
    }
  }

  if (countInBatch > 0) {
    await batch.commit();
  }

  return deletedCount;
}

/**
 * Borra todos los documentos de las colecciones Lectura y Agendas (y metadatos)
 */
export async function clearAllExcelCollectionsFromFirebase(): Promise<{
  success: boolean;
  message: string;
  deletedLectura: number;
  deletedAgendas: number;
}> {
  try {
    const deletedLectura = await deleteCollectionInBatches('Lectura');
    const deletedAgendas = await deleteCollectionInBatches('Agendas');

    // Also delete sync metadata doc if exists
    try {
      await deleteDoc(doc(db, '_meta', 'sync'));
    } catch {
      // ignore
    }

    // Also clear local PC cache
    await clearLocalCache();

    return {
      success: true,
      message: `Se borraron ${deletedLectura} documentos de 'Lectura' y ${deletedAgendas} documentos de 'Agendas' en Firebase Firestore.`,
      deletedLectura,
      deletedAgendas,
    };
  } catch (error: unknown) {
    console.error('Error al borrar colecciones de Firebase:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Error al vaciar colecciones: ${msg}`,
      deletedLectura: 0,
      deletedAgendas: 0,
    };
  }
}

/**
 * Guarda los datos del Excel en dos colecciones con el mismo nombre de las Hojas:
 * - Colección 'Lectura': tantos documentos como filas con datos tenga la hoja Lectura.
 * - Colección 'Agendas': tantos documentos como filas con datos tenga la hoja Agendas.
 * Previo a la carga, borra todos los documentos existentes de ambas colecciones.
 */
export async function saveExcelSheetsToFirebase(params: {
  sheetLecturaName?: string;
  sheetAgendasName?: string;
  lectura: LecturaData;
  agendas: AgendaItem[];
  lecturaRows?: Array<{ fila: number; fecha: string; fechaOriginal: string; valor: string }>;
  fileName?: string;
}): Promise<{
  success: boolean;
  message: string;
  deletedPrevCount: number;
  savedLecturaCount: number;
  savedAgendasCount: number;
  version: string;
}> {
  try {
    const {
      sheetLecturaName = 'Lectura',
      sheetAgendasName = 'Agendas',
      lectura,
      agendas,
      lecturaRows,
      fileName = 'AGENDAS FUTURAS.xlsx',
    } = params;

    // 1. Previo a la carga: Borrar todos los documentos de las colecciones Lectura y Agendas
    const delRes = await clearAllExcelCollectionsFromFirebase();
    const totalDeleted = delRes.deletedLectura + delRes.deletedAgendas;

    const timestamp = new Date().toISOString();
    const version = `v_${Date.now()}`;

    // 2. Grabar en la colección 'Lectura' tantos documentos como filas con datos tenga
    const finalLecturaRows = (lecturaRows && lecturaRows.length > 0)
      ? lecturaRows
      : [{
          fila: 1,
          fecha: lectura.fecha,
          fechaOriginal: lectura.fechaOriginal,
          valor: lectura.fechaOriginal,
        }];

    let lecturaBatch = writeBatch(db);
    let lecturaCount = 0;

    for (let i = 0; i < finalLecturaRows.length; i++) {
      const rowItem = finalLecturaRows[i];
      const docId = `fila_${rowItem.fila || (i + 1)}`;
      const docRef = doc(db, 'Lectura', docId);
      lecturaBatch.set(docRef, {
        fila: rowItem.fila || (i + 1),
        fecha: rowItem.fecha,
        fechaOriginal: rowItem.fechaOriginal,
        valor: rowItem.valor || rowItem.fechaOriginal,
        updatedAt: timestamp,
      });
      lecturaCount++;
    }
    await lecturaBatch.commit();

    // 3. Grabar en la colección 'Agendas' tantos documentos como filas con datos tenga
    const batchSize = 400; // safe margin below 500
    let agendaBatch = writeBatch(db);
    let countInCurrentBatch = 0;
    let totalAgendasSaved = 0;

    for (let i = 0; i < agendas.length; i++) {
      const item = agendas[i];
      const docId = `agenda_${i + 1}`;
      const docRef = doc(db, 'Agendas', docId);

      agendaBatch.set(docRef, {
        fila: i + 1,
        dpto: item.dpto,
        caps: item.caps,
        fecha: item.fecha,
        fechaOriginal: item.fechaOriginal,
        turno: item.turno,
        especialidad: item.especialidad,
        profesional: item.profesional,
        turnos: item.turnos,
        updatedAt: timestamp,
      });

      countInCurrentBatch++;
      totalAgendasSaved++;

      if (countInCurrentBatch >= batchSize) {
        await agendaBatch.commit();
        agendaBatch = writeBatch(db);
        countInCurrentBatch = 0;
      }
    }

    if (countInCurrentBatch > 0) {
      await agendaBatch.commit();
    }

    // 4. Actualizar documento de metadatos y versión de sincronización
    const syncMeta: FirebaseSyncMeta = {
      version,
      updatedAt: timestamp,
      fileName,
      totalAgendas: totalAgendasSaved,
      totalLectura: lecturaCount,
      sheetLecturaName,
      sheetAgendasName,
    };
    await setDoc(doc(db, '_meta', 'sync'), syncMeta);

    // 5. Guardar inmediatamente en la memoria local (IndexedDB) de la PC
    await saveDatasetToLocalCache({
      version,
      updatedAt: timestamp,
      fileName,
      lectura,
      agendas,
    });

    const timeStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    return {
      success: true,
      message: `¡Base de datos actualizada (${timeStr})! Se borraron ${totalDeleted} documentos anteriores. Se guardaron ${lecturaCount} docs en 'Lectura' y ${totalAgendasSaved} docs en 'Agendas'.`,
      deletedPrevCount: totalDeleted,
      savedLecturaCount: lecturaCount,
      savedAgendasCount: totalAgendasSaved,
      version,
    };
  } catch (error: unknown) {
    console.error('Error al guardar en colecciones Firebase:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Error al guardar en Firebase: ${msg}`,
      deletedPrevCount: 0,
      savedLecturaCount: 0,
      savedAgendasCount: 0,
      version: '',
    };
  }
}

/**
 * Sube los datos de la base FIREBASE a la memoria de la PC del usuario al conectarse
 * por primera vez y NO consulta más a Firebase si la versión local está actualizada.
 */
export async function loadDatasetToPCMemory(): Promise<FirebaseLoadResult> {
  try {
    // 1. Verificar si ya tenemos el dataset cargado en la memoria local / IndexedDB de la PC
    const localCached = await getLocalCachedDataset();
    const localVersion = getLocalCachedVersion() || (localCached ? localCached.version : null);

    // 2. Consultar únicamente el metadato de versión de Firebase (1 sola lectura mínima)
    const syncDocSnap = await getDoc(doc(db, '_meta', 'sync'));

    if (syncDocSnap.exists()) {
      const syncData = syncDocSnap.data() as FirebaseSyncMeta;
      const remoteVersion = syncData.version;

      // Si la versión en la memoria de la PC coincide con la de Firebase,
      // usamos directamente los datos locales SIN consultar las colecciones Agendas ni Lectura
      if (localCached && localVersion === remoteVersion && localCached.agendas.length > 0) {
        return {
          success: true,
          message: `Datos cargados desde la memoria local de la PC (${localCached.agendas.length} agendas). Sin consultas adicionales a Firebase.`,
          lectura: localCached.lectura,
          agendas: localCached.agendas,
          fileName: localCached.fileName,
          version: remoteVersion,
          source: 'pc_memory',
        };
      }
    }

    // 3. Primera conexión o la base de Firebase se actualizó:
    // Traemos todos los documentos de las colecciones 'Lectura' y 'Agendas'
    const lecturaCol = collection(db, 'Lectura');
    const lecturaSnap = await getDocs(lecturaCol);

    const agendasCol = collection(db, 'Agendas');
    const agendasSnap = await getDocs(agendasCol);

    // Si no hay datos en las nuevas colecciones, verificamos si hay algún dataset legado
    if (agendasSnap.empty) {
      if (localCached && localCached.agendas.length > 0) {
        return {
          success: true,
          message: `Cargado desde memoria local de la PC.`,
          lectura: localCached.lectura,
          agendas: localCached.agendas,
          fileName: localCached.fileName,
          version: localCached.version,
          source: 'pc_memory',
        };
      }

      return {
        success: false,
        message: 'No se encontraron datos en las colecciones de Firebase. Carga tu archivo AGENDAS FUTURAS.xlsx para comenzar.',
      };
    }

    // Parsear documentos de la colección 'Lectura'
    let lecturaData: LecturaData | null = null;
    lecturaSnap.docs.forEach(d => {
      const data = d.data();
      if (!lecturaData && data.fecha) {
        const parsed = parseExcelDate(data.fechaOriginal || data.fecha);
        lecturaData = {
          fecha: data.fecha,
          fechaOriginal: data.fechaOriginal || (parsed ? parsed.formatted : data.fecha),
          dateObj: parsed ? parsed.dateObj : new Date(data.fecha),
        };
      }
    });

    if (!lecturaData) {
      const today = new Date();
      lecturaData = {
        fecha: today.toISOString().split('T')[0],
        fechaOriginal: today.toLocaleDateString('es-AR'),
        dateObj: today,
      };
    }

    // Parsear documentos de la colección 'Agendas'
    const agendasList: AgendaItem[] = [];
    agendasSnap.docs.forEach((docSnap, index) => {
      const data = docSnap.data();
      const rawFecha = String(data.fecha || '');
      const parsedDate = parseExcelDate(data.fechaOriginal || rawFecha);
      const iso = parsedDate ? parsedDate.iso : rawFecha;
      const original = parsedDate ? parsedDate.formatted : (data.fechaOriginal || rawFecha);

      agendasList.push({
        id: docSnap.id || `ag-${index}`,
        dpto: String(data.dpto || 'SIN DPTO').trim().toUpperCase(),
        caps: String(data.caps || 'SIN CAPS').trim(),
        fecha: iso,
        fechaOriginal: original,
        dateObj: parsedDate ? parsedDate.dateObj : new Date(iso),
        turno: String(data.turno || 'General').trim(),
        especialidad: String(data.especialidad || 'General').trim(),
        profesional: String(data.profesional || 'No asignado').trim(),
        turnos: Math.max(0, parseInt(String(data.turnos), 10) || 0),
      });
    });

    // Ordenar por departamento, caps y fecha para una navegación limpia
    agendasList.sort((a, b) => a.fecha.localeCompare(b.fecha));

    const syncVersion = syncDocSnap.exists()
      ? (syncDocSnap.data() as FirebaseSyncMeta).version
      : `v_${Date.now()}`;
    const fileName = syncDocSnap.exists()
      ? (syncDocSnap.data() as FirebaseSyncMeta).fileName
      : 'AGENDAS FUTURAS.xlsx';

    // 4. Guardar en la memoria local (IndexedDB) de la PC
    await saveDatasetToLocalCache({
      version: syncVersion,
      updatedAt: new Date().toISOString(),
      fileName,
      lectura: lecturaData,
      agendas: agendasList,
    });

    return {
      success: true,
      message: `¡Datos descargados a la memoria de tu PC! ${agendasList.length} agendas listas sin requerir más consultas a Firebase.`,
      lectura: lecturaData,
      agendas: agendasList,
      fileName,
      version: syncVersion,
      source: 'firebase_synced',
    };
  } catch (error: unknown) {
    console.error('Error al cargar datos a memoria:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Error al conectar con Firebase: ${msg}`,
    };
  }
}

/**
 * Escucha únicamente los cambios de versión en Firebase.
 * Si se detecta una nueva versión en Firebase, notifica al callback
 * para refrescar la memoria local de la PC.
 */
export function subscribeToFirebaseSyncUpdates(
  currentVersion: string | null,
  onRemoteUpdateDetected: (newVersion: string) => void
): () => void {
  try {
    const syncDocRef = doc(db, '_meta', 'sync');
    const unsubscribe = onSnapshot(syncDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as FirebaseSyncMeta;
        if (data.version && currentVersion && data.version !== currentVersion) {
          onRemoteUpdateDetected(data.version);
        }
      }
    }, (error) => {
      console.warn('Sync listener notice:', error);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Could not subscribe to sync:', err);
    return () => {};
  }
}

/**
 * Consulta el estado actual de las colecciones en Firebase
 */
export async function getFirebaseCollectionsStatus(): Promise<{
  totalLectura: number;
  totalAgendas: number;
  version: string | null;
  updatedAt: string | null;
  fileName: string | null;
}> {
  try {
    const syncDoc = await getDoc(doc(db, '_meta', 'sync'));
    if (syncDoc.exists()) {
      const data = syncDoc.data() as FirebaseSyncMeta;
      return {
        totalLectura: data.totalLectura || 0,
        totalAgendas: data.totalAgendas || 0,
        version: data.version || null,
        updatedAt: data.updatedAt || null,
        fileName: data.fileName || null,
      };
    }

    const lecturaSnap = await getDocs(collection(db, 'Lectura'));
    const agendasSnap = await getDocs(collection(db, 'Agendas'));
    return {
      totalLectura: lecturaSnap.size,
      totalAgendas: agendasSnap.size,
      version: null,
      updatedAt: null,
      fileName: null,
    };
  } catch {
    return {
      totalLectura: 0,
      totalAgendas: 0,
      version: null,
      updatedAt: null,
      fileName: null,
    };
  }
}

export { validateFirebaseConnection, firebaseConfig };
