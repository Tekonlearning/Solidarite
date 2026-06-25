import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Calendar, 
  DollarSign, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  PlusCircle, 
  UserPlus, 
  Users, 
  Bell, 
  FileText, 
  CheckCircle2, 
  TrendingUp, 
  Handshake,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  Award,
  Target,
  Shield,
  Coins,
  Trash2,
  Activity,
  Heart
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Language, SolGroup, Member, Contribution, Beneficiary, UserSession, SolNotification, Cycle } from '../types';
import { translations } from '../translations';
import BentoCard from './BentoCard';
import MemberProfileModal from './MemberProfileModal';

interface DashboardProps {
  currentLanguage: Language;
  sols: SolGroup[];
  members: Member[];
  contributions: Contribution[];
  beneficiaries: Beneficiary[];
  currentUser: UserSession;
  notifications: SolNotification[];
  cycles: Cycle[];
  onCreateSolClick: () => void;
  onSelectSol: (solId: string) => void;
  onPayContribution: (contribId: string) => void;
}

export default function Dashboard({
  currentLanguage,
  sols,
  members,
  contributions,
  beneficiaries,
  currentUser,
  notifications,
  cycles,
  onCreateSolClick,
  onSelectSol,
  onPayContribution
}: DashboardProps) {
  const t = translations[currentLanguage];

  // Filters for current user Sols
  const userMemberships = members.find(m => m.id === currentUser.id)?.solIds || [];
  const userSols = sols.filter(s => s.creatorId === currentUser.id || userMemberships.includes(s.id));
  
  // Outstanding contributions for currentUser
  const userPendingContribs = contributions.filter(
    c => c.memberId === currentUser.id && c.status !== 'paid'
  );

  // Stats calculations
  const totalCirculating = userSols.reduce((acc, s) => acc + s.totalPot, 0);
  const outstandingOwed = userPendingContribs.reduce((acc, c) => acc + c.amount, 0);
  const totalHandsReceived = beneficiaries.filter(
    b => b.memberId === currentUser.id && b.status === 'completed'
  ).reduce((acc, b) => acc + b.payoutAmount, 0);

  const getFrequencyLabel = (freq: string) => {
    if (freq === 'daily') return t.freqDaily;
    if (freq === 'weekly') return t.freqWeekly;
    if (freq === 'every_15_days') return t.freqEvery15Days;
    if (freq === 'biweekly') return t.freqBiweekly;
    return t.freqMonthly;
  };

  // Primary focus Sòl
  const primarySol = userSols[0];
  const primarySolMembers = primarySol ? members.filter(m => m.solIds.includes(primarySol.id)) : [];
  const primarySolBeneficiaries = primarySol ? beneficiaries.filter(b => b.solId === primarySol.id).sort((a,b) => a.position - b.position) : [];
  
  const userProjectedPayouts = React.useMemo(() => {
    return userSols.map(sol => {
      const solBen = beneficiaries.filter(b => b.solId === sol.id);
      const userBen = solBen.find(b => b.memberId === currentUser.id);
      
      let daysRemaining = 0;
      if (userBen && userBen.status === 'upcoming') {
        const due = new Date(userBen.payoutDate).getTime();
        const now = Date.now();
        daysRemaining = Math.max(0, Math.ceil((due - now) / (1000 * 60 * 60 * 24)));
      }
      
      return {
        solId: sol.id,
        solName: sol.name,
        position: userBen?.position || 0,
        payoutDate: userBen?.payoutDate || 'N/A',
        status: userBen?.status || 'upcoming',
        payoutAmount: userBen?.payoutAmount || 0,
        daysRemaining
      };
    }).filter(item => item.position > 0);
  }, [userSols, beneficiaries, currentUser.id]);

  const primarySolActiveBeneficiary = primarySolBeneficiaries.find(b => b.status === 'current');
  const completedHandsCount = primarySolBeneficiaries.filter(b => b.status === 'completed').length;
  const totalHandsCount = primarySolBeneficiaries.length || 1;
  const progressPercent = Math.round((completedHandsCount / totalHandsCount) * 100);

  // Calculate top contributors within the user's Sòl groups
  const topContributors = members
    .map(m => {
      const userSolIds = userSols.map(s => s.id);
      const paidContributions = contributions.filter(
        c => m.solIds.includes(c.solId) && c.memberId === m.id && c.status === 'paid' && userSolIds.includes(c.solId)
      );
      const totalAmount = paidContributions.reduce((sum, c) => sum + c.amount, 0);
      return {
        id: m.id,
        name: m.name,
        totalAmount,
        count: paidContributions.length
      };
    })
    .filter(stat => stat.totalAmount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);

  // Sòl Financial Goals state & handlers
  const [selectedGoalSolId, setSelectedGoalSolId] = useState<string>(primarySol?.id || 'sol-1');

  const [goals, setGoals] = useState<{ id: string; solId: string; objective: string; target: number; current: number }[]>(() => {
    try {
      const saved = localStorage.getItem('sol_financial_goals');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      { id: 'g-1', solId: 'sol-1', objective: 'Kès Sosyal (Social Fund)', target: 50000, current: 15000 },
      { id: 'g-2', solId: 'sol-1', objective: 'Rezèv l-Ijans (Emergency Reserves)', target: 30000, current: 10000 },
      { id: 'g-3', solId: 'sol-2', objective: 'Fon Solidarite Koperativ', target: 100000, current: 40000 },
      { id: 'g-4', solId: 'sol-1', objective: 'Kado pou Manm yo (End of Year)', target: 20000, current: 5000 }
    ];
  });

  const [newGoalObjective, setNewGoalObjective] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState('');
  const [editCurrent, setEditCurrent] = useState('');

  const currentGoalSol = sols.find(s => s.id === selectedGoalSolId);
  const isGoalSolManager = currentGoalSol?.creatorId === currentUser.id;

  // Sòl Health selected ID and score calculation
  const [selectedHealthSolId, setSelectedHealthSolId] = useState<string>(primarySol?.id || 'sol-1');

  // Maman Sòl member directory search and filter state
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberFilterSolId, setMemberFilterSolId] = useState('all');

  // Find all Sòl groups managed by the current Maman Sòl (where creatorId is currentUser.id)
  const managedSols = React.useMemo(() => {
    return sols.filter(s => s.creatorId === currentUser.id);
  }, [sols, currentUser.id]);

  // Find all unique members across all managed Sòl groups
  const managedMembers = React.useMemo(() => {
    if (managedSols.length === 0) return [];
    const memberMap = new Map<string, Member>();
    managedSols.forEach(sol => {
      members.forEach(member => {
        if (member.solIds.includes(sol.id)) {
          memberMap.set(member.id, member);
        }
      });
    });
    return Array.from(memberMap.values());
  }, [managedSols, members]);

  // Selected member profile state for modal
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<Member | null>(null);

  // Financial Health summary card calculation across all managed Sòl groups
  const managedSolsStats = React.useMemo(() => {
    const totalActiveMembersCount = managedMembers.length;
    // Total funds in circulation across managed groups
    const totalFundsInCirculationAmount = managedSols.reduce((acc, s) => acc + (s.totalPot || 0), 0);

    // Upcoming payouts for managed groups (payoutDate is sorted chronological)
    const upcomingPayoutsList = beneficiaries
      .filter(b => managedSols.some(s => s.id === b.solId) && b.status !== 'completed')
      .map(b => {
        const solGroup = managedSols.find(s => s.id === b.solId);
        return {
          id: b.id,
          memberName: b.memberName,
          solName: solGroup?.name || 'Unknown',
          payoutDate: b.payoutDate,
          payoutAmount: b.payoutAmount,
          status: b.status
        };
      })
      .sort((a, b) => a.payoutDate.localeCompare(b.payoutDate))
      .slice(0, 4);

    return {
      totalActiveMembersCount,
      totalFundsInCirculationAmount,
      upcomingPayoutsList
    };
  }, [managedSols, managedMembers, beneficiaries]);

  // Filter members based on search query and selected Sòl group
  const filteredManagedMembers = React.useMemo(() => {
    return managedMembers.filter(member => {
      const query = memberSearchQuery.toLowerCase().trim();
      const nameMatch = member.name.toLowerCase().includes(query) ||
                        (member.email && member.email.toLowerCase().includes(query)) ||
                        (member.phone && member.phone.includes(query));
                         
      if (!nameMatch) return false;

      if (memberFilterSolId !== 'all') {
        return member.solIds.includes(memberFilterSolId);
      }

      return true;
    });
  }, [managedMembers, memberSearchQuery, memberFilterSolId]);

  const solHealthData = React.useMemo(() => {
    const activeSol = sols.find(s => s.id === selectedHealthSolId);
    if (!activeSol) return { score: 0, consistency: 0, speed: 0, completion: 0, status: 'N/A', rating: 'N/A', color: 'text-slate-500', bg: 'bg-slate-50' };

    const solContribs = contributions.filter(c => c.solId === activeSol.id);
    const totalCount = solContribs.length || 1;
    const paidCount = solContribs.filter(c => c.status === 'paid').length;
    
    // 1. Contribution Consistency Score: percentage of paid contributions
    const consistency = Math.round((paidCount / totalCount) * 100);

    // 2. Payment Speed Score: depends on how many unpaid are overdue
    const nowMs = Date.now();
    const overdueCount = solContribs.filter(c => c.status !== 'paid' && new Date(c.dueDate).getTime() < nowMs).length;
    const speed = Math.max(45, 100 - (overdueCount * 12));

    // 3. Cycle Completion Rate: based on beneficiaries completed in the current cycle
    const solBen = beneficiaries.filter(b => b.solId === activeSol.id);
    const totalBenCount = solBen.length || 1;
    const completedBenCount = solBen.filter(b => b.status === 'completed').length;
    const completion = Math.round((completedBenCount / totalBenCount) * 100);

    // Overall Score: weighted average
    const score = Math.min(100, Math.max(0, Math.round((consistency * 0.4) + (speed * 0.3) + (completion * 0.3))));

    let status = 'Stabil / Stable';
    let rating = 'Ekselan / Excellent';
    let color = 'text-emerald-600';
    let bg = 'bg-emerald-50';

    if (score >= 90) {
      status = 'Ekselan / Excellent';
      rating = 'Ekselan';
      color = 'text-emerald-600';
      bg = 'bg-emerald-50';
    } else if (score >= 70) {
      status = 'Trè Bon / Très Bien';
      rating = 'Trè Bon';
      color = 'text-orange-600';
      bg = 'bg-orange-50';
    } else {
      status = 'Atansyon / Vigilance';
      rating = 'Atansyon';
      color = 'text-red-600';
      bg = 'bg-red-50';
    }

    return { score, consistency, speed, completion, status, rating, color, bg };
  }, [selectedHealthSolId, sols, contributions, beneficiaries]);

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalObjective.trim() || !newGoalTarget) return;

    const newGoal = {
      id: `g-${Date.now()}`,
      solId: selectedGoalSolId,
      objective: newGoalObjective.trim(),
      target: Number(newGoalTarget) || 0,
      current: Number(newGoalCurrent) || 0,
    };

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    localStorage.setItem('sol_financial_goals', JSON.stringify(updatedGoals));

    setNewGoalObjective('');
    setNewGoalTarget('');
    setNewGoalCurrent('');
  };

  const handleUpdateGoal = (id: string, updatedTarget: number, updatedCurrent: number) => {
    const updatedGoals = goals.map(g => {
      if (g.id === id) {
        return { ...g, target: updatedTarget, current: updatedCurrent };
      }
      return g;
    });
    setGoals(updatedGoals);
    localStorage.setItem('sol_financial_goals', JSON.stringify(updatedGoals));
    setEditingGoalId(null);
  };

  const handleDeleteGoal = (id: string) => {
    const updatedGoals = goals.filter(g => g.id !== id);
    setGoals(updatedGoals);
    localStorage.setItem('sol_financial_goals', JSON.stringify(updatedGoals));
  };

  const solGoalsFiltered = goals.filter(g => g.solId === selectedGoalSolId);

  return (
    <div id="dashboard-container" className="max-w-7xl mx-auto px-4 py-8 text-left space-y-8 font-sans">
      
      {/* 1. WELCOME HERO SECTION */}
      <BentoCard
        id="dash-welcome-hero"
        index={1}
        hoverScale={false}
        className="p-6 md:p-8 bg-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-orange-100 text-orange-700 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                {currentUser.role === 'maman_sol' ? t.roleMamanSol : t.member}
              </span>
              <span className="font-mono text-[9px] text-slate-400">ID: {currentUser.id}</span>
            </div>
            
            <h1 className="text-2xl md:text-3.5xl font-black tracking-tight text-slate-900">
              {currentLanguage === 'creole' 
                ? `Bienvini sou Sòl, ${currentUser.name.split(' ')[0]}!` 
                : currentLanguage === 'french' 
                ? `Bienvenue sur SOL, ${currentUser.name.split(' ')[0]}!` 
                : `Welcome to SOL, ${currentUser.name.split(' ')[0]}!`}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 leading-relaxed max-w-xl">
              {currentLanguage === 'creole' 
                ? "Platfòm nimerik ak kòb k ap vire ki pi sekirize. Swiv lè w ap touche kès la, nòt kotizasyon w, ak lòd tiray la." 
                : "La gérance transparente de vos tontines de confiance. Gardez un œil sur votre ordre de tirage, vos cotisations et l'actif circulant."}
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              id="dash-create-sol"
              onClick={onCreateSolClick}
              className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-6 py-4 rounded-2xl shadow-md transition-all hover:scale-102 flex items-center justify-center space-x-2 active:scale-95 duration-150 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.create}</span>
            </button>
          </div>
        </div>
      </BentoCard>

      {/* FINANCIAL HEALTH SUMMARY CARD (Maman Sòl Global Analytics) */}
      {managedSols.length > 0 && (
        <BentoCard
          id="dash-financial-health-card"
          index={1}
          hoverScale={false}
          className="p-6 md:p-8 bg-gradient-to-br from-slate-900 to-slate-950 text-white border-none space-y-6 relative overflow-hidden rounded-[2rem]"
        >
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <span className="px-3 py-1 bg-emerald-500/15 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                ❤️ Contivo AI Bilan Finansyè
              </span>
              <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-2 mt-1">
                <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                {currentLanguage === 'creole' ? 'Bilan Sante Finansyè' : 'Bilan de Santé Financière'}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                {currentLanguage === 'creole'
                  ? 'Estatistik ak vizyalizasyon an tan reyèl pou tout gwoup Sòl ak tontine ou jere yo.'
                  : 'Statistiques consolidées en temps réel de tous vos groupes de tontine gérés.'}
              </p>
            </div>
            <div className="shrink-0 flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                {managedSols.length} {currentLanguage === 'creole' ? 'Gwoup Aktif' : 'Groupes Actifs'}
              </span>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Metrics block: col-span-5 */}
            <div className="md:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Metric 1: Total Active Members */}
              <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Manm Aktif</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <span className="text-3xl font-mono font-black text-white">
                    {managedSolsStats.totalActiveMembersCount}
                  </span>
                  <p className="text-[10px] text-slate-400 uppercase tracking-tight mt-1.5">Manm an total k ap woule</p>
                </div>
              </div>

              {/* Metric 2: Funds in Circulation */}
              <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Kapital nan Sikilasyon</span>
                  <Coins className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <span className="text-2xl sm:text-2.5xl font-mono font-black text-emerald-400 block truncate">
                    {managedSolsStats.totalFundsInCirculationAmount.toLocaleString()} <span className="text-xs text-white">HTG</span>
                  </span>
                  <p className="text-[10px] text-slate-400 uppercase tracking-tight mt-1.5">Lajan k ap vire nan tout gwoup yo</p>
                </div>
              </div>

            </div>

            {/* Right Upcoming Payout Schedule block: col-span-7 */}
            <div className="md:col-span-7 bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-orange-500" />
                {currentLanguage === 'creole' ? 'Pwochen Dat Touche ak Payout yo' : 'Prochains Décaissements Prévus'}
              </h3>
              
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {managedSolsStats.upcomingPayoutsList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4">Pa gen okenn dat touche ki planifye pou kounye a.</p>
                ) : (
                  managedSolsStats.upcomingPayoutsList.map((payout) => (
                    <div 
                      key={payout.id} 
                      className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-xl text-xs transition-colors"
                    >
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-slate-200 uppercase tracking-tight truncate max-w-[150px]">{payout.memberName}</p>
                        <p className="text-[9.5px] text-slate-400 font-bold uppercase">{payout.solName}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-mono font-black text-emerald-400">+{payout.payoutAmount.toLocaleString()} HTG</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">Dat: {payout.payoutDate}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </BentoCard>
      )}

      {/* 2. THE MAIN BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* BENTO BLOCK A : HERO ACTIVE SÒL DETAILS (col-span-8) */}
        <BentoCard
          id="dash-bento-active-sol"
          index={2}
          hoverScale={false}
          className="col-span-12 xl:col-span-8 p-6 md:p-8 flex flex-col justify-between min-h-[360px]"
        >
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-1">
                  {t.mySols}
                </span>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
                  {primarySol ? primarySol.name : "Sòl Ayiti"}
                  {primarySol?.creatorId === currentUser.id && (
                    <span className="bg-orange-100 text-orange-850 text-[9px] font-extrabold px-2 py-0.5 rounded">Gérante</span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md mt-1">
                  {primarySol ? primarySol.description : t.emptySols}
                </p>
              </div>

              {primarySol && (
                <button 
                  onClick={() => onSelectSol(primarySol.id)}
                  className="w-10 h-10 bg-slate-100 hover:bg-orange-100/50 rounded-full flex items-center justify-center transition-colors shrink-0 group text-slate-700 hover:text-orange-700 cursor-pointer"
                >
                  <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              )}
            </div>

            {primarySol ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-6 pt-4 border-t border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">{t.potAmount}</span>
                  <span className="text-lg md:text-xl font-mono font-black text-emerald-600">
                    {(primarySol.contributionAmount * primarySolMembers.length).toLocaleString()} <span className="text-xs">HTG</span>
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">{t.frequency}</span>
                  <span className="text-xs font-bold text-slate-800 uppercase block">
                    {getFrequencyLabel(primarySol.frequency)}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">{t.activeBeneficiary}</span>
                  <span className="text-xs font-bold text-slate-800 block">
                    {primarySolActiveBeneficiary ? primarySolActiveBeneficiary.memberName : "Pèsonn"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                {t.emptySols}
              </div>
            )}
          </div>

          {primarySol && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              {/* Progress 1: Rotation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-705 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-orange-500" />
                    Wotasyon Men ({completedHandsCount} / {totalHandsCount})
                  </span>
                  <span className="font-mono text-orange-600 font-extrabold">{progressPercent}% FINI</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-orange-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Progress 2: Current Cycle Contributions */}
              {(() => {
                const activeCycle = cycles.find(cy => cy.solId === primarySol.id && cy.status === 'active');
                if (!activeCycle) return null;
                const activeCycleContribs = contributions.filter(c => c.solId === primarySol.id && c.cycleId === activeCycle.id);
                const paidCount = activeCycleContribs.filter(c => c.status === 'paid').length;
                const totalCount = primarySolMembers.length || 1;
                const paidPercent = Math.round((paidCount / totalCount) * 100);

                const creoleText = `Kotizasyon Sik #${activeCycle.cycleNumber} (${paidCount} / ${totalCount} manm peye)`;
                const frenchText = `Cotisations Cycle #${activeCycle.cycleNumber} (${paidCount} / ${totalCount} membres payés)`;
                const englishText = `Cycle #${activeCycle.cycleNumber} Contributions (${paidCount} / ${totalCount} members paid)`;

                const titleLabel = currentLanguage === 'creole' ? creoleText : currentLanguage === 'french' ? frenchText : englishText;

                return (
                  <div className="space-y-2 bg-amber-50/30 border border-amber-100 p-3 rounded-2xl">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-slate-750 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {titleLabel}
                      </span>
                      <span className="font-mono text-emerald-700 font-extrabold">{paidPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${paidPercent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1">
                <span>Sekirize pa Sòlayiti</span>
                <button 
                  onClick={() => onSelectSol(primarySol.id)}
                  className="text-orange-600 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>Tout detay</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </BentoCard>

        {/* BENTO BLOCK B : QUICK CONTRIBUTION OBLIGATION (col-span-4, slate-900 canvas) */}
        <BentoCard
          id="dash-bento-quick-pay"
          index={3}
          hoverScale={true}
          className="col-span-12 md:col-span-6 xl:col-span-4 bg-slate-900 border-none p-6 text-white flex flex-col justify-between relative overflow-hidden min-h-[360px]"
        >
          {/* Ambient graphic background */}
          <div className="absolute bottom-0 right-0 w-44 h-44 bg-orange-600/10 rounded-full blur-2xl"></div>
          
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-orange-550 bg-orange-500/10 px-2 py-0.5 rounded">
                KOTIZASYON RAPID
              </span>
              <p className="text-[10px] font-mono text-slate-400">Sitiyasyon nimerik</p>
            </div>

            {userPendingContribs.length === 0 ? (
              <div className="space-y-2 py-6">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-405" />
                </div>
                <h3 className="text-md font-extrabold text-slate-100">Ou an règ nèt! 🎉</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tout bòdwo ak kotizasyon w pou sik sa a peye avèk siksè. Kès la remèsye w!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold block uppercase">{t.paymentAmount}</span>
                  <span className="text-3xl font-mono font-black text-white">{outstandingOwed.toLocaleString()} <span className="text-sm">HTG</span></span>
                </div>
                
                <div className="space-y-2 pt-2">
                  <span className="text-slate-400 text-[10px] font-bold block uppercase">Sòl deklare pou mwa sa a</span>
                  {userPendingContribs.slice(0, 2).map((c) => {
                    const group = sols.find(s => s.id === c.solId);
                    return (
                      <div key={c.id} className="flex items-center justify-between p-2.5 bg-slate-800 rounded-xl border border-slate-700/60 text-xs">
                        <div>
                          <p className="font-extrabold text-slate-100 truncate max-w-[140px]">{group?.name}</p>
                          <p className="text-[9.5px] text-slate-400 font-mono">Dat limit: {c.dueDate}</p>
                        </div>
                        <span className="font-mono font-bold text-orange-400">{c.amount.toLocaleString()} HTG</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {userPendingContribs.length > 0 && (
            <button
              onClick={() => onPayContribution(userPendingContribs[0].id)}
              className="w-full bg-emerald-600 hover:bg-emerald-555 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wide transition-all shadow-md active:scale-95 mt-4 relative z-10 cursor-pointer"
            >
              Peye Kounye a MonCash
            </button>
          )}
        </BentoCard>

        {/* BENTO STATS 1 (col-span-3) - Total Received */}
        <BentoCard
          id="dash-bento-stats-total"
          index={4}
          className="col-span-12 sm:col-span-4 xl:col-span-3 p-6 flex flex-col justify-between min-h-[148px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">{t.statsTotalPot}</span>
            <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xl md:text-2xl font-black text-slate-900 font-mono block">
              {totalHandsReceived.toLocaleString()} <span className="text-xs">HTG</span>
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-tight block mt-1">Lajan kès ou touche an total</span>
          </div>
        </BentoCard>

        {/* BENTO STATS 2 (col-span-3) - Circulating Active */}
        <BentoCard
          id="dash-bento-stats-circulating"
          index={5}
          className="col-span-12 sm:col-span-4 xl:col-span-3 bg-orange-100/30 p-6 flex flex-col justify-between min-h-[148px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider block">{t.statsGroupTotal}</span>
            <span className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
              <Handshake className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xl md:text-2xl font-black text-slate-900 font-mono block">
              {totalCirculating.toLocaleString()} <span className="text-xs">HTG</span>
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-tight block mt-1">Kapital k ap vire nan gwoup la</span>
          </div>
        </BentoCard>

        {/* BENTO STATS 3 (col-span-6) - Active Beneficiary Info */}
        <BentoCard
          id="dash-bento-stats-maman"
          index={6}
          className="col-span-12 sm:col-span-4 xl:col-span-6 p-6 flex flex-col justify-between min-h-[148px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">
              Sekirite ak Peryòd Wotasyon
            </span>
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
          </div>
          
          <div className="flex items-center gap-3 mt-4">
            <div className="p-2.5 bg-orange-100 text-orange-700 rounded-xl shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-800">
                Marie Carmel Pierre (Maman Sòl)
              </p>
              <p className="text-[10px] text-slate-500">
                Jere kès la, asire wotasyon men ak entegrite finansye gwoup la.
              </p>
            </div>
          </div>
        </BentoCard>

        {/* BENTO BLOCK: PROJECTED PAYOUT DATE (col-span-6) */}
        <BentoCard
          id="dash-bento-projected-payout"
          index={12}
          className="col-span-12 sm:col-span-4 xl:col-span-6 bg-slate-50 border border-slate-200 p-6 flex flex-col justify-between min-h-[148px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-black text-orange-600 tracking-wider block">
              Dat Touche Pwojete (Projected Payout Date)
            </span>
            <span className="p-1 bg-orange-100 rounded text-orange-750 text-[9px] font-bold">Planifikasyon</span>
          </div>

          {userProjectedPayouts.length === 0 ? (
            <div className="mt-4 text-xs text-slate-450 italic">
              Pa gen okenn dat touche ki anrejistre pou ou kounye a.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {userProjectedPayouts.slice(0, 1).map((payout) => (
                <div key={payout.solId} className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-tight truncate max-w-[150px]">{payout.solName}</h4>
                    <p className="text-[10px] text-slate-500 font-medium">Pozisyon tiray: <span className="font-extrabold text-orange-700">#{payout.position}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-black text-slate-950">{payout.payoutDate}</p>
                    <p className="text-[9px] font-bold uppercase mt-0.5">
                      {payout.status === 'completed' ? (
                        <span className="text-emerald-600">Touche deja ✓</span>
                      ) : payout.status === 'current' ? (
                        <span className="text-orange-600 animate-pulse">Men pa w kounye a! 🔥</span>
                      ) : (
                        <span className="text-amber-600">Nan {payout.daysRemaining} jou</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
              {userProjectedPayouts.length > 1 && (
                <p className="text-[8.5px] text-slate-450 font-bold border-t border-slate-200/50 pt-1.5 uppercase">
                  + gen {userProjectedPayouts.length - 1} lòt Sòl ki gen dat pwojete
                </p>
              )}
            </div>
          )}
        </BentoCard>

        {/* BENTO BLOCK C : ROTATION QUEUE OUTLINE (col-span-8) */}
        <BentoCard
          id="dash-bento-queue"
          index={7}
          hoverScale={false}
          className="col-span-12 xl:col-span-8 p-6 md:p-8 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-extrabold text-slate-900">{t.beneficiaries}</h3>
              <p className="text-[10px] text-slate-505">Klasifikasyon ak sekans tiray oaza pou men yo</p>
            </div>
            <span className="px-2.5 py-1 bg-slate-50 rounded-full border border-slate-200 text-[10.5px] font-bold text-slate-600">
              Tiray Otomatik (Oaza)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {primarySolBeneficiaries.map((b) => {
              const bgClass = b.status === 'completed' 
                ? 'bg-emerald-50/40 border-emerald-100 text-emerald-800' 
                : b.status === 'current' 
                ? 'bg-orange-50 border-orange-200 text-slate-900 ring-2 ring-orange-100' 
                : 'bg-white border-slate-200 text-slate-500';

              return (
                <div key={b.id} className={`p-4 rounded-xl border flex items-center justify-between gap-2.5 ${bgClass}`}>
                  <div className="min-w-0 flex items-center space-x-2">
                    <span className="w-5 h-5 bg-slate-100 rounded-full text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                      {b.position}
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs truncate text-slate-800">{b.memberName}</p>
                      <p className="text-[9px] text-slate-400 font-mono truncate">{b.payoutDate}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-xs font-bold">{b.payoutAmount.toLocaleString()}</p>
                    {b.status === 'completed' && <span className="text-[8px] font-bold text-emerald-600 uppercase">&#10003; touche</span>}
                    {b.status === 'current' && <span className="text-[8px] font-bold text-orange-600 uppercase">aktif</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </BentoCard>

        {/* BENTO BLOCK: TOP CONTRIBUTORS (col-span-4) */}
        <BentoCard
          id="dash-bento-top-contributors"
          index={8}
          hoverScale={false}
          className="col-span-12 xl:col-span-4 p-6 flex flex-col justify-between min-h-[300px]"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-500 animate-pulse" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wider">Top Kontribitè yo</h3>
                <p className="text-[10px] text-slate-505">Moun ki ranpli kès la pi plis</p>
              </div>
            </div>

            {topContributors.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">Poko gen okenn kontribisyon ki fèt nan gwoup sa yo.</p>
            ) : (
              <div className="h-44 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topContributors.map(stat => ({
                      name: stat.name.split(' ')[0],
                      'Montan (HTG)': stat.totalAmount,
                      fullName: stat.name,
                    }))}
                    layout="vertical"
                    margin={{ top: 5, right: 15, left: -20, bottom: 5 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={45} tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }}
                      formatter={(value: any) => [`${Number(value).toLocaleString()} HTG`, 'Total Peye']}
                    />
                    <Bar dataKey="Montan (HTG)" fill="#f97316" radius={[0, 4, 4, 0]}>
                      {topContributors.map((entry, index) => {
                        const colors = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          {topContributors.length > 0 && (
            <div className="text-[10px] text-slate-400 border-t border-slate-150 pt-2 flex justify-between">
              <span>Meyè manm nan koperativ la</span>
              <span className="font-extrabold text-orange-600">Sòlayiti Premium</span>
            </div>
          )}
        </BentoCard>

        {/* BENTO BLOCK: SÒL FINANCIAL GOALS (col-span-8) */}
        <BentoCard
          id="dash-bento-financial-goals"
          index={9}
          hoverScale={false}
          className="col-span-12 xl:col-span-8 p-6 md:p-8 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-orange-600" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wider">Objektif Finansye Sòl la</h3>
                <p className="text-[10px] text-slate-505">Espas pou asire fon sosyal ak rezèv ijans gwoup la</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Chwazi Sòl:</span>
              <select
                value={selectedGoalSolId}
                onChange={(e) => setSelectedGoalSolId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-[11px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-700"
              >
                {userSols.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Goals list */}
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {solGoalsFiltered.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Poko gen okenn objektif finansye deklare pou Sòl sa a.
              </p>
            ) : (
              solGoalsFiltered.map(g => {
                const percent = Math.min(100, Math.round((g.current / g.target) * 100));
                const isEditing = editingGoalId === g.id;

                return (
                  <div key={g.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-xs text-slate-900 uppercase tracking-tight">{g.objective}</p>
                        <p className="text-[10px] text-slate-450 font-mono">
                          Kolekte: <span className="font-bold text-emerald-600">{g.current.toLocaleString()} HTG</span> sou yon sib de <span className="font-bold text-slate-700">{g.target.toLocaleString()} HTG</span>
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${percent === 100 ? 'bg-emerald-100 text-emerald-850' : 'bg-orange-50 text-orange-700'}`}>
                          {percent}%
                        </span>
                        {isGoalSolManager && !isEditing && (
                          <button
                            onClick={() => {
                              setEditingGoalId(g.id);
                              setEditTarget(g.target.toString());
                              setEditCurrent(g.current.toString());
                            }}
                            className="text-[10px] text-orange-600 hover:underline font-extrabold cursor-pointer"
                          >
                            Modifye
                          </button>
                        )}
                        {isGoalSolManager && (
                          <button
                            onClick={() => handleDeleteGoal(g.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Efase objektif sa a"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Editing form inline */}
                    {isEditing && (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap gap-2 items-end">
                        <div className="flex-1 min-w-[100px] space-y-1 text-left">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Aktyèl (HTG)</span>
                          <input
                            type="number"
                            value={editCurrent}
                            onChange={(e) => setEditCurrent(e.target.value)}
                            className="w-full p-1.5 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="flex-1 min-w-[100px] space-y-1 text-left">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Sib total (HTG)</span>
                          <input
                            type="number"
                            value={editTarget}
                            onChange={(e) => setEditTarget(e.target.value)}
                            className="w-full p-1.5 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="flex space-x-1.5 shrink-0">
                          <button
                            onClick={() => handleUpdateGoal(g.id, Number(editTarget) || 0, Number(editCurrent) || 0)}
                            className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 cursor-pointer"
                          >
                            Sove
                          </button>
                          <button
                            onClick={() => setEditingGoalId(null)}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 cursor-pointer"
                          >
                            Anile
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Add Goal Form (Manager Only) */}
          {isGoalSolManager && (
            <form onSubmit={handleAddGoal} className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5 space-y-1 text-left text-xs">
                <label className="font-extrabold text-slate-600 uppercase tracking-wider text-[9px]">Nouvo Objektif</label>
                <input
                  type="text"
                  value={newGoalObjective}
                  onChange={(e) => setNewGoalObjective(e.target.value)}
                  placeholder="e.g. Fon Prè Koperativ"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-orange-500 text-slate-700"
                  required
                />
              </div>
              <div className="md:col-span-3 space-y-1 text-left text-xs">
                <label className="font-extrabold text-slate-600 uppercase tracking-wider text-[9px]">Sib (HTG)</label>
                <input
                  type="number"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  placeholder="50000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-orange-500 text-slate-700"
                  required
                />
              </div>
              <div className="md:col-span-2 space-y-1 text-left text-xs">
                <label className="font-extrabold text-slate-600 uppercase tracking-wider text-[9px]">Aktyèl (HTG)</label>
                <input
                  type="number"
                  value={newGoalCurrent}
                  onChange={(e) => setNewGoalCurrent(e.target.value)}
                  placeholder="10000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-orange-500 text-slate-700"
                />
              </div>
              <button
                type="submit"
                className="md:col-span-2 w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Ajoute
              </button>
            </form>
          )}
          {!isGoalSolManager && currentGoalSol && (
            <div className="bg-slate-50 p-3 rounded-xl flex items-center space-x-2 text-[10px] text-slate-500">
              <Shield className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Chanjman objektif finansye yo rezève sèlman pou Gérante Sòl la <strong>({currentGoalSol.creatorId === 'user-marie' ? 'Marie Carmel Pierre' : 'Manager'})</strong>.</span>
            </div>
          )}
        </BentoCard>

        {/* BENTO BLOCK: SÒL HEALTH GAUGE (col-span-4) */}
        <BentoCard
          id="dash-bento-sol-health"
          index={10}
          hoverScale={false}
          className="col-span-12 xl:col-span-4 p-6 md:p-8 space-y-6 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wider">Sòl Health (Sante Gwoup)</h3>
                  <p className="text-[10px] text-slate-500">Evalyasyon sante finansye sèk la</p>
                </div>
              </div>
              <select
                value={selectedHealthSolId}
                onChange={(e) => setSelectedHealthSolId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-700"
              >
                {userSols.map(s => (
                  <option key={`health-sel-${s.id}`} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* GAUGE CHART - BEAUTIFUL SEMI-CIRCLE SVG */}
            <div className="relative flex flex-col items-center justify-center pt-2">
              <div className="w-44 h-24 relative overflow-hidden flex items-end justify-center">
                <svg viewBox="0 0 100 60" className="w-full h-full">
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="url(#health-gauge-gradient)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={125.6}
                    strokeDashoffset={125.6 - (125.6 * (solHealthData.score / 100))}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="health-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="50%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Pointer / needle */}
                <div 
                  className="absolute bottom-2 left-1/2 w-1.5 h-12 bg-slate-800 rounded-full origin-bottom -translate-x-1/2 transition-transform duration-1000 ease-out"
                  style={{ transform: `translateX(-50%) rotate(${(solHealthData.score / 100) * 180 - 90}deg)` }}
                >
                  <div className="w-3 h-3 bg-slate-850 rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                </div>
              </div>
              
              <div className="text-center -mt-2 space-y-0.5">
                <span className="text-2xl font-black text-slate-900 font-mono block">
                  {solHealthData.score}%
                </span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full inline-block ${solHealthData.color} ${solHealthData.bg} uppercase tracking-wider`}>
                  {solHealthData.status}
                </span>
              </div>
            </div>

            {/* BREAKDOWN METRICS */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {/* Consistency */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-bold">Konsistans Kotizasyon (Consistency)</span>
                  <span className="font-bold text-slate-800">{solHealthData.consistency}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${solHealthData.consistency}%` }} />
                </div>
              </div>

              {/* Payment speed */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-bold">Vitès Peman (Payment Speed)</span>
                  <span className="font-bold text-slate-800">{solHealthData.speed}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${solHealthData.speed}%` }} />
                </div>
              </div>

              {/* Cycle completion rate */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-bold">Sik Konplete (Cycle Completion)</span>
                  <span className="font-bold text-slate-800">{solHealthData.completion}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${solHealthData.completion}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="text-[9px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Algoritm Sòl Health v1.0</span>
            <span className="font-bold text-slate-500">Otomatik</span>
          </div>
        </BentoCard>

        {/* BENTO BLOCK D : QUICK CHANNELS / CREATION DOTTED (col-span-4) */}
        <BentoCard
          id="dash-bento-create-trigger"
          index={8}
          onClick={onCreateSolClick}
          className="col-span-12 xl:col-span-4 bg-[#FBF9F7] border-2 border-dashed border-slate-350 hover:border-orange-500 hover:bg-orange-50/40 flex flex-col items-center justify-center text-center p-6 md:p-8 min-h-[220px] group"
        >
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm transition-transform group-hover:scale-110 mb-4 text-slate-600 group-hover:text-orange-600">
            <PlusCircle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide group-hover:text-orange-600">
            {t.create}
          </h4>
          <p className="text-xs text-slate-505 mt-1 max-w-[200px]">
            Kreye yon nouvo sèk entegre ak chwazi gérante, metòd tiray, ak limit manm.
          </p>
        </BentoCard>

        {/* BENTO BLOCK: MAMAN SÒL MEMBER CENTRAL DIRECTORY (col-span-12) */}
        {managedSols.length > 0 && (
          <BentoCard
            id="dash-bento-maman-sol-members"
            index={11}
            hoverScale={false}
            className="col-span-12 p-6 md:p-8 space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-orange-600" />
                  <h3 className="text-sm md:text-md font-black text-slate-950 uppercase tracking-wider">
                    Sipèvizyon Patisipan yo (Maman Sòl Member Directory)
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Chache ak filtre manm yo nan tout gwoup Sòl ou jere yo rapidman.
                </p>
              </div>

              {/* Search and Filter Inputs */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {/* Search Bar */}
                <div className="relative flex-1 sm:w-64">
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder={currentLanguage === 'creole' ? "Chache pa non, imèl oswa telefòn..." : "Rechercher par nom, email ou téléphone..."}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-2 px-3 pl-9 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-700"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Filter Dropdown */}
                <select
                  value={memberFilterSolId}
                  onChange={(e) => setMemberFilterSolId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-700 cursor-pointer"
                >
                  <option value="all">
                    {currentLanguage === 'creole' ? "Tout Gwoup Sòl yo" : "Tous les groupes SOL"}
                  </option>
                  {managedSols.map(s => (
                    <option key={`member-filter-sol-${s.id}`} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Grid / List */}
            {filteredManagedMembers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredManagedMembers.map((member) => {
                  const memberSols = managedSols.filter(s => member.solIds.includes(s.id));
                  
                  return (
                    <div
                      key={`managed-member-card-${member.id}`}
                      onClick={() => setSelectedMemberProfile(member)}
                      className="p-4 bg-slate-50 hover:bg-orange-50/10 border border-slate-200 hover:border-orange-500/30 rounded-2xl flex flex-col justify-between space-y-3 transition-all duration-250 cursor-pointer hover:ring-2 hover:ring-orange-500/20"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                            {member.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {member.phone || member.email || "Pa gen enfòmasyon kontak"}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-[9px] font-bold text-slate-700">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>Patisipan</span>
                        </div>
                      </div>

                      {/* Associated Groups Tags */}
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-black text-slate-400 block">Gwoup Sòl:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {memberSols.map(s => (
                            <span
                              key={`member-sol-tag-${member.id}-${s.id}`}
                              className="text-[9.5px] font-extrabold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md animate-pulse"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-slate-150 flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-450 uppercase text-[9px]">Aksyon rapid</span>
                        <div className="flex space-x-1.5">
                          {memberSols.map(s => (
                            <button
                              key={`btn-goto-sol-${member.id}-${s.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectSol(s.id);
                              }}
                              className="px-2 py-1 bg-white hover:bg-slate-900 hover:text-white border border-slate-200 hover:border-slate-900 rounded-lg text-[9px] text-slate-705 transition-colors cursor-pointer flex items-center space-x-1"
                            >
                              <span>{s.name}</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 bg-slate-50 border border-dashed border-slate-250 rounded-2xl text-center text-xs text-slate-500 italic">
                {currentLanguage === 'creole' 
                  ? "Pa gen okenn manm ki koresponn ak rechèch sa a." 
                  : "Aucun membre ne correspond à cette recherche."}
              </div>
            )}
          </BentoCard>
        )}

      </div>

      {selectedMemberProfile && (
        <MemberProfileModal
          member={selectedMemberProfile}
          allSols={sols}
          allContributions={contributions}
          allBeneficiaries={beneficiaries}
          currentLanguage={currentLanguage}
          onClose={() => setSelectedMemberProfile(null)}
        />
      )}

    </div>
  );
}
