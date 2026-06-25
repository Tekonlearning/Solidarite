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
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { SolGroup, Beneficiary, Cycle, SolNotification, Membership, Contribution, UserSession } from '../types';
import { runWithRetry, getPaginatedQuery, PaginationOptions, PaginatedResult } from './firestore-utils';

export const solService = {
  /**
   * Retrieves a Sòl group document by its unique ID
   */
  async getSol(solId: string): Promise<SolGroup | null> {
    if (!solId) throw new Error('solId is required.');
    return runWithRetry(async () => {
      const solRef = doc(db, 'sols', solId);
      const solSnap = await getDoc(solRef);
      if (solSnap.exists()) {
        return solSnap.data() as SolGroup;
      }
      return null;
    });
  },

  /**
   * Creates a Sòl group, initializes rotation schedules (tiray),
   * creates default hands/cycles and initial contribution plans using a write batch.
   */
  async createSol(
    newSolData: Omit<SolGroup, 'id' | 'currentCycleId' | 'cycleNumber' | 'createdAt'>,
    invitedEmails: string[],
    currentUser: UserSession,
    language: 'creole' | 'french' | 'english'
  ): Promise<string> {
    const newSolId = `sol-new-${Date.now()}`;
    const newCycleId = `cycle-new-${Date.now()}`;

    return runWithRetry(async () => {
      const batch = writeBatch(db);

      // 1. Setup Sòl Group data
      const createdSol: SolGroup = {
        ...newSolData,
        id: newSolId,
        currentCycleId: newCycleId,
        cycleNumber: 1,
        createdAt: new Date().toISOString().split('T')[0]
      };
      const solDocRef = doc(db, 'sols', newSolId);
      batch.set(solDocRef, createdSol);

      // 2. Add creator membership doc (Maman Sòl)
      const creatorMembershipId = `${currentUser.id}_${newSolId}`;
      const creatorMembershipRef = doc(db, 'memberships', creatorMembershipId);
      const creatorMembership: Membership = {
        id: creatorMembershipId,
        solId: newSolId,
        userId: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        role: 'maman_sol',
        status: 'active',
        joinedAt: new Date().toISOString().split('T')[0],
        avatarUrl: currentUser.avatarUrl
      };
      batch.set(creatorMembershipRef, creatorMembership);

      // 3. Setup core rotation queue ("Tiray")
      let lineParticipants = [currentUser.name, ...invitedEmails.map(email => email.split('@')[0])];
      
      if (createdSol.autoAssignMembers) {
        const weightedList = lineParticipants.map((name) => {
          let weight = 100;
          if (createdSol.autoAssignWeightBasis === 'punctuality') {
            weight = name === currentUser.name ? 100 : Math.floor(60 + Math.random() * 35);
          } else if (createdSol.autoAssignWeightBasis === 'need') {
            weight = name === currentUser.name ? 50 : 100 + Math.floor(Math.random() * 50);
          } else {
            weight = 100;
          }
          return { name, weight };
        });

        const sorted = weightedList
          .map(item => ({ ...item, key: Math.pow(Math.random(), 1 / item.weight) }))
          .sort((a, b) => b.key - a.key);

        lineParticipants = sorted.map(s => s.name);
      }

      const newBeneficiaries: Beneficiary[] = [];

      for (let index = 0; index < lineParticipants.length; index++) {
        const name = lineParticipants[index];
        const associatedUserId = name === currentUser.name ? currentUser.id : `guest-${index}-${Date.now()}`;
        
        const dateOffset = new Date();
        if (createdSol.frequency === 'daily') dateOffset.setDate(dateOffset.getDate() + (index + 1));
        else if (createdSol.frequency === 'weekly') dateOffset.setDate(dateOffset.getDate() + (index + 1) * 7);
        else if (createdSol.frequency === 'every_15_days') dateOffset.setDate(dateOffset.getDate() + (index + 1) * 15);
        else if (createdSol.frequency === 'biweekly') dateOffset.setDate(dateOffset.getDate() + (index + 1) * 14);
        else dateOffset.setMonth(dateOffset.getMonth() + (index + 1));

        const payoutDateStr = dateOffset.toISOString().split('T')[0];

        const b: Beneficiary = {
          id: `ben-new-${newSolId}-${index}-${Date.now()}`,
          solId: newSolId,
          cycleId: newCycleId,
          memberId: associatedUserId,
          memberName: name,
          position: index + 1,
          payoutDate: payoutDateStr,
          status: index === 0 ? 'current' : 'upcoming',
          payoutAmount: createdSol.contributionAmount * lineParticipants.length
        };

        const beneficiaryRef = doc(db, 'beneficiaries', b.id);
        batch.set(beneficiaryRef, b);
        newBeneficiaries.push(b);

        // Create pending memberships for guest invitees to track them in the system
        if (associatedUserId !== currentUser.id) {
          const guestMembershipId = `${associatedUserId}_${newSolId}`;
          const guestMembershipRef = doc(db, 'memberships', guestMembershipId);
          const guestMembership: Membership = {
            id: guestMembershipId,
            solId: newSolId,
            userId: associatedUserId,
            name: name,
            email: index < invitedEmails.length ? invitedEmails[index] : `${name}@example.com`,
            phone: "+509 3" + Math.floor(1000000 + Math.random() * 9000000),
            role: 'member',
            status: 'pending',
            joinedAt: new Date().toISOString().split('T')[0]
          };
          batch.set(guestMembershipRef, guestMembership);
        }
      }

      // 4. Setup primary Cycle structure
      const newCycle: Cycle = {
        id: newCycleId,
        solId: newSolId,
        cycleNumber: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: newBeneficiaries[newBeneficiaries.length - 1].payoutDate,
        status: 'active',
        currentHandPosition: 1,
        totalHands: lineParticipants.length
      };
      const cycleDocRef = doc(db, 'cycles', newCycleId);
      batch.set(cycleDocRef, newCycle);

      // 5. Setup contributions due for the first hand rotation!
      for (let index = 0; index < lineParticipants.length; index++) {
        const name = lineParticipants[index];
        const associatedUserId = name === currentUser.name ? currentUser.id : `guest-${index}-${Date.now()}`;
        
        const customAmount = createdSol.memberTiers?.[associatedUserId]?.tierAmount ?? createdSol.contributionAmount;
        const newContribId = `contrib-new-${newSolId}-${index}-${Date.now()}`;
        const contribRef = doc(db, 'contributions', newContribId);
        
        const initialContrib: Contribution = {
          id: newContribId,
          solId: newSolId,
          cycleId: newCycleId,
          memberId: associatedUserId,
          amount: customAmount,
          dueDate: newBeneficiaries[0].payoutDate,
          status: 'pending'
        };
        batch.set(contribRef, initialContrib);
      }

      // 6. Spawn launch system notification
      const solNotification: SolNotification = {
        id: `notif-c-${Date.now()}`,
        title: language === 'creole' ? 'Nouvo Sòl Kreye!' : 'Nouveau SOL Créé !',
        message: language === 'creole'
          ? `Sòl "${createdSol.name}" te kreye avèk siksè. Tiray la deklare premye men touche bay ${newBeneficiaries[0].memberName}.`
          : `Le groupe "${createdSol.name}" est lancé. Première distribution assignée à ${newBeneficiaries[0].memberName}.`,
        category: 'cycle_started',
        date: new Date().toISOString().split('T')[0],
        read: false,
        solId: newSolId
      };
      const notificationRef = doc(db, 'notifications', solNotification.id);
      batch.set(notificationRef, solNotification);

      await batch.commit();
      return newSolId;
    });
  },

  /**
   * Progresses Sòl rotation (closed hand disbursement, mobilizes next participant, Spawns new dues).
   * Rewritten to use strict Firestore transactions for state integrity.
   */
  async rotateHand(
    solId: string,
    language: 'creole' | 'french' | 'english'
  ): Promise<{ activeBenName: string; nextBenName: string }> {
    if (!solId) throw new Error('solId is required.');

    return runWithRetry(async () => {
      return await runTransaction(db, async (transaction) => {
        // 1. Read Sòl group details
        const solDocRef = doc(db, 'sols', solId);
        const solSnap = await transaction.get(solDocRef);
        if (!solSnap.exists()) throw new Error('Sòl group not found.');
        const solG = solSnap.data() as SolGroup;

        // 2. Read beneficiaries
        const beneficiariesSnap = await getDocs(
          query(collection(db, 'beneficiaries'), where('solId', '==', solId))
        );
        const fetchedBeneficiaries: Beneficiary[] = [];
        beneficiariesSnap.forEach(d => fetchedBeneficiaries.push(d.data() as Beneficiary));

        // Locate active beneficiary
        const activeBen = fetchedBeneficiaries.find(b => b.status === 'current');
        if (!activeBen) throw new Error('No active beneficiary found at current hand.');

        // Mark current beneficiary as completed
        const activeBenRef = doc(db, 'beneficiaries', activeBen.id);
        transaction.update(activeBenRef, { status: 'completed' });

        // Locate and update next beneficiary
        const nextBen = fetchedBeneficiaries.find(b => b.position === activeBen.position + 1);
        if (nextBen) {
          const nextBenRef = doc(db, 'beneficiaries', nextBen.id);
          transaction.update(nextBenRef, { status: 'current' });
        }

        // 3. Auto-resolve outstanding contributions for this rotation period
        const contributionsSnap = await getDocs(
          query(collection(db, 'contributions'), where('solId', '==', solId), where('cycleId', '==', solG.currentCycleId))
        );
        const fetchedContributions: Contribution[] = [];
        contributionsSnap.forEach(d => fetchedContributions.push(d.data() as Contribution));

        const outstanding = fetchedContributions.filter(c => c.status !== 'paid');
        for (const c of outstanding) {
          const contribRef = doc(db, 'contributions', c.id);
          transaction.update(contribRef, {
            status: 'paid',
            paidDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'Simulation'
          });
        }

        // 4. Increment hand cycle details
        const cycleDocRef = doc(db, 'cycles', solG.currentCycleId);
        const cycleSnap = await transaction.get(cycleDocRef);
        if (cycleSnap.exists()) {
          const activeCycle = cycleSnap.data() as Cycle;
          transaction.update(cycleDocRef, {
            currentHandPosition: activeCycle.currentHandPosition + 1
          });
        }

        // 5. Query active memberships to spawn new dues
        const membershipsSnap = await getDocs(
          query(collection(db, 'memberships'), where('solId', '==', solId))
        );
        const fetchedMemberships: Membership[] = [];
        membershipsSnap.forEach(d => fetchedMemberships.push(d.data() as Membership));
        const activeMemberships = fetchedMemberships.filter(m => m.status === 'active');

        if (nextBen) {
          for (let index = 0; index < activeMemberships.length; index++) {
            const mem = activeMemberships[index];
            const customAmount = solG.memberTiers?.[mem.userId]?.tierAmount ?? solG.contributionAmount;
            
            const newContribId = `contrib-spawn-${solId}-${mem.userId}-${index}-${Date.now()}`;
            const newContribRef = doc(db, 'contributions', newContribId);
            const nextContrib: Contribution = {
              id: newContribId,
              solId,
              cycleId: solG.currentCycleId,
              memberId: mem.userId,
              amount: customAmount,
              dueDate: nextBen.payoutDate,
              status: 'pending'
            };
            transaction.set(newContribRef, nextContrib);
          }
        }

        // 6. Send summary notifications
        const nextBenName = nextBen ? nextBen.memberName : (language === 'creole' ? 'Fini sèk' : 'Cycle Fini');
        const newNotifId = `notif-done-${Date.now()}`;
        const newNotifRef = doc(db, 'notifications', newNotifId);
        const newNotif: SolNotification = {
          id: newNotifId,
          title: language === 'creole' ? 'Distribisyon Men Fini!' : 'Main Clôturée avec Succès !',
          message: language === 'creole'
            ? `Lajan kès la te distribiye bay ${activeBen.memberName}. Pwochen men ki aktif se pou ${nextBenName}!`
            : `Le pot d'épargne a été versé à ${activeBen.memberName}. Le prochain tour revient à ${nextBenName}!`,
          category: 'beneficiary_selected',
          date: new Date().toISOString().split('T')[0],
          read: false,
          solId
        };
        transaction.set(newNotifRef, newNotif);

        return { activeBenName: activeBen.memberName, nextBenName };
      });
    });
  },

  /**
   * Invites a new member to the Sòl Group, creates membership/beneficiary records,
   * and recalculates pool values under a strict transaction.
   */
  async inviteMember(
    solId: string,
    name: string,
    email: string,
    language: 'creole' | 'french' | 'english'
  ): Promise<number> {
    if (!solId || !name || !email) throw new Error('solId, name, and email are required to invite.');

    return runWithRetry(async () => {
      return await runTransaction(db, async (transaction) => {
        const solDocRef = doc(db, 'sols', solId);
        const solSnap = await transaction.get(solDocRef);
        if (!solSnap.exists()) throw new Error('Sòl group not found.');
        const solG = solSnap.data() as SolGroup;

        // Fetch memberships count to calculate rotation positions
        const membershipsSnap = await getDocs(
          query(collection(db, 'memberships'), where('solId', '==', solId))
        );
        const fetchedMemberships: Membership[] = [];
        membershipsSnap.forEach(d => fetchedMemberships.push(d.data() as Membership));
        const totalMemberships = fetchedMemberships.length;

        const newUserId = `user-added-${Date.now()}`;
        const guestMembershipId = `${newUserId}_${solId}`;
        const guestMembershipRef = doc(db, 'memberships', guestMembershipId);

        const guestMembership: Membership = {
          id: guestMembershipId,
          solId,
          userId: newUserId,
          name,
          email,
          phone: "+509 3" + Math.floor(1000000 + Math.random() * 9000000),
          role: 'member',
          status: 'active',
          joinedAt: new Date().toISOString().split('T')[0],
          avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random()*100005)}?w=150&auto=format&fit=crop&q=80`
        };
        transaction.set(guestMembershipRef, guestMembership);

        // Fetch active cycle details
        const cycleDocRef = doc(db, 'cycles', solG.currentCycleId);
        const cycleSnap = await transaction.get(cycleDocRef);
        const activeCycle = cycleSnap.exists() ? (cycleSnap.data() as Cycle) : null;

        // Add beneficiary record
        const newBenId = `ben-spawn-${newUserId}-${Date.now()}`;
        const newBenRef = doc(db, 'beneficiaries', newBenId);
        const position = totalMemberships + 1;
        const payoutDateStr = new Date(Date.now() + position * 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const newBen: Beneficiary = {
          id: newBenId,
          solId,
          cycleId: activeCycle?.id || solG.currentCycleId,
          memberId: newUserId,
          memberName: name,
          position,
          payoutDate: payoutDateStr,
          status: 'upcoming',
          payoutAmount: solG.contributionAmount * position
        };
        transaction.set(newBenRef, newBen);

        // Update Sòl pot capacity
        const updatedPot = solG.contributionAmount * position;
        transaction.update(solDocRef, {
          totalPot: updatedPot
        });

        // Add joined notification
        const newNotifId = `notif-join-${Date.now()}`;
        const newNotifRef = doc(db, 'notifications', newNotifId);
        const newNotif: SolNotification = {
          id: newNotifId,
          title: language === 'creole' ? 'Nouvo Manm Antre!' : 'Nouveau Membre Arrivé !',
          message: language === 'creole'
            ? `${name} joined Sòl "${solG.name}".`
            : `${name} a rejoint le groupe "${solG.name}".`,
          category: 'member_joined',
          date: new Date().toISOString().split('T')[0],
          read: false,
          solId
        };
        transaction.set(newNotifRef, newNotif);

        return position;
      });
    });
  },

  /**
   * Updates contribution tier and goal for a specific member in the Sòl Group, 
   * and dynamically updates the overall Sòl group pot within an atomic transaction.
   */
  async updateMemberTier(
    solId: string,
    memberId: string,
    tierAmount: number,
    goalAmount?: number
  ): Promise<void> {
    if (!solId || !memberId) throw new Error('Both solId and memberId are required.');

    return runWithRetry(async () => {
      await runTransaction(db, async (transaction) => {
        const solDocRef = doc(db, 'sols', solId);
        const solSnap = await transaction.get(solDocRef);
        if (!solSnap.exists()) throw new Error('Sòl group not found');
        const solG = solSnap.data() as SolGroup;

        const memberTiers = solG.memberTiers || {};
        memberTiers[memberId] = {
          tierAmount,
          ...(goalAmount !== undefined ? { goalAmount } : {})
        };

        // Recalculate totalPot based on new tiers + default contributions for members without custom tiers
        const membershipsSnap = await getDocs(
          query(collection(db, 'memberships'), where('solId', '==', solId))
        );
        const memberIds: string[] = [];
        membershipsSnap.forEach(d => memberIds.push(d.data().userId));

        const totalPot = memberIds.length > 0
          ? memberIds.reduce((sum, mId) => {
              const tier = memberTiers[mId];
              return sum + (tier ? tier.tierAmount : solG.contributionAmount);
            }, 0)
          : solG.contributionAmount * solG.maxMembers;

        transaction.update(solDocRef, {
          memberTiers,
          totalPot
        });
      });
    });
  },

  /**
   * Queries the database for all Sòl groups created by a specific user
   */
  async getSolsByCreator(creatorId: string): Promise<SolGroup[]> {
    if (!creatorId) throw new Error('creatorId is required.');
    return runWithRetry(async () => {
      const solsRef = collection(db, 'sols');
      const q = query(solsRef, where('creatorId', '==', creatorId));
      const querySnap = await getDocs(q);
      
      const list: SolGroup[] = [];
      querySnap.forEach((doc) => {
        list.push(doc.data() as SolGroup);
      });
      return list;
    });
  },

  /**
   * Paginated retrieval of Sòls for a specific creator.
   */
  async getSolsByCreatorPaginated(creatorId: string, options: PaginationOptions): Promise<PaginatedResult<SolGroup>> {
    if (!creatorId) throw new Error('creatorId is required.');
    return runWithRetry(async () => {
      const solsRef = collection(db, 'sols');
      const baseQuery = query(solsRef, where('creatorId', '==', creatorId));
      return getPaginatedQuery<SolGroup>(baseQuery, {
        ...options,
        collectionName: 'sols'
      });
    });
  }
};
