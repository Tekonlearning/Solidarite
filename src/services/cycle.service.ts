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
  runTransaction
} from 'firebase/firestore';
import { Cycle, SolGroup, Beneficiary } from '../types';
import { runWithRetry, getPaginatedQuery, PaginationOptions, PaginatedResult } from './firestore-utils';

export const cycleService = {
  /**
   * Retrieves a cycle document by its unique ID
   */
  async getCycle(cycleId: string): Promise<Cycle | null> {
    if (!cycleId) throw new Error('cycleId is required.');
    return runWithRetry(async () => {
      const ref = doc(db, 'cycles', cycleId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as Cycle;
      }
      return null;
    });
  },

  /**
   * Queries the database for all cycles in a specific Sòl group
   */
  async getCyclesForSol(solId: string): Promise<Cycle[]> {
    if (!solId) throw new Error('solId is required.');
    return runWithRetry(async () => {
      const cyclesRef = collection(db, 'cycles');
      const q = query(cyclesRef, where('solId', '==', solId));
      const querySnap = await getDocs(q);
      
      const list: Cycle[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as Cycle);
      });
      return list;
    });
  },

  /**
   * Retrieves the currently active cycle for a Sòl group
   */
  async getActiveCycleForSol(solId: string): Promise<Cycle | null> {
    if (!solId) throw new Error('solId is required.');
    return runWithRetry(async () => {
      const cyclesRef = collection(db, 'cycles');
      const q = query(cyclesRef, where('solId', '==', solId), where('status', '==', 'active'));
      const querySnap = await getDocs(q);
      
      if (!querySnap.empty) {
        return querySnap.docs[0].data() as Cycle;
      }
      return null;
    });
  },

  /**
   * Creates a new cycle document
   */
  async createCycle(cycle: Cycle): Promise<void> {
    if (!cycle.id) throw new Error('Cycle ID is required.');
    const ref = doc(db, 'cycles', cycle.id);
    return runWithRetry(async () => {
      await setDoc(ref, cycle);
    });
  },

  /**
   * Updates an existing cycle document
   */
  async updateCycle(cycleId: string, updates: Partial<Omit<Cycle, 'id' | 'solId'>>): Promise<void> {
    if (!cycleId) throw new Error('cycleId is required.');
    const ref = doc(db, 'cycles', cycleId);
    return runWithRetry(async () => {
      await updateDoc(ref, updates);
    });
  },

  /**
   * Marks a cycle as completed and sets up the next cycle if desired,
   * or marks the entire Sòl Group as completed under an atomic transaction.
   */
  async completeCycle(cycleId: string, markSolCompleted: boolean = false): Promise<void> {
    if (!cycleId) throw new Error('cycleId is required.');

    return runWithRetry(async () => {
      await runTransaction(db, async (transaction) => {
        const cycleRef = doc(db, 'cycles', cycleId);
        const cycleSnap = await transaction.get(cycleRef);
        if (!cycleSnap.exists()) throw new Error(`Cycle with ID ${cycleId} not found.`);
        const cycle = cycleSnap.data() as Cycle;

        // 1. Mark cycle as completed
        transaction.update(cycleRef, { status: 'completed' });

        // 2. Update parent Sòl status if requested
        if (markSolCompleted) {
          const solRef = doc(db, 'sols', cycle.solId);
          transaction.update(solRef, { status: 'completed' });
        }
      });
    });
  },

  /**
   * Starts the next cycle for a Sòl group, incrementing the cycle number on the Sòl group,
   * setting previous active cycles to completed, and creating the new active cycle document atomically.
   */
  async startNextCycle(solId: string, durationDays: number = 30): Promise<string> {
    if (!solId) throw new Error('solId is required.');

    return runWithRetry(async () => {
      return await runTransaction(db, async (transaction) => {
        const solRef = doc(db, 'sols', solId);
        const solSnap = await transaction.get(solRef);
        if (!solSnap.exists()) throw new Error('Sòl group not found.');
        const sol = solSnap.data() as SolGroup;

        // 1. Complete previous active cycles
        const cyclesRef = collection(db, 'cycles');
        const q = query(cyclesRef, where('solId', '==', solId), where('status', '==', 'active'));
        const activeCyclesSnap = await getDocs(q);
        
        activeCyclesSnap.forEach((docSnap) => {
          transaction.update(doc(db, 'cycles', docSnap.id), { status: 'completed' });
        });

        // 2. Prepare next cycle details
        const nextCycleNumber = sol.cycleNumber + 1;
        const nextCycleId = `cycle-new-${solId}-${nextCycleNumber}-${Date.now()}`;
        
        const startDateStr = new Date().toISOString().split('T')[0];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);
        const endDateStr = endDate.toISOString().split('T')[0];

        // Retrieve beneficiaries or active memberships count
        const beneficiariesRef = collection(db, 'beneficiaries');
        const benQ = query(beneficiariesRef, where('solId', '==', solId));
        const benSnap = await getDocs(benQ);
        const totalHands = benSnap.empty ? sol.maxMembers : benSnap.size;

        const nextCycle: Cycle = {
          id: nextCycleId,
          solId,
          cycleNumber: nextCycleNumber,
          startDate: startDateStr,
          endDate: endDateStr,
          status: 'active',
          currentHandPosition: 1,
          totalHands,
          totalCollected: 0
        };

        // 3. Update parent Sòl Group
        transaction.update(solRef, {
          cycleNumber: nextCycleNumber,
          currentCycleId: nextCycleId,
          status: 'active'
        });

        // 4. Create new active Cycle
        transaction.set(doc(db, 'cycles', nextCycleId), nextCycle);

        // 5. Create fresh upcoming beneficiaries for this new cycle based on existing ones
        benSnap.forEach((benDoc) => {
          const originalBen = benDoc.data() as Beneficiary;
          const nextBenId = `ben-cycle-${nextCycleId}-${originalBen.id}-${Date.now()}`;
          const nextBen: Beneficiary = {
            ...originalBen,
            id: nextBenId,
            cycleId: nextCycleId,
            status: originalBen.position === 1 ? 'current' : 'upcoming'
          };
          transaction.set(doc(db, 'beneficiaries', nextBenId), nextBen);
        });

        return nextCycleId;
      });
    });
  },

  /**
   * Paginated retrieval of cycles for a Sòl group
   */
  async getCyclesForSolPaginated(solId: string, options: PaginationOptions): Promise<PaginatedResult<Cycle>> {
    if (!solId) throw new Error('solId is required.');
    return runWithRetry(async () => {
      const cyclesRef = collection(db, 'cycles');
      const baseQuery = query(cyclesRef, where('solId', '==', solId));
      return getPaginatedQuery<Cycle>(baseQuery, {
        ...options,
        collectionName: 'cycles'
      });
    });
  }
};
