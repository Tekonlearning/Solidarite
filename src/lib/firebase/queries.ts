import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  getDoc,
  doc
} from 'firebase/firestore';
import { db, auth } from './config';
import { 
  getSols, 
  createSol, 
  updateSol, 
  getMembers, 
  createMember, 
  updateMember, 
  getContributions, 
  updateContribution, 
  createContribution, 
  getBeneficiaries, 
  createBeneficiary, 
  updateBeneficiary, 
  getCycles, 
  createCycle, 
  updateCycle, 
  getNotifications, 
  createNotification, 
  updateNotification 
} from './firestore';
import { SolGroup, Member, Contribution, Beneficiary, Cycle, SolNotification } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { mockUsers, initialMembers } from '../../mockData';

// Query Keys
export const QUERY_KEYS = {
  sols: ['sols'],
  members: ['members'],
  contributions: ['contributions'],
  beneficiaries: ['beneficiaries'],
  cycles: ['cycles'],
  notifications: ['notifications']
};

/**
 * Helpler to resolve authorized query parameters for current user
 */
async function getSubscriptionQueryInfo() {
  const u = auth.currentUser;
  if (!u) return null;

  // Marie Carmel admin email bypass
  const isAdminBypass = u.email === 'marie.carmel@sòlayiti.com';

  try {
    const userDocSnap = await getDoc(doc(db, 'users', u.uid));
    if (!userDocSnap.exists()) {
      return { solIds: [], isManager: isAdminBypass };
    }

    const userData = userDocSnap.data();
    const isManager = isAdminBypass || userData.role === 'maman_sol';
    const mockId = userData.mockId || u.uid;

    if (isManager) {
      return { solIds: [], isManager: true };
    }

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
      console.warn('Offline mode or network unavailable in getSubscriptionQueryInfo, using fallback', err.message);
    } else {
      console.error('Error in getSubscriptionQueryInfo:', err);
    }
    if (isOffline) {
      if (isAdminBypass) {
        return { solIds: [], isManager: true };
      }
      const matchedMock = mockUsers.find(mu => mu.email === u.email);
      if (matchedMock) {
        const isManager = matchedMock.role === 'maman_sol';
        const mockMember = initialMembers.find(m => m.id === matchedMock.id);
        return {
          solIds: mockMember?.solIds || [],
          isManager
        };
      }
    }
    return { solIds: [], isManager: isAdminBypass };
  }
}

// ------------------- SOL HOOKS -------------------
export function useSolsQuery() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const setupSubscription = async () => {
      const info = await getSubscriptionQueryInfo();
      if (!info) return;

      const { solIds, isManager } = info;
      let q = query(collection(db, 'sols'));
      if (!isManager) {
        if (solIds.length === 0) {
          queryClient.setQueryData(QUERY_KEYS.sols, []);
          return;
        }
        q = query(collection(db, 'sols'), where('id', 'in', solIds));
      }

      return onSnapshot(q, (snapshot) => {
        const list: SolGroup[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as SolGroup);
        });
        queryClient.setQueryData(QUERY_KEYS.sols, list);
      });
    };

    let unsubPromise = setupSubscription();
    return () => {
      unsubPromise.then(unsub => unsub?.());
    };
  }, [currentUser, queryClient]);

  return useQuery<SolGroup[]>({
    queryKey: QUERY_KEYS.sols,
    queryFn: getSols,
    enabled: !!currentUser
  });
}

export function useCreateSolMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSol,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sols });
    }
  });
}

export function useUpdateSolMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ solId, data }: { solId: string; data: Partial<SolGroup> }) => updateSol(solId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sols });
    }
  });
}

// ------------------- MEMBER HOOKS -------------------
export function useMembersQuery() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const setupSubscription = async () => {
      const info = await getSubscriptionQueryInfo();
      if (!info) return;

      const { solIds, isManager } = info;
      let q = query(collection(db, 'members'));
      if (!isManager) {
        if (solIds.length === 0) {
          queryClient.setQueryData(QUERY_KEYS.members, []);
          return;
        }
        q = query(collection(db, 'members'), where('solIds', 'array-contains-any', solIds));
      }

      return onSnapshot(q, (snapshot) => {
        const list: Member[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Member);
        });
        queryClient.setQueryData(QUERY_KEYS.members, list);
      });
    };

    let unsubPromise = setupSubscription();
    return () => {
      unsubPromise.then(unsub => unsub?.());
    };
  }, [currentUser, queryClient]);

  return useQuery<Member[]>({
    queryKey: QUERY_KEYS.members,
    queryFn: getMembers,
    enabled: !!currentUser
  });
}

export function useCreateMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.members });
    }
  });
}

export function useUpdateMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: Partial<Member> }) => updateMember(memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.members });
    }
  });
}

