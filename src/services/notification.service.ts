import { db } from '../lib/firebase/config';
import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';
import { SolNotification } from '../types';
import { runWithRetry, getPaginatedQuery, PaginationOptions, PaginatedResult } from './firestore-utils';

export const notificationService = {
  /**
   * Retrieves a notification document by ID with retry.
   */
  async getNotification(notifId: string): Promise<SolNotification | null> {
    if (!notifId) throw new Error('notifId is required.');
    return runWithRetry(async () => {
      const ref = doc(db, 'notifications', notifId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as SolNotification;
      }
      return null;
    });
  },

  /**
   * Creates a notification document
   */
  async createNotification(notification: SolNotification): Promise<void> {
    if (!notification.id) throw new Error('Notification ID is required.');
    const ref = doc(db, 'notifications', notification.id);
    return runWithRetry(async () => {
      await setDoc(ref, notification);
    });
  },

  /**
   * Updates fields of a notification document
   */
  async updateNotification(notifId: string, updates: Partial<Omit<SolNotification, 'id'>>): Promise<void> {
    if (!notifId) throw new Error('notifId is required.');
    const ref = doc(db, 'notifications', notifId);
    return runWithRetry(async () => {
      await updateDoc(ref, updates);
    });
  },

  /**
   * Marks a notification as read
   */
  async markAsRead(notifId: string): Promise<void> {
    return this.updateNotification(notifId, { read: true });
  },

  /**
   * Fetches all notifications associated with a Sòl group, sorted by date descending
   */
  async getNotificationsBySol(solId: string): Promise<SolNotification[]> {
    if (!solId) throw new Error('solId is required.');
    return runWithRetry(async () => {
      const ref = collection(db, 'notifications');
      const q = query(ref, where('solId', '==', solId));
      const querySnap = await getDocs(q);
      
      const list: SolNotification[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as SolNotification);
      });
      
      // Sort by date descending (latest first)
      return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  },

  /**
   * Marks all unread notifications of a Sòl group as read in a single batch write
   */
  async markAllAsRead(solId: string): Promise<number> {
    if (!solId) throw new Error('solId is required.');
    return runWithRetry(async () => {
      const ref = collection(db, 'notifications');
      const q = query(ref, where('solId', '==', solId), where('read', '==', false));
      const querySnap = await getDocs(q);
      
      if (querySnap.empty) return 0;
      
      const batch = writeBatch(db);
      let count = 0;
      querySnap.forEach((docSnap) => {
        batch.update(doc(db, 'notifications', docSnap.id), { read: true });
        count++;
      });
      
      await batch.commit();
      return count;
    });
  },

  /**
   * Deletes a notification document
   */
  async deleteNotification(notifId: string): Promise<void> {
    if (!notifId) throw new Error('notifId is required.');
    const ref = doc(db, 'notifications', notifId);
    return runWithRetry(async () => {
      await deleteDoc(ref);
    });
  },

  /**
   * Performs bulk creation of notifications using a write batch
   */
  async bulkCreateNotifications(notifications: SolNotification[]): Promise<void> {
    if (notifications.length === 0) return;
    return runWithRetry(async () => {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        const ref = doc(db, 'notifications', n.id);
        batch.set(ref, n);
      });
      await batch.commit();
    });
  },

  /**
   * Paginated retrieval of notifications for a Sòl group
   */
  async getNotificationsBySolPaginated(solId: string, options: PaginationOptions): Promise<PaginatedResult<SolNotification>> {
    if (!solId) throw new Error('solId is required.');
    return runWithRetry(async () => {
      const ref = collection(db, 'notifications');
      const baseQuery = query(ref, where('solId', '==', solId));
      return getPaginatedQuery<SolNotification>(baseQuery, {
        ...options,
        collectionName: 'notifications'
      });
    });
  }
};
