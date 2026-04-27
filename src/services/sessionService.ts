import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs,
  getDoc,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  increment,
  limit,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { VendorSession, SessionStatus, UserAlert, Rating, Vendor, Notification } from '../types';

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
      where('status', '==', 'open')
    );

    return onSnapshot(q, (snapshot) => {
      const now = new Date().toISOString();
      const sessions = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as VendorSession))
        .filter(s => s.closesAt > now);
      callback(sessions);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sessions');
    });
  },

  // Create a new vendor flare
  async createFlare(data: Partial<VendorSession> & Pick<VendorSession, 'vendorId' | 'vendorName' | 'dishName' | 'location' | 'closesAt'>) {
    const path = 'sessions';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...data,
        status: 'open' as SessionStatus,
        openedAt: new Date().toISOString(),
        viewCount: 0,
        whatsappTaps: 0,
        verificationCount: 0,
        verifiedBy: [],
        extensionCount: 0,
        activeViewers: 0,
        createdAt: serverTimestamp(),
      });
      
      // Update vendor stats
      await this.updateVendorStats(data.vendorId);
      
      // Notify users based on keywords & distance
      this.notifySubscribers(data as VendorSession);
      
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateVendorStats(vendorId: string) {
    const vendorRef = doc(db, 'vendors', vendorId);
    try {
      const vendorDoc = await getDoc(vendorRef);
      if (vendorDoc.exists()) {
        await updateDoc(vendorRef, {
          totalSessions: increment(1),
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'vendors'), {
          id: vendorId,
          displayName: auth.currentUser?.displayName || 'Street Vendor',
          totalSessions: 1,
          totalRatings: 0,
          avgRating: 0,
          isVerifiedVendor: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.warn('Vendor stats update failed', e);
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

  // Verification: Still Here?
  async verifySession(sessionId: string, userId: string) {
    const path = `sessions/${sessionId}`;
    try {
      const docRef = doc(db, 'sessions', sessionId);
      await updateDoc(docRef, {
        lastVerifiedAt: new Date().toISOString(),
        verificationCount: increment(1),
        verifiedBy: arrayUnion(userId)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Social Proof: WhatsApp Tap
  async trackWhatsAppTap(sessionId: string) {
    const path = `sessions/${sessionId}`;
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        whatsappTaps: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Social Proof: View
  async trackView(sessionId: string) {
    const path = `sessions/${sessionId}`;
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        viewCount: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Update session info
  async updateSessionDetails(sessionId: string, details: { dishName: string, price: number, description?: string }) {
    const path = `sessions/${sessionId}`;
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        ...details,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Extension: Extend Session
  async extendSession(sessionId: string, currentClosesAt: string) {
    const path = `sessions/${sessionId}`;
    try {
      const newClosesAt = new Date(new Date(currentClosesAt).getTime() + 60 * 60 * 1000).toISOString();
      await updateDoc(doc(db, 'sessions', sessionId), {
        closesAt: newClosesAt,
        extensionCount: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Ratings
  async submitRating(rating: Omit<Rating, 'createdAt'>) {
    const ratingId = `${rating.sessionId}_${rating.raterUID}`;
    const path = `ratings/${ratingId}`;
    try {
      await addDoc(collection(db, 'ratings'), {
        ...rating,
        createdAt: serverTimestamp()
      });
      // In a real app, a Cloud Function would update the vendor's avgRating
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Vendor Profile
  async getVendorProfile(vendorId: string) {
    const q = query(collection(db, 'vendors'), where('id', '==', vendorId), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as Vendor;
    }
    return null;
  },

  // Alerts
  async saveAlert(alert: Omit<UserAlert, 'id'>) {
    const path = 'alerts';
    try {
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
  },

  async notifySubscribers(session: VendorSession) {
    try {
      const alertsRef = collection(db, 'alerts');
      const alertsSnapshot = await getDocs(query(alertsRef, where('enabled', '==', true)));
      
      const sessionLat = session.location.lat;
      const sessionLng = session.location.lng;

      for (const alertDoc of alertsSnapshot.docs) {
        const alert = alertDoc.data() as UserAlert;
        if (alert.userId === auth.currentUser?.uid) continue; // Don't notify the vendor

        // In a real app, you'd store the user's last known location in the alert doc too.
        // For this demo, let's pretend we have location-based filtering if alert.keywords match.
        
        const matchesKeyword = alert.keywords.some(k => 
          session.dishName.toLowerCase().includes(k.toLowerCase()) || 
          (session.category && session.category.toLowerCase().includes(k.toLowerCase()))
        );

        if (matchesKeyword) {
          // Send notification (This works in browser if permission was granted in ProfileTab)
          // We can also save to a notifications collection
          await addDoc(collection(db, 'notifications'), {
            userId: alert.userId,
            title: `🔥 New Flare: ${session.dishName}`,
            body: `${session.vendorName} is now live!`,
            sessionId: session.id,
            isRead: false,
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (e) {
      console.warn("Notification system error", e);
    }
  }
};
