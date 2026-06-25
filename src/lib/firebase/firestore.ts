import { 
  collection, 
  getDocs, 
  getDoc,
  setDoc, 
  doc, 
  updateDoc, 
  addDoc, 
  query, 
  where,
  orderBy,
  deleteDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './config';
import { SolGroup, Member, Contribution, Beneficiary, Cycle, SolNotification, UserSession, Invitation } from '../../types';
import { initialSols, initialMembers, initialContributions, initialBeneficiaries, initialCycles, initialNotifications, mockUsers } from '../../mockData';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Security-rules compatible helper to get accessible Sòl IDs for the current authenticated user
async function getUserSolIds(): Promise<{ solIds: string[]; isManager: boolean }> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { solIds: [], isManager: false };
    }

    // Marie Carmel Pierre admin email bypass
    if (user.email === 'marie.carmel@sòlayiti.com') {
      return { solIds: [], isManager: true };
    }

    // 1. Get user doc to find role and mockId/assocId
    const userDocSnap = await getDoc(doc(db, 'users', user.uid));
    if (!userDocSnap.exists()) {
      return { solIds: [], isManager: false };
    }

    const userData = userDocSnap.data();
    const isManager = userData.role === 'maman_sol';
    const mockId = userData.mockId || user.uid;

    if (isManager) {
      return { solIds: [], isManager: true };
    }

    // 2. Fetch from members collection to get authorized solIds
    const memberDocSnap = await getDoc(doc(db, 'members', mockId));
    if (!memberDocSnap.exists()) {
      return { solIds: [], isManager: false };
    }

    const memberData = memberDocSnap.data();
    return { solIds: memberData.solIds || [], isManager: false };
  } catch (err: any) {
    // Graceful offline fallback
    const isOffline = err.message?.includes('offline') || 
                      err.code === 'unavailable' || 
                      err.message?.includes('Failed to get document') ||
                      err.message?.includes('client is offline');
    if (isOffline) {
      console.warn('Offline mode or network unavailable in getUserSolIds, using fallback', err.message);
    } else {
      console.error('Error fetching user solIds:', err);
    }
    if (isOffline) {
      const user = auth.currentUser;
      if (user) {
        if (user.email === 'marie.carmel@sòlayiti.com') {
          return { solIds: [], isManager: true };
        }
        const matchedMock = mockUsers.find(mu => mu.email === user.email);
        if (matchedMock) {
          const isManager = matchedMock.role === 'maman_sol';
          const mockMember = initialMembers.find(m => m.id === matchedMock.id);
          return {
            solIds: mockMember?.solIds || [],
            isManager
          };
        }
      }
    }
    return { solIds: [], isManager: false };
  }
}

