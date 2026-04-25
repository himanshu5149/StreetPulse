import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { VendorSession, SessionStatus, UserAlert } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const sessionService = {
  // Listen for live sessions (status == 'open')
  subscribeToLiveSessions(callback: (sessions: VendorSession[]) => void) {
    const q = query(
      collection(db, 'sessions'), 
      where('status', '==', 'open'),
      where('closesAt', '>', new Date().toISOString())
    );

    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as VendorSession));
      callback(sessions);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sessions');
    });
  },

  // Create a new vendor flare
  async createFlare(data: Omit<VendorSession, 'id' | 'openedAt' | 'viewCount' | 'status'>) {
    const path = 'sessions';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...data,
        status: 'open' as SessionStatus,
        openedAt: new Date().toISOString(),
        viewCount: 0,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // End an active flare
  async endFlare(sessionId: string) {
    const path = `sessions/${sessionId}`;
    try {
      const docRef = doc(db, 'sessions', sessionId);
      await updateDoc(docRef, {
        status: 'closed' as SessionStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Alert Management
  async saveAlert(alert: Omit<UserAlert, 'id'>) {
    const path = 'alerts';
    try {
      // Find existing alert for this user to update or create new
      const q = query(collection(db, path), where('userId', '==', alert.userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, path, existingDoc.id), {
          ...alert,
          updatedAt: serverTimestamp()
        });
        return existingDoc.id;
      } else {
        const docRef = await addDoc(collection(db, path), {
          ...alert,
          createdAt: serverTimestamp()
        });
        return docRef.id;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getUserAlert(userId: string) {
    const path = 'alerts';
    try {
      const q = query(collection(db, path), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as UserAlert;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }
};
