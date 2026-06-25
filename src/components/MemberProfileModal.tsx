import React, { useState } from 'react';
import { 
  X, 
  Award, 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  TrendingDown, 
  Building,
  Briefcase,
  Layers,
  Phone,
  Mail,
  Zap,
  Info
} from 'lucide-react';
import { Member, SolGroup, Contribution, Beneficiary, Language } from '../types';

interface MemberProfileModalProps {
  member: Member;
  allSols: SolGroup[];
  allContributions: Contribution[];
  allBeneficiaries: Beneficiary[];
  currentLanguage: Language;
  onClose: () => void;
  isMamanSol?: boolean;
  activeSol?: SolGroup;
  onUpdateTier?: (memberId: string, tierAmount: number, goalAmount?: number) => void;
}

export default function MemberProfileModal({
  member,
  allSols,
  allContributions,
  allBeneficiaries,
  currentLanguage,
  onClose,
  isMamanSol = false,
  activeSol,
  onUpdateTier
}: MemberProfileModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'contributions' | 'payouts' | 'groups'>('contributions');

  // Tier/Goal editor state
  const initialTier = activeSol?.memberTiers?.[member.id]?.tierAmount ?? activeSol?.contributionAmount ?? 2500;
  const initialGoal = activeSol?.memberTiers?.[member.id]?.goalAmount ?? (activeSol ? (activeSol.contributionAmount * activeSol.maxMembers) : 25000);
  
  const [tierAmount, setTierAmount] = useState<number>(initialTier);
  const [goalAmount, setGoalAmount] = useState<number>(initialGoal);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSaveTier = async () => {
    if (!onUpdateTier || !activeSol) return;
    setIsSaving(true);
    try {
      await onUpdateTier(member.id, tierAmount, goalAmount);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Find all groups the member belongs to
  const memberSols = allSols.filter(s => member.solIds.includes(s.id) || s.creatorId === member.id);

  // Find all contributions for this member across all groups
  const memberContributions = allContributions.filter(c => c.memberId === member.id);
  const paidContributions = memberContributions.filter(c => c.status === 'paid');
  const pendingContributions = memberContributions.filter(c => c.status !== 'paid');

  // Find all payouts received by this member
  const memberPayouts = allBeneficiaries.filter(b => b.memberId === member.id);
  const completedPayouts = memberPayouts.filter(b => b.status === 'completed');
  const totalPayoutsAmount = completedPayouts.reduce((acc, b) => acc + b.payoutAmount, 0);

  // Calculate Reliability Score
  // Calculated as: (Paid Contributions / Total Expected Contributions) * 100
  const totalExpected = memberContributions.length;
  const reliabilityScore = totalExpected > 0 
    ? Math.round((paidContributions.length / totalExpected) * 100) 
    : 100; // Default to 100 if new

  // Member Badges Logic
  const awardedBadges = [];

  // 1. "Reliable Saver" / "Ekonomis Serye": Reliability score >= 90% and at least 3 paid contributions
  if (reliabilityScore >= 90 && paidContributions.length >= 3) {
    awardedBadges.push({
      id: 'reliable-saver',
      title: currentLanguage === 'creole' ? 'Ekonomis Serye' : 'Épargnant Fiable',
      description: currentLanguage === 'creole' 
        ? 'Fyabilite pi wo pase 90% avèk omwen 3 kotizasyon regilye.' 
        : 'Fiabilité supérieure à 90% avec au moins 3 cotisations régulières.',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      icon: ShieldCheck
    });
  }

  // 2. "Early Bird" / "Zwazo Bonè": Reliability score >= 95% AND has on-time/early payments
  const hasOnTime = paidContributions.some(c => !c.paidDate || c.paidDate <= c.dueDate);
  if (reliabilityScore >= 95 && hasOnTime) {
    awardedBadges.push({
      id: 'early-bird',
      title: currentLanguage === 'creole' ? 'Zwazo Bonè' : 'Oiseau Matinal',
      description: currentLanguage === 'creole'
        ? 'Toujou peye kotizasyon yo trè bonè oswa alè san reta.'
        : 'Paye toujours ses cotisations très tôt ou à temps sans retard.',
      color: 'bg-sky-50 text-sky-700 border-sky-200/60',
      icon: Zap
    });
  }

  // 3. "Consistency King" / "Wa Regilarite": Paid contributions count >= 5, or has paid all expected with 100% score (expected >= 2)
  if (paidContributions.length >= 5 || (reliabilityScore === 100 && paidContributions.length >= 2)) {
    awardedBadges.push({
      id: 'consistency-king',
      title: currentLanguage === 'creole' ? 'Wa Regilarite' : 'Roi de la Constance',
      description: currentLanguage === 'creole'
        ? 'Patisipasyon regilye san manke ak yon ekselan istorik.'
        : 'Participation régulière sans faille avec un historique impeccable.',
      color: 'bg-purple-50 text-purple-700 border-purple-200/60',
      icon: Award
    });
  }

  // 4. "Sòl Pioneer" / "Pionye Sòl": creator of a Sòl or belongs to multiple Sòl groups
  const isCreator = allSols.some(s => s.creatorId === member.id);
  if (isCreator || memberSols.length >= 2) {
    awardedBadges.push({
      id: 'pioneer',
      title: currentLanguage === 'creole' ? 'Pionye Sòl' : 'Pionnier de Tontine',
      description: currentLanguage === 'creole'
        ? 'Kreye oswa patisipe nan plizyè gwoup Sòl pou ranfòse kominote a.'
        : 'Crée ou participe à plusieurs groupes de Sòl pour renforcer la communauté.',
      color: 'bg-amber-50 text-amber-700 border-amber-200/60',
      icon: Building
    });
  }

  // Reliability level text and style
  let levelText = '';
  let levelColor = '';
  let levelBg = '';
  
  if (reliabilityScore >= 95) {
    levelText = currentLanguage === 'creole' ? 'Manm Ekselan (Elite)' : 'Membre Excellent (Élite)';
    levelColor = 'text-emerald-800';
    levelBg = 'bg-emerald-50 border-emerald-200';
  } else if (reliabilityScore >= 80) {
    levelText = currentLanguage === 'creole' ? 'Trè Fidèl (Reliable)' : 'Très Fiable (Standard)';
    levelColor = 'text-blue-800';
    levelBg = 'bg-blue-50 border-blue-200';
  } else if (reliabilityScore >= 60) {
    levelText = currentLanguage === 'creole' ? 'Mwayen (Needs Attention)' : 'Moyen (Sous surveillance)';
    levelColor = 'text-amber-800';
    levelBg = 'bg-amber-50 border-amber-200';
  } else {
    levelText = currentLanguage === 'creole' ? 'Atansyon (Risk of Delay)' : 'Alerte (Risque de retard)';
    levelColor = 'text-red-800';
    levelBg = 'bg-red-50 border-red-200';
  }

  // Language texts
  const t = {
    title: currentLanguage === 'creole' ? 'Pwofil Patisipan an' : 'Profil du Participant',
    reliability: currentLanguage === 'creole' ? 'Endis Fyabilite' : 'Indice de Fiabilité',
    statsContributions: currentLanguage === 'creole' ? 'Kotizasyon Peye' : 'Cotisations Payées',
    statsPayouts: currentLanguage === 'creole' ? 'Lajan Touche (Total)' : 'Total Décaissé',
    statsGroups: currentLanguage === 'creole' ? 'Gwoup Aktif' : 'Groupes Actifs',
    tabContributions: currentLanguage === 'creole' ? 'Istorik Kotizasyon' : 'Historique Cotisations',
    tabPayouts: currentLanguage === 'creole' ? 'Wotasyon Payouts' : 'Historique Décaissements',
    tabGroups: currentLanguage === 'creole' ? 'Gwoup Sòl yo' : 'Groupes de tontine',
    emptyContributions: currentLanguage === 'creole' ? 'Pa gen okenn kotizasyon ki deklare pou manm sa a.' : 'Aucune cotisation enregistrée pour ce membre.',
    emptyPayouts: currentLanguage === 'creole' ? 'Manm sa a poko touche okenn kès nan wotasyon yo.' : "Ce membre n'a pas encore reçu de décaissement.",
    payoutAt: currentLanguage === 'creole' ? 'Touche nan pozisyon' : 'Reçu à la position',
    statusPaid: currentLanguage === 'creole' ? 'Peye' : 'Payé',
    statusPending: currentLanguage === 'creole' ? 'Ap Tann' : 'En attente',
    dueDate: currentLanguage === 'creole' ? 'Limit' : 'Date limite',
    paidDate: currentLanguage === 'creole' ? 'Peye nan dat' : 'Payé le',
    method: currentLanguage === 'creole' ? 'Metòd' : 'Méthode',
    reliabilityExplain: currentLanguage === 'creole' 
      ? 'Kalkile otomatikman dapre kotizasyon ki peye alè ak pousantaj konfòmite finansye.' 
      : 'Calculé automatiquement en fonction de la ponctualité des cotisations payées.'
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-start justify-between bg-slate-50">
          <div className="flex items-center space-x-4">
            <img 
              src={member.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`}
              alt={member.name}
              className="w-14 h-14 rounded-full border border-slate-200 shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div className="space-y-1">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${levelBg} ${levelColor}`}>
                {levelText}
              </span>
              <h2 className="text-lg font-black text-slate-950 uppercase tracking-wide">{member.name}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-[11px] text-slate-500 font-medium">
                {member.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {member.phone}
                  </span>
                )}
                {member.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {member.email}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-full text-slate-450 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          
          {/* Quick Metrics & Reliability Gauge */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* Reliability score section */}
            <div className="md:col-span-6 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center space-x-4">
              <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke={reliabilityScore >= 80 ? '#10b981' : reliabilityScore >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={2 * Math.PI * 34 * (1 - reliabilityScore / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-md font-mono font-black text-slate-900">
                  {reliabilityScore}%
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-orange-600" />
                  {t.reliability}
                </h3>
                <p className="text-[10px] text-slate-500 leading-normal">
                  {t.reliabilityExplain}
                </p>
              </div>
            </div>

            {/* Quick numeric indicators */}
            <div className="md:col-span-6 grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">{t.statsContributions}</span>
                <div className="mt-2 flex items-baseline space-x-1.5">
                  <span className="text-lg font-mono font-black text-emerald-700">
                    {paidContributions.length}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">nan {totalExpected}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">{t.statsPayouts}</span>
                <span className="text-sm font-mono font-black text-slate-900 mt-2 block truncate">
                  {totalPayoutsAmount.toLocaleString()} <span className="text-[9px]">HTG</span>
                </span>
              </div>
            </div>

          </div>

          {/* Member Badges System */}
          <div className="bg-slate-50/50 border border-slate-200/80 rounded-3xl p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-orange-600 animate-pulse" />
                {currentLanguage === 'creole' ? 'Badj ak Rekonpans Manm' : 'Badges et Récompenses du Membre'}
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                {awardedBadges.length} {currentLanguage === 'creole' ? 'badj genyen' : 'badge(s) obtenu(s)'}
              </span>
            </div>

            {awardedBadges.length === 0 ? (
              <p className="text-[11px] text-slate-450 italic">
                {currentLanguage === 'creole' 
                  ? 'Manm sa a poko debloke okenn badj. kontinye peye alè pou jwenn premye badj ou!'
                  : 'Ce membre n\'a pas encore débloqué de badges. Continuez à payer à temps pour obtenir vos premiers badges !'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {awardedBadges.map(badge => {
                  const BadgeIcon = badge.icon;
                  return (
                    <div 
                      key={badge.id} 
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all hover:shadow-sm ${badge.color}`}
                    >
                      <div className="p-2 rounded-xl bg-white/80 shadow-xs shrink-0 mt-0.5">
                        <BadgeIcon className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-[11px] font-extrabold uppercase tracking-tight">{badge.title}</h5>
                        <p className="text-[10px] leading-normal opacity-90">{badge.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Maman Sòl Tier & Goal Configuration Panel */}
          {isMamanSol && activeSol && (
            <div className="bg-orange-50/20 border border-orange-100 rounded-3xl p-5 md:p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    {currentLanguage === 'creole' ? 'Nivo Kotizasyon ak Payout (Maman Sòl)' : 'Niveaux et Objectifs (Maman Sòl)'}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    {currentLanguage === 'creole' 
                      ? 'Ajiste nivo ekonomik ak objektif kès pou patisipan sa a nan gwoup sa a.' 
                      : 'Configurez la capacité économique et l\'objectif de décaissement pour ce participant.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    {currentLanguage === 'creole' ? 'Kotizasyon pa Rotation (HTG)' : 'Cotisation par Rotation (HTG)'}
                  </label>
                  <input
                    type="number"
                    value={tierAmount}
                    onChange={(e) => setTierAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    {currentLanguage === 'creole' ? 'Objektif Kès / Payout (HTG)' : 'Objectif Décaissement / Payout (HTG)'}
                  </label>
                  <input
                    type="number"
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {showSuccess ? (
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    {currentLanguage === 'creole' ? 'Anrejistre avèk siksè!' : 'Enregistré avec succès !'}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-450 italic">
                    {currentLanguage === 'creole' ? '* Sa ap chanje montan pwochen kotizasyon yo.' : '* Affectera le montant des prochaines cotisations.'}
                  </span>
                )}
                <button
                  onClick={handleSaveTier}
                  disabled={isSaving}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : (currentLanguage === 'creole' ? 'Sove Nivo' : 'Sauvegarder')}
                </button>
              </div>
            </div>
          )}

          {/* Sub Navigation Tabs */}
          <div className="border-b border-slate-150 flex space-x-6 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('contributions')}
              className={`pb-3 relative transition-all cursor-pointer ${
                activeSubTab === 'contributions' 
                  ? 'text-orange-600 font-black' 
                  : 'text-slate-450 hover:text-slate-850'
              }`}
            >
              {t.tabContributions} ({memberContributions.length})
              {activeSubTab === 'contributions' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('payouts')}
              className={`pb-3 relative transition-all cursor-pointer ${
                activeSubTab === 'payouts' 
                  ? 'text-orange-600 font-black' 
                  : 'text-slate-450 hover:text-slate-850'
              }`}
            >
              {t.tabPayouts} ({completedPayouts.length})
              {activeSubTab === 'payouts' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('groups')}
              className={`pb-3 relative transition-all cursor-pointer ${
                activeSubTab === 'groups' 
                  ? 'text-orange-600 font-black' 
                  : 'text-slate-450 hover:text-slate-850'
              }`}
            >
              {t.tabGroups} ({memberSols.length})
              {activeSubTab === 'groups' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[220px]">
            {activeSubTab === 'contributions' && (
              <div className="space-y-3">
                {memberContributions.length === 0 ? (
                  <p className="text-xs text-slate-450 italic text-center py-8">{t.emptyContributions}</p>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {memberContributions
                      .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
                      .map((c) => {
                        const s = allSols.find(sol => sol.id === c.solId);
                        return (
                          <div 
                            key={c.id} 
                            className="p-3.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="space-y-1">
                              <p className="font-black text-slate-900 uppercase tracking-wide">{s?.name || 'Sòl'}</p>
                              <div className="flex flex-wrap items-center gap-x-3 text-[10px] text-slate-450 font-semibold">
                                <span>{t.dueDate}: <span className="font-mono text-slate-700">{c.dueDate}</span></span>
                                {c.paidDate && (
                                  <span>{t.paidDate}: <span className="font-mono text-slate-700">{c.paidDate}</span></span>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right flex items-center space-x-3">
                              <div className="space-y-0.5">
                                <span className="text-xs font-mono font-black text-slate-900 block">
                                  {c.amount.toLocaleString()} HTG
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono block">
                                  {c.paymentMethod || 'MonCash'}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 text-[8.5px] rounded font-extrabold uppercase shrink-0 ${
                                c.status === 'paid' 
                                  ? 'bg-emerald-105 text-emerald-800' 
                                  : 'bg-amber-100 text-amber-800 animate-pulse'
                              }`}>
                                {c.status === 'paid' ? t.statusPaid : t.statusPending}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {activeSubTab === 'payouts' && (
              <div className="space-y-3">
                {completedPayouts.length === 0 ? (
                  <p className="text-xs text-slate-450 italic text-center py-8">{t.emptyPayouts}</p>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {completedPayouts.map((p) => {
                      const s = allSols.find(sol => sol.id === p.solId);
                      return (
                        <div 
                          key={p.id} 
                          className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs"
                        >
                          <div className="space-y-1">
                            <p className="font-black text-slate-900 uppercase tracking-wide">{s?.name || 'Sòl'}</p>
                            <p className="text-[10px] text-slate-450 font-semibold">
                              {t.payoutAt} <span className="font-extrabold text-orange-600">#{p.position}</span> | Dat Touche: <span className="font-mono text-slate-700">{p.payoutDate}</span>
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-xs font-mono font-black text-emerald-700 block">
                              + {p.payoutAmount.toLocaleString()} HTG
                            </span>
                            <span className="text-[8px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded uppercase block mt-1">
                              Fini nèt ✓
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeSubTab === 'groups' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {memberSols.map((s) => {
                  return (
                    <div 
                      key={s.id} 
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-black text-slate-450 block">Gwoup</span>
                        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-tight line-clamp-1">{s.name}</h4>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 pt-1.5 border-t border-slate-150">
                        <span>Lajan Woule:</span>
                        <span className="text-slate-900">{(s.contributionAmount * s.maxMembers).toLocaleString()} HTG</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wide rounded-xl cursor-pointer"
          >
            Fèmen (Close)
          </button>
        </div>

      </div>
    </div>
  );
}
