import { SolGroup, Member, Contribution, Beneficiary, Cycle, SolNotification, UserSession, Invitation } from './types';

export const mockUsers: UserSession[] = [
  {
    id: "user-marie",
    name: "Marie Carmel Pierre",
    email: "marie.carmel@sòlayiti.com",
    phone: "+509 3744-1234",
    role: "maman_sol",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "user-jean",
    name: "Jean-Claude Baptiste",
    email: "jc.baptiste@hotmail.com",
    phone: "+509 4655-9876",
    role: "member",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "user-fabienne",
    name: "Fabienne Chery",
    email: "fabienne.chery09@gmail.com",
    phone: "+509 3211-4567",
    role: "member",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "user-pierre",
    name: "Pierre Wesley",
    email: "pierre.wesley@outlook.com",
    phone: "+509 4123-5678",
    role: "member",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
  }
];

export const initialMembers: Member[] = [
  {
    id: "user-marie",
    name: "Marie Carmel Pierre",
    email: "marie.carmel@sòlayiti.com",
    phone: "+509 3744-1234",
    role: "maman_sol",
    status: "active",
    joinedAt: "2026-01-10",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    solIds: ["sol-1", "sol-2"]
  },
  {
    id: "user-jean",
    name: "Jean-Claude Baptiste",
    email: "jc.baptiste@hotmail.com",
    phone: "+509 4655-9876",
    role: "member",
    status: "active",
    joinedAt: "2026-02-01",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    solIds: ["sol-1"]
  },
  {
    id: "user-fabienne",
    name: "Fabienne Chery",
    email: "fabienne.chery09@gmail.com",
    phone: "+509 3211-4567",
    role: "member",
    status: "active",
    joinedAt: "2026-02-02",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    solIds: ["sol-1", "sol-2"]
  },
  {
    id: "user-dieuseul",
    name: "Dieuseul Joseph",
    email: "dieuseul.joseph@gmail.com",
    phone: "+509 3888-0012",
    role: "member",
    status: "active",
    joinedAt: "2026-02-03",
    avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
    solIds: ["sol-1", "sol-2"]
  },
  {
    id: "user-lunise",
    name: "Lunise Celestin",
    email: "lunise.celestin@gmail.com",
    phone: "+509 3445-5656",
    role: "member",
    status: "active",
    joinedAt: "2026-02-05",
    avatarUrl: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80",
    solIds: ["sol-1"]
  },
  {
    id: "user-claudette",
    name: "Claudette Dorval",
    email: "claudette.dorval@yahoo.fr",
    phone: "+509 3110-2233",
    role: "member",
    status: "active",
    joinedAt: "2026-02-08",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    solIds: ["sol-1", "sol-2"]
  },
  {
    id: "user-pierre",
    name: "Pierre Wesley",
    email: "pierre.wesley@outlook.com",
    phone: "+509 4123-5678",
    role: "member",
    status: "pending",
    joinedAt: "2026-06-15",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    solIds: []
  }
];

export const initialSols: SolGroup[] = [
  {
    id: "sol-1",
    name: "Sòl Klas 2026 (Zanmi Petyonvil)",
    description: "Sòl sa a se pou zanmi klas 2026 Petyonvil yo k ap prepare yon bèl vwayaj vakans ansanm. Kotizasyon an rapid chak semèn.",
    contributionAmount: 2500, // 2500 HTG
    frequency: "weekly",
    totalPot: 15000, // 2,500 * 6 members
    status: "active",
    creatorId: "user-marie",
    currentCycleId: "cycle-1-1",
    cycleNumber: 1,
    maxMembers: 6,
    rules: "1. Chak moun dwe peye kotizasyon yo anvan samdi a 4è nan apremidi.\n2. Reta plis pase 24 è dwe esplike bay Maman Sòl.\n3. Si yon moun an reta san koz valab, y ap pouse men li de (2) plas dèyè.\n4. Lajan touche a ap remèt an MonCash oswa Cash an dirèk.",
    tirayMethod: "random",
    createdAt: "2026-06-01"
  },
  {
    id: "sol-2",
    name: "Sòl Ti Komès Delmas 32",
    description: "Sòl solidite pou ti machann ak mikwo-antreprenè nan zòn Delmas 32 pou ogmante kapital aktivite komèsyal yo.",
    contributionAmount: 10000, // 10000 HTG
    frequency: "monthly",
    totalPot: 40000, // 10,000 * 4 members (Marie, Fabienne, Dieuseul, Claudette)
    status: "active",
    creatorId: "user-marie",
    currentCycleId: "cycle-2-1",
    cycleNumber: 1,
    maxMembers: 4,
    rules: "1. Vèsman yo dwe fèt pi ta nan dat 5 nan chak mwa.\n2. Tout reta gen yon penalite 500 HTG ki pral mete nan ti kès sekou gwoup la.\n3. Lòd tiray la te fèt an piblik nan premye reyinyon nou an.\n4. Peman yo fèt pa transfè Sogebank oswa MonCash.",
    tirayMethod: "manual",
    createdAt: "2026-05-15"
  }
];

