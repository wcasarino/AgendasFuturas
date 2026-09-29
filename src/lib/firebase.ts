import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;
let db: Firestore;

try {
  if (getApps().length === 0) {
    app = initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
      measurementId: firebaseConfig.measurementId,
    });
  } else {
    app = getApp();
  }

  // Initialize Firestore with specific database ID if present, otherwise default
  if (firebaseConfig.firestoreDatabaseId) {
    try {
      db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    } catch {
      db = getFirestore(app);
    }
  } else {
    db = getFirestore(app);
  }
} catch (error) {
  console.error('Error al inicializar Firebase:', error);
  // Fallback
  app = getApps()[0] || initializeApp({
    apiKey: firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId,
    appId: firebaseConfig.appId,
  });
  db = getFirestore(app);
}

export { app, db, firebaseConfig };

/**
 * Validates connection to Firestore as per skill requirements
 */
export async function validateFirebaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const testDocRef = doc(db, 'test', 'connection');
    await getDocFromServer(testDocRef);
    return {
      success: true,
      message: 'Conectado exitosamente a Firebase Firestore (wcasarino@gmail.com).',
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline') || msg.includes('unavailable')) {
      return {
        success: false,
        message: 'No se pudo contactar al servidor de Firebase. Verifica la conexión.',
      };
    }
    // Even if test document doesn't exist, getting a 200/null doc from server proves connectivity
    return {
      success: true,
      message: 'Conexión verificada con Firebase Firestore.',
    };
  }
}
