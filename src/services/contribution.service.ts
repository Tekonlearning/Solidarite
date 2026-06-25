import { db } from '../lib/firebase/config';
import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { Contribution, SolNotification, Membership } from '../types';
import { runWithRetry, getPaginatedQuery, PaginationOptions, PaginatedResult } from './firestore-utils';

export const contributionService = {
  /**
   * Retrieves a single contribution by its ID with retry.
   */
  async getContribution(contribId: string): Promise<Contribution | null> {
    if (!contribId) throw new Error('contribId is required.');
    return runWithRetry(async () => {
      const ref = doc(db, 'contributions', contribId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as Contribution;
      }
      return null;
    });
  },

  /**
   * Settles a contribution, changes its status to 'paid',
   * and issues a contextual system notification to the group.
   * Leverages a transaction with automatic retry to handle parallel status updates.
   */
  async markPaid(
    contribId: string,
    method: string = 'MonCash',
    language: 'creole' | 'french' | 'english' = 'creole'
  ): Promise<void> {
    if (!contribId) throw new Error('contribId is required.');

    return runWithRetry(async () => {
      await runTransaction(db, async (transaction) => {
        const contribDocRef = doc(db, 'contributions', contribId);
        const contribDocSnap = await transaction.get(contribDocRef);
        if (!contribDocSnap.exists()) {
          throw new Error('Contribution record not found.');
        }
        const c = contribDocSnap.data() as Contribution;

        // Update the contribution status to 'paid'
        transaction.update(contribDocRef, {
          status: 'paid',
          paidDate: new Date().toISOString().split('T')[0],
          paymentMethod: method
        });

        // Resolve membership (use composite userId_solId ID)
        const membershipId = `${c.memberId}_${c.solId}`;
        const membershipRef = doc(db, 'memberships', membershipId);
        const membershipSnap = await transaction.get(membershipRef);
        const payingMemberName = membershipSnap.exists() 
          ? (membershipSnap.data() as Membership).name 
          : 'yon manm';

        // Issue notification
        const newNotifId = `notif-pay-${Date.now()}`;
        const newNotifRef = doc(db, 'notifications', newNotifId);
        const newNotif: SolNotification = {
          id: newNotifId,
          title: language === 'creole' ? 'Kotizasyon Resevwa' : 'Cotisation Confirmée',
          message: language === 'creole'
            ? `Maman Sòl konfime peman ${c.amount} HTG nan men ${payingMemberName} via ${method}.`
            : `Paiement de ${c.amount} HTG validé pour ${payingMemberName} par ${method}.`,
          category: 'member_joined',
          date: new Date().toISOString().split('T')[0],
          read: false,
          solId: c.solId
        };
        transaction.set(newNotifRef, newNotif);
      });
    });
  },

  /**
   * High-level shortcut that initiates instant member payouts.
   */
  async quickPay(
    contribId: string,
    language: 'creole' | 'french' | 'english' = 'creole'
  ): Promise<void> {
    return this.markPaid(contribId, 'MonCash', language);
  },

  /**
   * Creates a single contribution record
   */
  async createContribution(contrib: Contribution): Promise<void> {
    if (!contrib.id) throw new Error('Contribution ID is required.');
    const ref = doc(db, 'contributions', contrib.id);
    return runWithRetry(async () => {
      await setDoc(ref, contrib);
    });
  },

  /**
   * Updates contribution parameters
   */
  async updateContribution(contribId: string, updates: Partial<Omit<Contribution, 'id' | 'solId'>>): Promise<void> {
    if (!contribId) throw new Error('contribId is required.');
    const ref = doc(db, 'contributions', contribId);
    return runWithRetry(async () => {
      await updateDoc(ref, updates);
    });
  },

  /**
   * Fetches all contributions associated with a specific Sòl group
   */
  async getContributionsBySol(solId: string): Promise<Contribution[]> {
    if (!solId) throw new Error('solId is required.');
    return runWithRetry(async () => {
      const ref = collection(db, 'contributions');
      const q = query(ref, where('solId', '==', solId));
      const querySnap = await getDocs(q);
      
      const list: Contribution[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as Contribution);
      });
      return list;
    });
  },

  /**
   * Fetches all contributions for a specific member/user
   */
  async getContributionsByUser(userId: string): Promise<Contribution[]> {
    if (!userId) throw new Error('userId is required.');
    return runWithRetry(async () => {
      const ref = collection(db, 'contributions');
      const q = query(ref, where('memberId', '==', userId));
      const querySnap = await getDocs(q);
      
      const list: Contribution[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as Contribution);
      });
      return list;
    });
  },

  /**
   * Fetches all contributions for a specific cycle
   */
  async getContributionsByCycle(cycleId: string): Promise<Contribution[]> {
    if (!cycleId) throw new Error('cycleId is required.');
    return runWithRetry(async () => {
      const ref = collection(db, 'contributions');
      const q = query(ref, where('cycleId', '==', cycleId));
      const querySnap = await getDocs(q);
      
      const list: Contribution[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as Contribution);
      });
      return list;
    });
  },

  /**
   * Performs bulk creation of contribution documents using a write batch.
   */
  async bulkCreateContributions(contributions: Contribution[]): Promise<void> {
    if (contributions.length === 0) return;
    return runWithRetry(async () => {
      const batch = writeBatch(db);
      contributions.forEach((c) => {
        const ref = doc(db, 'contributions', c.id);
        batch.set(ref, c);
      });
      await batch.commit();
    });
  },

  /**
   * System-wide background job equivalent that checks for due dates
   * and marks pending contributions as 'late' if past their deadline.
   */
  async updateLateContributions(): Promise<number> {
    return runWithRetry(async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const ref = collection(db, 'contributions');
      const q = query(ref, where('status', '==', 'pending'));
      const querySnap = await getDocs(q);
      
      const batch = writeBatch(db);
      let count = 0;
      
      querySnap.forEach((docSnap) => {
        const c = docSnap.data() as Contribution;
        if (c.dueDate < todayStr) {
          batch.update(doc(db, 'contributions', c.id), { status: 'late' });
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
      }
      return count;
    });
  },

  /**
   * Paginated retrieval of contributions for a Sòl group
   */
  async getContributionsBySolPaginated(solId: string, options: PaginationOptions): Promise<PaginatedResult<Contribution>> {
    if (!solId) throw new Error('solId is required.');
    return runWithRetry(async () => {
      const ref = collection(db, 'contributions');
      const baseQuery = query(ref, where('solId', '==', solId));
      return getPaginatedQuery<Contribution>(baseQuery, {
        ...options,
        collectionName: 'contributions'
      });
    });
  }
};