export const initialCycles: Cycle[] = [
  {
    id: "cycle-1-1",
    solId: "sol-1",
    cycleNumber: 1,
    startDate: "2026-06-01",
    endDate: "2026-07-12",
    status: "active",
    currentHandPosition: 2, // 2nd hand is currently active (Marie)
    totalHands: 6
  },
  {
    id: "cycle-2-1",
    solId: "sol-2",
    cycleNumber: 1,
    startDate: "2026-05-15",
    endDate: "2026-09-15",
    status: "active",
    currentHandPosition: 1, // 1st hand currently active (Fabienne Chery)
    totalHands: 4
  }
];

export const initialBeneficiaries: Beneficiary[] = [
  // Sòl Klas 2026 (weekly rotation order)
  {
    id: "ben-1-1",
    solId: "sol-1",
    cycleId: "cycle-1-1",
    memberId: "user-fabienne",
    memberName: "Fabienne Chery",
    position: 1,
    payoutDate: "2026-06-07",
    status: "completed",
    payoutAmount: 15000
  },
  {
    id: "ben-1-2",
    solId: "sol-1",
    cycleId: "cycle-1-1",
    memberId: "user-marie",
    memberName: "Marie Carmel Pierre",
    position: 2,
    payoutDate: "2026-06-14",
    status: "current", // Active hand!
    payoutAmount: 15000
  },
  {
    id: "ben-1-3",
    solId: "sol-1",
    cycleId: "cycle-1-1",
    memberId: "user-jean",
    memberName: "Jean-Claude Baptiste",
    position: 3,
    payoutDate: "2026-06-21",
    status: "upcoming",
    payoutAmount: 15000
  },
  {
    id: "ben-1-4",
    solId: "sol-1",
    cycleId: "cycle-1-1",
    memberId: "user-dieuseul",
    memberName: "Dieuseul Joseph",
    position: 4,
    payoutDate: "2026-06-28",
    status: "upcoming",
    payoutAmount: 15000
  },
  {
    id: "ben-1-5",
    solId: "sol-1",
    cycleId: "cycle-1-1",
    memberId: "user-claudette",
    memberName: "Claudette Dorval",
    position: 5,
    payoutDate: "2026-07-05",
    status: "upcoming",
    payoutAmount: 15000
  },
  {
    id: "ben-1-6",
    solId: "sol-1",
    cycleId: "cycle-1-1",
    memberId: "user-lunise",
    memberName: "Lunise Celestin",
    position: 6,
    payoutDate: "2026-07-12",
    status: "upcoming",
    payoutAmount: 15000
  },

  // Sòl Ti Komès Delmas 32 (monthly rotation order)
  {
    id: "ben-2-1",
    solId: "sol-2",
    cycleId: "cycle-2-1",
    memberId: "user-fabienne",
    memberName: "Fabienne Chery",
    position: 1,
    payoutDate: "2026-06-15",
    status: "current",
    payoutAmount: 40000
  },
  {
    id: "ben-2-2",
    solId: "sol-2",
    cycleId: "cycle-2-1",
    memberId: "user-dieuseul",
    memberName: "Dieuseul Joseph",
    position: 2,
    payoutDate: "2026-07-15",
    status: "upcoming",
    payoutAmount: 40000
  },
  {
    id: "ben-2-3",
    solId: "sol-2",
    cycleId: "cycle-2-1",
    memberId: "user-marie",
    memberName: "Marie Carmel Pierre",
    position: 3,
    payoutDate: "2026-08-15",
    status: "upcoming",
    payoutAmount: 40000
  },
  {
    id: "ben-2-4",
    solId: "sol-2",
    cycleId: "cycle-2-1",
    memberId: "user-claudette",
    memberName: "Claudette Dorval",
    position: 4,
    payoutDate: "2026-09-15",
    status: "upcoming",
    payoutAmount: 40000
  }
];

