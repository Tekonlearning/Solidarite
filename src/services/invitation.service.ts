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
import { Invitation, SolGroup, Membership, UserSession } from '../types';
import { runWithRetry, getPaginatedQuery, PaginationOptions, PaginatedResult } from './firestore-utils';

export const invitationService = {
  /**
   * Retrieves an invitation document by ID with retry.
   */
  async getInvitation(invId: string): Promise<Invitation | null> {
    if (!invId) throw new Error('invId is required.');
    return runWithRetry(async () => {
      const ref = doc(db, 'invitations', invId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as Invitation;
      }
      return null;
    });
  },

  /**
   * Creates a new invitation document
   */
  async createInvitation(invitation: Invitation): Promise<void> {
    if (!invitation.id) throw new Error('Invitation ID is required.');
    const ref = doc(db, 'invitations', invitation.id);
    return runWithRetry(async () => {
      await setDoc(ref, invitation);
    });
  },

  /**
   * Updates an invitation document
   */
  async updateInvitation(invId: string, updates: Partial<Omit<Invitation, 'id' | 'solId'>>): Promise<void> {
    if (!invId) throw new Error('invId is required.');
    const ref = doc(db, 'invitations', invId);
    return runWithRetry(async () => {
      await updateDoc(ref, updates);
    });
  },

  /**
   * Queries the database for all invitations in a specific Sòl group
   */
  async getInvitationsBySol(solId: string): Promise<Invitation[]> {
    if (!solId) throw new Error('solId is required.');
    return runWithRetry(async () => {
      const ref = collection(db, 'invitations');
      const q = query(ref, where('solId', '==', solId));
      const querySnap = await getDocs(q);
      
      const list: Invitation[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as Invitation);
      });
      return list;
    });
  },

  /**
   * Queries the database for all invitations sent to a specific email address
   */
  async getInvitationsByEmail(email: string): Promise<Invitation[]> {
    if (!email) throw new Error('email is required.');
    return runWithRetry(async () => {
      const ref = collection(db, 'invitations');
      const q = query(ref, where('email', '==', email.toLowerCase().trim()));
      const querySnap = await getDocs(q);
      
      const list: Invitation[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as Invitation);
      });
      return list;
    });
  },

  /**
   * Accepts an invitation, marking it as 'accepted', creating a corresponding active membership,
   * and updating the associated Sòl group's stats within an atomic Firestore transaction.
   */
  async acceptInvitation(invId: string, currentUser: UserSession): Promise<void> {
    if (!invId) throw new Error('invId is required.');
    if (!currentUser || !currentUser.id) throw new Error('Valid currentUser with ID is required to accept an invitation.');

    return runWithRetry(async () => {
      await runTransaction(db, async (transaction) => {
        const invRef = doc(db, 'invitations', invId);
        const invSnap = await transaction.get(invRef);
        if (!invSnap.exists()) throw new Error(`Invitation with ID ${invId} not found.`);
        const invitation = invSnap.data() as Invitation;

        if (invitation.status !== 'sent') {
          throw new Error(`Invitation cannot be accepted because its status is '${invitation.status}'.`);
        }

        // 1. Mark invitation as accepted
        transaction.update(invRef, { status: 'accepted' });

        // 2. Read Sòl group
        const solRef = doc(db, 'sols', invitation.solId);
        const solSnap = await transaction.get(solRef);
        if (!solSnap.exists()) throw new Error(`Sòl group ${invitation.solId} not found.`);
        const solG = solSnap.data() as SolGroup;

        // 3. Create membership document using deterministic `${userId}_${solId}` format
        const membershipId = `${currentUser.id}_${invitation.solId}`;
        const membershipRef = doc(db, 'memberships', membershipId);
        
        const newMembership: Membership = {
          id: membershipId,
          solId: invitation.solId,
          userId: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone,
          role: 'member',
          status: 'active',
          joinedAt: new Date().toISOString().split('T')[0],
          avatarUrl: currentUser.avatarUrl
        };
        transaction.set(membershipRef, newMembership);

        // 4. Recalculate members count and update Sòl group's totalPot capacity
        const membershipsSnap = await getDocs(
          query(collection(db, 'memberships'), where('solId', '==', invitation.solId))
        );
        const totalMembers = membershipsSnap.size + 1; // including the one we are creating right now in transaction
        
        transaction.update(solRef, {
          totalPot: solG.contributionAmount * totalMembers
        });

        // 5. Create joined notification
        const newNotifId = `notif-joined-${Date.now()}`;
        const newNotifRef = doc(db, 'notifications', newNotifId);
        transaction.set(newNotifRef, {
          id: newNotifId,
          title: 'Manm Antre nan Sòl la',
          message: `${currentUser.name} joined the group Sòl "${solG.name}".`,
          category: 'member_joined',
          date: new Date().toISOString().split('T')[0],
          read: false,
          solId: invitation.solId
        });
      });
    });
  },

  /**
   * Paginated retrieval of invitations for a Sòl group
   */
  async getInvitationsBySolPaginated(solId: string, options: PaginationOptions): Promise<PaginatedResult<Invitation>> {
    if (!solId) throw new Error('solId is required.');
    return runWithRetry(async () => {
      const ref = collection(db, 'invitations');
      const baseQuery = query(ref, where('solId', '==', solId));
      return getPaginatedQuery<Invitation>(baseQuery, {
        ...options,
        collectionName: 'invitations'
      });
    });
  }
};