// ------------------- CONTRIBUTION HOOKS -------------------
export function useContributionsQuery() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const setupSubscription = async () => {
      const info = await getSubscriptionQueryInfo();
      if (!info) return;

      const { solIds, isManager } = info;
      let q = query(collection(db, 'contributions'));
      if (!isManager) {
        if (solIds.length === 0) {
          queryClient.setQueryData(QUERY_KEYS.contributions, []);
          return;
        }
        q = query(collection(db, 'contributions'), where('solId', 'in', solIds));
      }

      return onSnapshot(q, (snapshot) => {
        const list: Contribution[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Contribution);
        });
        queryClient.setQueryData(QUERY_KEYS.contributions, list);
      });
    };

    let unsubPromise = setupSubscription();
    return () => {
      unsubPromise.then(unsub => unsub?.());
    };
  }, [currentUser, queryClient]);

  return useQuery<Contribution[]>({
    queryKey: QUERY_KEYS.contributions,
    queryFn: getContributions,
    enabled: !!currentUser
  });
}

export function useUpdateContributionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contribId, data }: { contribId: string; data: Partial<Contribution> }) => updateContribution(contribId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contributions });
    }
  });
}

export function useCreateContributionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContribution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contributions });
    }
  });
}

// ------------------- BENEFICIARY HOOKS -------------------
export function useBeneficiariesQuery() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const setupSubscription = async () => {
      const info = await getSubscriptionQueryInfo();
      if (!info) return;

      const { solIds, isManager } = info;
      let q = query(collection(db, 'beneficiaries'));
      if (!isManager) {
        if (solIds.length === 0) {
          queryClient.setQueryData(QUERY_KEYS.beneficiaries, []);
          return;
        }
        q = query(collection(db, 'beneficiaries'), where('solId', 'in', solIds));
      }

      return onSnapshot(q, (snapshot) => {
        const list: Beneficiary[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Beneficiary);
        });
        queryClient.setQueryData(QUERY_KEYS.beneficiaries, list);
      });
    };

    let unsubPromise = setupSubscription();
    return () => {
      unsubPromise.then(unsub => unsub?.());
    };
  }, [currentUser, queryClient]);

  return useQuery<Beneficiary[]>({
    queryKey: QUERY_KEYS.beneficiaries,
    queryFn: getBeneficiaries,
    enabled: !!currentUser
  });
}

export function useCreateBeneficiaryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBeneficiary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.beneficiaries });
    }
  });
}

export function useUpdateBeneficiaryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ benId, data }: { benId: string; data: Partial<Beneficiary> }) => updateBeneficiary(benId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.beneficiaries });
    }
  });
}

// ------------------- CYCLE HOOKS -------------------
export function useCyclesQuery() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const setupSubscription = async () => {
      const info = await getSubscriptionQueryInfo();
      if (!info) return;

      const { solIds, isManager } = info;
      let q = query(collection(db, 'cycles'));
      if (!isManager) {
        if (solIds.length === 0) {
          queryClient.setQueryData(QUERY_KEYS.cycles, []);
          return;
        }
        q = query(collection(db, 'cycles'), where('solId', 'in', solIds));
      }

      return onSnapshot(q, (snapshot) => {
        const list: Cycle[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Cycle);
        });
        queryClient.setQueryData(QUERY_KEYS.cycles, list);
      });
    };

    let unsubPromise = setupSubscription();
    return () => {
      unsubPromise.then(unsub => unsub?.());
    };
  }, [currentUser, queryClient]);

  return useQuery<Cycle[]>({
    queryKey: QUERY_KEYS.cycles,
    queryFn: getCycles,
    enabled: !!currentUser
  });
}

export function useCreateCycleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cycles });
    }
  });
}

export function useUpdateCycleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cycleId, data }: { cycleId: string; data: Partial<Cycle> }) => updateCycle(cycleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cycles });
    }
  });
}

// ------------------- NOTIFICATION HOOKS -------------------
export function useNotificationsQuery() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const setupSubscription = async () => {
      const info = await getSubscriptionQueryInfo();
      if (!info) return;

      const { solIds, isManager } = info;
      let q = query(collection(db, 'notifications'));
      if (!isManager) {
        if (solIds.length === 0) {
          queryClient.setQueryData(QUERY_KEYS.notifications, []);
          return;
        }
        q = query(collection(db, 'notifications'), where('solId', 'in', solIds));
      }

      return onSnapshot(q, (snapshot) => {
        const list: SolNotification[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            title: data.title || '',
            message: data.message || '',
            category: data.category || 'member_joined',
            date: data.date || '',
            read: data.read ?? false,
            solId: data.solId || ''
          });
        });
        queryClient.setQueryData(QUERY_KEYS.notifications, list);
      });
    };

    let unsubPromise = setupSubscription();
    return () => {
      unsubPromise.then(unsub => unsub?.());
    };
  }, [currentUser, queryClient]);

  return useQuery<SolNotification[]>({
    queryKey: QUERY_KEYS.notifications,
    queryFn: getNotifications,
    enabled: !!currentUser
  });
}

export function useCreateNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
    }
  });
}

export function useUpdateNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ notifId, data }: { notifId: string; data: Partial<SolNotification> }) => updateNotification(notifId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
    }
  });
}