export const initialContributions: Contribution[] = [
  // Sòl Klas 2026 (Marie Carmel Pierre, Jean-Claude, Fabienne, Dieuseul, Claudette, Lunise)
  // Week 1: Due June 7, 2026 - All paid!
  { id: "c-1-1", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-marie", amount: 2500, dueDate: "2026-06-07", paidDate: "2026-06-05", status: "paid" },
  { id: "c-1-2", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-jean", amount: 2500, dueDate: "2026-06-07", paidDate: "2026-06-06", status: "paid" },
  { id: "c-1-3", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-fabienne", amount: 2500, dueDate: "2026-06-07", paidDate: "2026-06-07", status: "paid" },
  { id: "c-1-4", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-dieuseul", amount: 2500, dueDate: "2026-06-07", paidDate: "2026-06-05", status: "paid" },
  { id: "c-1-5", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-claudette", amount: 2500, dueDate: "2026-06-07", paidDate: "2026-06-04", status: "paid" },
  { id: "c-1-6", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-lunise", amount: 2500, dueDate: "2026-06-07", paidDate: "2026-06-06", status: "paid" },

  // Week 2: Due June 14, 2026 - Payout for Marie. All paid except Jean-Claude who paid late, and Lunise who just paid
  { id: "c-2-1", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-marie", amount: 2500, dueDate: "2026-06-14", paidDate: "2026-06-12", status: "paid" },
  { id: "c-2-2", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-jean", amount: 2500, dueDate: "2026-06-14", paidDate: "2026-06-16", status: "paid" }, // paid late
  { id: "c-2-3", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-fabienne", amount: 2500, dueDate: "2026-06-14", paidDate: "2026-06-13", status: "paid" },
  { id: "c-2-4", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-dieuseul", amount: 2500, dueDate: "2026-06-14", paidDate: "2026-06-14", status: "paid" },
  { id: "c-2-5", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-claudette", amount: 2500, dueDate: "2026-06-14", paidDate: "2026-06-11", status: "paid" },
  { id: "c-2-6", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-lunise", amount: 2500, dueDate: "2026-06-14", paidDate: "2026-06-14", status: "paid" },

  // Week 3: Due June 21, 2026 (UPCOMING!)
  // Marie and Fabienne already paid early! Jean-Claude is pending. Lunise is late.
  { id: "c-3-1", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-marie", amount: 2500, dueDate: "2026-06-21", paidDate: "2026-06-18", status: "paid" },
  { id: "c-3-2", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-jean", amount: 2500, dueDate: "2026-06-21", status: "pending" },
  { id: "c-3-3", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-fabienne", amount: 2500, dueDate: "2026-06-21", paidDate: "2026-06-19", status: "paid" },
  { id: "c-3-4", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-dieuseul", amount: 2500, dueDate: "2026-06-21", status: "pending" },
  { id: "c-3-5", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-claudette", amount: 2500, dueDate: "2026-06-21", status: "pending" },
  { id: "c-3-6", solId: "sol-1", cycleId: "cycle-1-1", memberId: "user-lunise", amount: 2500, dueDate: "2026-06-21", status: "late" }, // flagged late since she typically delays on weekly cycles

  // Sòl Ti Komès Delmas 32 (Marie, Fabienne, Dieuseul, Claudette)
  // Month 1: Due June 15, 2026 - All paid! Hand 1 (Fabienne) was disbursed 40,000 HTG.
  { id: "c-d-1", solId: "sol-2", cycleId: "cycle-2-1", memberId: "user-marie", amount: 10000, dueDate: "2026-06-15", paidDate: "2026-06-10", status: "paid" },
  { id: "c-d-2", solId: "sol-2", cycleId: "cycle-2-1", memberId: "user-fabienne", amount: 10000, dueDate: "2026-06-15", paidDate: "2026-06-15", status: "paid" },
  { id: "c-d-3", solId: "sol-2", cycleId: "cycle-2-1", memberId: "user-dieuseul", amount: 10000, dueDate: "2026-06-15", paidDate: "2026-06-14", status: "paid" },
  { id: "c-d-4", solId: "sol-2", cycleId: "cycle-2-1", memberId: "user-claudette", amount: 10000, dueDate: "2026-06-15", paidDate: "2026-06-12", status: "paid" }
];

export const initialInvitations: Invitation[] = [
  {
    id: "inv-1",
    solId: "sol-2",
    solName: "Sòl Ti Komès Delmas 32",
    email: "pierre.wesley@outlook.com",
    name: "Pierre Wesley",
    status: "sent",
    dateSent: "2026-06-15"
  }
];

export const initialNotifications: SolNotification[] = [
  {
    id: "notif-1",
    title: "Kotizasyon Sòl Klas deklare",
    message: "Kotizasyon Semèn #3 dwe fèt anvan 21 jwen 2026. Kantite: 2500 HTG.",
    category: "contribution_due",
    date: "2026-06-17",
    read: false,
    solId: "sol-1"
  },
  {
    id: "notif-2",
    title: "Sòl lanse avèk siksè",
    message: "Sòl Ti Komès Delmas 32 la te kòmanse premye sik wotasyon li.",
    category: "cycle_started",
    date: "2026-06-15",
    read: true,
    solId: "sol-2"
  },
  {
    id: "notif-3",
    title: "Marie Carmel Pierre touche men #1",
    message: "Men #1 nan Sòl Klas 2026 la te peye Marie Carmel Pierre.",
    category: "beneficiary_selected",
    date: "2026-06-07",
    read: true,
    solId: "sol-1"
  }
];