// Helper to check and seed initial data if collections are empty
export async function seedInitialData() {
  try {
    const solsSnapshot = await getDocs(collection(db, 'sols'));
    if (solsSnapshot.empty) {
      console.log('Seeding initial data to Firestore...');
      
      // Store sols
      for (const s of initialSols) {
        await setDoc(doc(db, 'sols', s.id), {
          ...s,
          createdAt: s.createdAt,
          updatedAt: new Date().toISOString().split('T')[0]
        });
      }

      // Store members
      for (const m of initialMembers) {
        await setDoc(doc(db, 'members', m.id), m);
      }

      // Store contributions
      for (const c of initialContributions) {
        await setDoc(doc(db, 'contributions', c.id), c);
      }

      // Store beneficiaries
      for (const b of initialBeneficiaries) {
        await setDoc(doc(db, 'beneficiaries', b.id), b);
      }

      // Store cycles
      for (const cy of initialCycles) {
        await setDoc(doc(db, 'cycles', cy.id), cy);
      }

      // Store notifications
      for (const n of initialNotifications) {
        await setDoc(doc(db, 'notifications', n.id), n);
      }

      // Store users
      for (const u of mockUsers) {
        await setDoc(doc(db, 'users', u.id), {
          uid: u.id,
          email: u.email,
          displayName: u.name,
          photoURL: u.avatarUrl,
          phone: u.phone,
          role: u.role,
          language: 'creole',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      console.log('Seeding completed successfully!');
    }
  } catch (error) {
    console.error('Error seeding initial data: ', error);
    handleFirestoreError(error, OperationType.WRITE, 'seeding');
  }
}

// SOL GROUPS SERVICE
export async function getSols(): Promise<SolGroup[]> {
  try {
    const { solIds, isManager } = await getUserSolIds();
    let q = query(collection(db, 'sols'));
    if (!isManager) {
      if (solIds.length === 0) return [];
      q = query(collection(db, 'sols'), where('id', 'in', solIds));
    }
    const snapshot = await getDocs(q);
    const list: SolGroup[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as SolGroup);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'sols');
  }
}

export async function createSol(sol: SolGroup): Promise<void> {
  try {
    await setDoc(doc(db, 'sols', sol.id), sol);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `sols/${sol.id}`);
  }
}

export async function updateSol(solId: string, data: Partial<SolGroup>): Promise<void> {
  try {
    await updateDoc(doc(db, 'sols', solId), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sols/${solId}`);
  }
}

// MEMBERS SERVICE
export async function getMembers(): Promise<Member[]> {
  try {
    const { solIds, isManager } = await getUserSolIds();
    let q = query(collection(db, 'members'));
    if (!isManager) {
      if (solIds.length === 0) return [];
      q = query(collection(db, 'members'), where('solIds', 'array-contains-any', solIds));
    }
    const snapshot = await getDocs(q);
    const list: Member[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Member);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'members');
  }
}

export async function createMember(member: Member): Promise<void> {
  try {
    await setDoc(doc(db, 'members', member.id), member);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `members/${member.id}`);
  }
}

export async function updateMember(memberId: string, data: Partial<Member>): Promise<void> {
  try {
    await updateDoc(doc(db, 'members', memberId), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `members/${memberId}`);
  }
}

// CONTRIBUTIONS SERVICE
export async function getContributions(): Promise<Contribution[]> {
  try {
    const { solIds, isManager } = await getUserSolIds();
    let q = query(collection(db, 'contributions'));
    if (!isManager) {
      if (solIds.length === 0) return [];
      q = query(collection(db, 'contributions'), where('solId', 'in', solIds));
    }
    const snapshot = await getDocs(q);
    const list: Contribution[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Contribution);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'contributions');
  }
}

export async function updateContribution(contribId: string, data: Partial<Contribution>): Promise<void> {
  try {
    await updateDoc(doc(db, 'contributions', contribId), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `contributions/${contribId}`);
  }
}

export async function createContribution(contrib: Contribution): Promise<void> {
  try {
    await setDoc(doc(db, 'contributions', contrib.id), contrib);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `contributions/${contrib.id}`);
  }
}

// BENEFICIARIES SERVICE
export async function getBeneficiaries(): Promise<Beneficiary[]> {
  try {
    const { solIds, isManager } = await getUserSolIds();
    let q = query(collection(db, 'beneficiaries'));
    if (!isManager) {
      if (solIds.length === 0) return [];
      q = query(collection(db, 'beneficiaries'), where('solId', 'in', solIds));
    }
    const snapshot = await getDocs(q);
    const list: Beneficiary[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Beneficiary);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'beneficiaries');
  }
}

export async function createBeneficiary(ben: Beneficiary): Promise<void> {
  try {
    await setDoc(doc(db, 'beneficiaries', ben.id), ben);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `beneficiaries/${ben.id}`);
  }
}

export async function updateBeneficiary(benId: string, data: Partial<Beneficiary>): Promise<void> {
  try {
    await updateDoc(doc(db, 'beneficiaries', benId), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `beneficiaries/${benId}`);
  }
}

// CYCLES SERVICE
export async function getCycles(): Promise<Cycle[]> {
  try {
    const { solIds, isManager } = await getUserSolIds();
    let q = query(collection(db, 'cycles'));
    if (!isManager) {
      if (solIds.length === 0) return [];
      q = query(collection(db, 'cycles'), where('solId', 'in', solIds));
    }
    const snapshot = await getDocs(q);
    const list: Cycle[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Cycle);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'cycles');
  }
}

export async function createCycle(cy: Cycle): Promise<void> {
  try {
    await setDoc(doc(db, 'cycles', cy.id), cy);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `cycles/${cy.id}`);
  }
}

export async function updateCycle(cycleId: string, data: Partial<Cycle>): Promise<void> {
  try {
    await updateDoc(doc(db, 'cycles', cycleId), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `cycles/${cycleId}`);
  }
}

// NOTIFICATIONS SERVICE
export async function getNotifications(): Promise<SolNotification[]> {
  try {
    const { solIds, isManager } = await getUserSolIds();
    let q = query(collection(db, 'notifications'));
    if (!isManager) {
      if (solIds.length === 0) return [];
      q = query(collection(db, 'notifications'), where('solId', 'in', solIds));
    }
    const snapshot = await getDocs(q);
    const list: SolNotification[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      list.push(data as SolNotification);
    });
    // Sort notifications by date desc
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'notifications');
  }
}

export async function createNotification(notif: SolNotification): Promise<void> {
  try {
    await setDoc(doc(db, 'notifications', notif.id), notif);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `notifications/${notif.id}`);
  }
}

export async function updateNotification(notifId: string, data: Partial<SolNotification>): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notifId), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notifId}`);
  }
}

// INVITATIONS SERVICE
export async function getInvitations(): Promise<Invitation[]> {
  try {
    const { solIds, isManager } = await getUserSolIds();
    let q = query(collection(db, 'invitations'));
    if (!isManager) {
      if (solIds.length === 0) return [];
      q = query(collection(db, 'invitations'), where('solId', 'in', solIds));
    }
    const snapshot = await getDocs(q);
    const list: Invitation[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Invitation);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'invitations');
  }
}

export async function createInvitation(inv: Invitation): Promise<void> {
  try {
    await setDoc(doc(db, 'invitations', inv.id), inv);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `invitations/${inv.id}`);
  }
}

export async function updateInvitation(invId: string, data: Partial<Invitation>): Promise<void> {
  try {
    await updateDoc(doc(db, 'invitations', invId), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `invitations/${invId}`);
  }
}
