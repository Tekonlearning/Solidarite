export type Language = 'creole' | 'french' | 'english';

export type Frequency = 'daily' | 'weekly' | 'every_15_days' | 'monthly' | 'biweekly';

export interface SolGroup {
  id: string;
  name: string;
  description: string;
  contributionAmount: number;
  frequency: Frequency;
  totalPot: number; // calculated as contributionAmount * members.length
  status: 'upcoming' | 'active' | 'completed';
  creatorId: string;
  currentCycleId: string;
  cycleNumber: number;
  maxMembers: number;
  rules: string;
  tirayMethod: 'random' | 'first_come' | 'manual'; // Tiray = Drawing order
  createdAt: string;
  autoAssignMembers?: boolean;
  autoAssignWeightBasis?: 'uniform' | 'punctuality' | 'need';
  memberTiers?: {
    [memberId: string]: {
      tierAmount: number;
      goalAmount?: number;
    };
  };
}

export type MemberStatus = 'active' | 'pending' | 'suspended' | 'removed';
export type MemberRole = 'maman_sol' | 'member'; // "Maman Sòl" is the traditional term for the Sòl manager in Haiti

export interface Membership {
  id: string; // Document ID: `${userId}_${solId}`
  solId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
  avatarUrl?: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
  avatarUrl?: string;
  solIds: string[];
  solId?: string;
  userId?: string;
}

export type ContributionStatus = 'pending' | 'paid' | 'late';

export interface Contribution {
  id: string;
  solId: string;
  cycleId: string;
  memberId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: ContributionStatus;
  paymentMethod?: string;
}

export type BeneficiaryStatus = 'upcoming' | 'current' | 'completed';

export interface Beneficiary {
  id: string;
  solId: string;
  cycleId: string;
  memberId: string;
  memberName: string;
  position: number; // Hand order (e.g. 1st hand, 2nd hand...)
  payoutDate: string;
  status: BeneficiaryStatus;
  payoutAmount: number;
}

export interface Cycle {
  id: string;
  solId: string;
  cycleNumber: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed';
  currentHandPosition: number; // index of currently active hand
  totalHands: number;
  totalCollected?: number;
}

export interface Invitation {
  id: string;
  solId: string;
  solName: string;
  email: string;
  name: string;
  status: 'sent' | 'accepted' | 'expired';
  dateSent: string;
}

export interface SolNotification {
  id: string;
  title: string;
  message: string;
  category: 'contribution_due' | 'contribution_late' | 'beneficiary_selected' | 'member_joined' | 'cycle_started' | 'cycle_completed' | 'invitation_received';
  date: string;
  read: boolean;
  solId?: string;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: MemberRole;
  avatarUrl: string;
}
