import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  RefreshCw, 
  Plus, 
  Shield, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Play, 
  HelpCircle, 
  FileText, 
  Settings, 
  Send, 
  UserCheck, 
  UserPlus,
  Search,
  Filter,
  Zap,
  Trash2,
  Lock,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  TrendingUp,
  Award,
  Sparkles,
  Download,
  Printer,
  Upload
} from 'lucide-react';
import { Language, SolGroup, Member, Contribution, Beneficiary, Cycle, UserSession } from '../types';
import { translations } from '../translations';
import BentoCard from './BentoCard';
import MemberProfileModal from './MemberProfileModal';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface SolDetailsProps {
  currentLanguage: Language;
  sol: SolGroup;
  allSols?: SolGroup[];
  members: Member[];
  contributions: Contribution[];
  beneficiaries: Beneficiary[];
  cycles: Cycle[];
  currentUser: UserSession;
  onBack: () => void;
  onMarkPaid: (contribId: string, method: string) => void;
  onCompleteCycleHand: (solId: string) => void;
  onInviteMember: (solId: string, name: string, email: string) => void;
  onSendReminders: (solId: string, memberIds: string[]) => void;
  onUpdateMemberTier?: (memberId: string, tierAmount: number, goalAmount?: number) => void;
}

export default function SolDetails({
  currentLanguage,
  sol,
  allSols = [],
  members,
  contributions,
  beneficiaries,
  cycles,
  currentUser,
  onBack,
  onMarkPaid,
  onCompleteCycleHand,
  onInviteMember,
  onSendReminders,
  onUpdateMemberTier
}: SolDetailsProps) {
  const t = translations[currentLanguage];
  const [activeTab, setActiveTab] = useState<'members' | 'contributions' | 'beneficiaries' | 'settings'>('members');

  // Local administrative states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  
  // Mark paid dialogue
  const [confirmPaidId, setConfirmPaidId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState('MonCash');

  // Search and sort states
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Bulk import states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Payout swap simulation states
  const [isSimulatingSwap, setIsSimulatingSwap] = useState(false);
  const [swapMemberA, setSwapMemberA] = useState<string>('');
  const [swapMemberB, setSwapMemberB] = useState<string>('');

  // Selected member profile state for modal
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<Member | null>(null);

  const exportMembersToCSV = () => {
    const headers = ['ID', 'Non / Nom', 'Email', 'Telefon / Telephone', 'Rol / Role', 'Sitiyasyon / Statut', 'Dat Enskripsyon / Date Inscription'];
    const rows = solMembers.map(m => [
      m.id,
      m.name,
      m.email || 'N/A',
      m.phone || 'N/A',
      m.role,
      m.status,
      m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `maman_sol_directory_${sol.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkImport = (text: string) => {
    if (!text.trim()) {
      alert(currentLanguage === 'creole' ? 'Tanpri antre kèk tèks oswa telechaje yon dosye.' : 'Veuillez entrer du texte ou télécharger un fichier.');
      return;
    }
    
    const lines = text.split('\n');
    let importedCount = 0;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(/[,\;\t]/);
      const name = parts[0]?.trim();
      const email = parts[1]?.trim() || `${name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'member'}@maman-sol.com`;
      
      if (name && name.length >= 2) {
        onInviteMember(sol.id, name, email);
        importedCount++;
      }
    }
    
    if (importedCount > 0) {
      alert(currentLanguage === 'creole' 
        ? `Siksè! ${importedCount} manm enpòte nan sèk Sòl la.` 
        : `Succès ! ${importedCount} membres importés dans le groupe SOL.`);
      setBulkInputText('');
      setShowBulkModal(false);
    } else {
      alert(currentLanguage === 'creole'
        ? 'Pa gen okenn manm ki enpòte. Tanpri tcheke fòma a.'
        : 'Aucun membre importé. Veuillez vérifier le format.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBulkInputText(text);
    };
    reader.readAsText(file);
  };

  // Maman Sòl private notes state
  const [mamanNotes, setMamanNotes] = useState<{ id: string; category: string; content: string; date: string }[]>(() => {
    try {
      const saved = localStorage.getItem(`maman_notes_${sol.id}`);
      return saved ? JSON.parse(saved) : [
        { id: '1', category: 'General', content: 'Asire w Fabienne peye anvan vandredi sa a pou n ka fè tiraj la alè.', date: '2026-06-22' },
        { id: '2', category: 'Sik #1', content: 'Jean-Claude te gen ti reta nan premye wotasyon an, pale avè l pou n asire l alè kounye a.', date: '2026-06-15' }
      ];
    } catch {
      return [];
    }
  });

  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('General');

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    const newNote = {
      id: Date.now().toString(),
      category: noteCategory,
      content: noteContent.trim(),
      date: new Date().toLocaleDateString('ht-HT')
    };
    const updatedNotes = [newNote, ...mamanNotes];
    setMamanNotes(updatedNotes);
    localStorage.setItem(`maman_notes_${sol.id}`, JSON.stringify(updatedNotes));
    setNoteContent('');
  };

  const handleDeleteNote = (id: string) => {
    const updatedNotes = mamanNotes.filter(n => n.id !== id);
    setMamanNotes(updatedNotes);
    localStorage.setItem(`maman_notes_${sol.id}`, JSON.stringify(updatedNotes));
  };

  const handleRunSchedulerSimulation = () => {
    const unpaid = solContributions.filter(c => c.status !== 'paid');
    let count = 0;
    const sentList = JSON.parse(localStorage.getItem('sent_scheduled_reminders') || '[]');
    
    unpaid.forEach((c) => {
      if (!sentList.includes(c.id)) {
        count++;
        sentList.push(c.id);
      }
    });

    localStorage.setItem('sent_scheduled_reminders', JSON.stringify(sentList));
    alert(currentLanguage === 'creole'
      ? `Siksè! Sistèm lan kouri nan background lan. Yo voye ${count} imel otomatik bay manm ki poko peye yo.`
      : `Succès ! Le planificateur a tourné en arrière-plan. ${count} e-mails automatiques ont été envoyés aux membres en retard.`
    );
  };

  const isMamanSol = sol.creatorId === currentUser.id;

  // Filter structures specific to this Sòl
  const solMembers = members.filter(m => m.solIds.includes(sol.id));
  const solContributions = contributions.filter(c => c.solId === sol.id);
  const solBeneficiaries = beneficiaries.filter(b => b.solId === sol.id).sort((a,b) => a.position - b.position);

  // Simulated payout sequence
  const simulatedBeneficiaries = React.useMemo(() => {
    if (!isSimulatingSwap || !swapMemberA || !swapMemberB) {
      return solBeneficiaries;
    }
    return solBeneficiaries.map(b => {
      if (b.memberId === swapMemberA) {
        const other = solBeneficiaries.find(o => o.memberId === swapMemberB);
        if (other) {
          return { ...b, memberId: other.memberId, memberName: other.memberName };
        }
      }
      if (b.memberId === swapMemberB) {
        const other = solBeneficiaries.find(o => o.memberId === swapMemberA);
        if (other) {
          return { ...b, memberId: other.memberId, memberName: other.memberName };
        }
      }
      return b;
    });
  }, [isSimulatingSwap, swapMemberA, swapMemberB, solBeneficiaries]);

  const daysRemaining = (() => {
    if (!currentCycle) return 0;
    const end = new Date(currentCycle.endDate).getTime();
    const now = Date.now();
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const currentCycle = cycles.find(cy => cy.solId === sol.id && cy.status === 'active');
  const finishedCycles = cycles.filter(cy => cy.solId === sol.id && cy.status === 'completed');

  const isFastPayer = (memberId: string) => {
    const memberContribs = solContributions.filter(c => c.memberId === memberId && c.status === 'paid');
    return memberContribs.some(c => {
      if (!c.paidDate || !c.dueDate) return false;
      const paid = new Date(c.paidDate).getTime();
      const due = new Date(c.dueDate).getTime();
      return paid < due;
    });
  };

  const getLoyaltyPoints = (memberId: string) => {
    const memberContribs = solContributions.filter(c => c.memberId === memberId);
    let points = 150; // Base onboarding loyalty points
    let lateCount = 0;
    let onTimeCount = 0;

    memberContribs.forEach(c => {
      if (c.status === 'paid') {
        points += 50; // 50 pts per contribution
        if (c.paidDate && c.dueDate && new Date(c.paidDate).getTime() < new Date(c.dueDate).getTime()) {
          points += 100; // +100 early payment bonus
          onTimeCount++;
        }
      } else {
        const isOverdue = c.dueDate && new Date(c.dueDate).getTime() < Date.now();
        if (isOverdue) {
          lateCount++;
        }
      }
    });

    if (memberContribs.length > 0 && lateCount === 0) {
      points += 200; // Perfect zero-late bonus
    }

    const isElite = points >= 300 || onTimeCount >= 1;
    return { points, isElite };
  };

  // State to track celebrated savings milestones and completed cycles for automatic confetti triggers
  const [celebratedMilestones, setCelebratedMilestones] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`celebrations_${sol.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const totalSavings = solContributions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount, 0);

  const activeCycleContribs = currentCycle 
    ? solContributions.filter(c => c.cycleId === currentCycle.id)
    : [];
  const activeCyclePaidCount = activeCycleContribs.filter(c => c.status === 'paid').length;
  const isCycleFullyPaid = activeCycleContribs.length > 0 && activeCyclePaidCount === activeCycleContribs.length;

  useEffect(() => {
    if (!sol.id) return;
    const milestones = [10000, 25000, 50000, 100000, 250000, 500000];
    let updated = false;
    const currentCelebrated = [...celebratedMilestones];

    // Check savings milestones
    for (const mil of milestones) {
      const milestoneId = `savings-${mil}`;
      if (totalSavings >= mil && !currentCelebrated.includes(milestoneId)) {
        currentCelebrated.push(milestoneId);
        updated = true;
      }
    }

    // Check cycle completion
    if (isCycleFullyPaid && currentCycle) {
      const cycleMilestoneId = `cycle-completed-${currentCycle.id}`;
      if (!currentCelebrated.includes(cycleMilestoneId)) {
        currentCelebrated.push(cycleMilestoneId);
        updated = true;
      }
    }

    if (updated) {
      setCelebratedMilestones(currentCelebrated);
      localStorage.setItem(`celebrations_${sol.id}`, JSON.stringify(currentCelebrated));
      
      // Trigger a beautiful, elegant multi-burst canvas-confetti celebration
      const duration = 4 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 28, spread: 360, ticks: 60, zIndex: 1100 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }
        const particleCount = 45 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.35), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.65, 0.9), y: Math.random() - 0.2 } });
      }, 250);
    }
  }, [sol.id, totalSavings, isCycleFullyPaid, currentCycle?.id]);

  const filteredSolMembers = solMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
                          member.phone.includes(memberSearch);
    if (!matchesSearch) return false;

    if (memberFilter === 'all') return true;
    if (!currentCycle) return true;

    const cycleContrib = solContributions.find(c => c.memberId === member.id && c.cycleId === currentCycle.id);
    const isPaid = cycleContrib?.status === 'paid';

    if (memberFilter === 'paid') return isPaid;
    if (memberFilter === 'unpaid') return !isPaid;

    return true;
  });

  const generatePDFReport = () => {
    const totalFunds = solContributions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.amount, 0);

    const successfulContribs = solContributions.filter(c => c.status === 'paid');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Tanpri pèmèt popups pou kapab wè ak enprime rapò sa a.');
      return;
    }

    const creoleDate = new Date().toLocaleString('ht-HT', { hour12: false });

    printWindow.document.write(`
      <html>
        <head>
          <title>Rapò Sòl - ${sol.name}</title>
          <style>
            body {
              font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
              color: #0f172a;
              padding: 40px;
              line-height: 1.6;
            }
            .header {
              border-bottom: 2px solid #ea580c;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .brand {
              font-size: 24px;
              font-weight: 900;
              text-transform: uppercase;
              color: #ea580c;
            }
            .title {
              font-size: 20px;
              font-weight: 700;
              margin-top: 5px;
            }
            .meta {
              font-size: 11px;
              color: #64748b;
              margin-top: 5px;
            }
            .summary-cards {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 15px;
            }
            .card-title {
              font-size: 11px;
              text-transform: uppercase;
              color: #64748b;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .card-value {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 12px;
            }
            th {
              background: #f1f5f9;
              text-align: left;
              padding: 10px;
              font-weight: bold;
              border-bottom: 2px solid #e2e8f0;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            }
            .badge {
              background: #dcfce7;
              color: #15803d;
              padding: 2px 8px;
              border-radius: 9999px;
              font-size: 10px;
              font-weight: bold;
            }
            .footer {
              margin-top: 50px;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
              font-size: 10px;
              text-align: center;
              color: #64748b;
            }
            @media print {
              .no-print { display: none; }
            }
            .print-btn {
              background: #ea580c;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 8px;
              font-weight: bold;
              cursor: pointer;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="print-btn" onclick="window.print()">Enprime / Sove kòm PDF</button>
          </div>
          <div class="header">
            <div class="brand">SÒLAYITI &bull; CONTIVO AI REPORT</div>
            <div class="title">Rapò Detaye Sòl la: ${sol.name}</div>
            <div class="meta">Rapò sa a pwodwi otomatikman nan dat: ${creoleDate} | UTC: 2026-06-23</div>
          </div>

          <div class="summary-cards">
            <div class="card">
              <div class="card-title">Fon Total ki Jere (HTG)</div>
              <div class="card-value" style="color: #15803d;">${totalFunds.toLocaleString()} HTG</div>
            </div>
            <div class="card">
              <div class="card-title">Kotizasyon ki Reyisi</div>
              <div class="card-value">${successfulContribs.length} sou ${solContributions.length}</div>
            </div>
            <div class="card">
              <div class="card-title">Patisipan yo</div>
              <div class="card-value">${solMembers.length} manm</div>
            </div>
            <div class="card">
              <div class="card-title">Montan Kotizasyon / Frekans</div>
              <div class="card-value">${sol.contributionAmount.toLocaleString()} HTG / ${sol.frequency.toUpperCase()}</div>
            </div>
          </div>

          <h3 style="font-size: 14px; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Lis Kontribisyon ki Peye ak Siksè</h3>
          <table>
            <thead>
              <tr>
                <th>Manm</th>
                <th>Sik / Men</th>
                <th>Montan</th>
                <th>Dat Peman</th>
                <th>Metòd</th>
                <th>Sitiyasyon</th>
              </tr>
            </thead>
            <tbody>
              ${successfulContribs.map(c => {
                const m = solMembers.find(m => m.id === c.memberId);
                const cycle = cycles.find(cy => cy.id === c.cycleId);
                return `
                  <tr>
                    <td><strong>${m ? m.name : c.memberId}</strong></td>
                    <td>Sik #${cycle ? cycle.cycleNumber : '1'}</td>
                    <td>${c.amount.toLocaleString()} HTG</td>
                    <td>${c.paidDate ? new Date(c.paidDate).toLocaleDateString('ht-HT') : ''}</td>
                    <td>${c.paymentMethod || 'MonCash'}</td>
                    <td><span class="badge">Siksè / Peye</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            Rapò sa a sekirize nèt pa Sòlayiti Platform. Contivo Content & Financial Intelligence.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;
    onInviteMember(sol.id, newMemberName, newMemberEmail);
    setNewMemberName('');
    setNewMemberEmail('');
    setShowInviteModal(false);
  };

  const handleConfirmPaid = () => {
    if (confirmPaidId) {
      onMarkPaid(confirmPaidId, payMethod);
      setConfirmPaidId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300">
            <CheckCircle className="w-3 h-3 text-emerald-800" />
            <span>{t.statusPaid}</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-800" />
            <span>{t.statusPending}</span>
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-950 border border-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-850" />
            <span>{t.statusLate}</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getFrequencyLabel = (freq: string) => {
    if (freq === 'daily') return t.freqDaily;
    if (freq === 'weekly') return t.freqWeekly;
    if (freq === 'every_15_days') return t.freqEvery15Days;
    if (freq === 'biweekly') return t.freqBiweekly;
    return t.freqMonthly;
  };

  const activeBeneficiary = solBeneficiaries.find(b => b.status === 'current');
  const nextBeneficiary = solBeneficiaries.find(b => b.status === 'upcoming');
  const unpaidMembersForCurrentCycle = solMembers.filter(member => {
    if (!currentCycle) return false;
    const contrib = solContributions.find(c => c.memberId === member.id && c.cycleId === currentCycle.id);
    return contrib?.status !== 'paid';
  });

  const currentCycleContributions = currentCycle ? solContributions.filter(c => c.cycleId === currentCycle.id) : [];
  const paidCurrentCycleContributions = currentCycleContributions.filter(c => c.status === 'paid');
  const totalTargetAmount = sol.contributionAmount * solMembers.length;
  const currentCollectedAmount = paidCurrentCycleContributions.reduce((sum, c) => sum + c.amount, 0);
  const totalExpectedContributions = currentCycleContributions.length || solMembers.length || 1;
  const contributionProgressPercent = Math.round((paidCurrentCycleContributions.length / totalExpectedContributions) * 100);

  // Helper to calculate projected payout date for any beneficiary position
  const getProjectedPayoutDate = (beneficiary: Beneficiary) => {
    if (beneficiary.status === 'completed') {
      return beneficiary.payoutDate;
    }

    const currentActiveCycle = cycles.find(cy => cy.solId === sol.id && cy.status === 'active');
    if (!currentActiveCycle) {
      return beneficiary.payoutDate;
    }

    const currentHand = currentActiveCycle.currentHandPosition || 1;
    const targetPosition = beneficiary.position;

    if (targetPosition < currentHand) {
      return beneficiary.payoutDate;
    }

    const baseDate = new Date(currentActiveCycle.endDate || new Date());
    const handDiff = targetPosition - currentHand;
    if (handDiff === 0) {
      return currentActiveCycle.endDate;
    }

    let daysPerHand = 7;
    if (sol.frequency === 'daily') daysPerHand = 1;
    else if (sol.frequency === 'weekly') daysPerHand = 7;
    else if (sol.frequency === 'biweekly') daysPerHand = 14;
    else if (sol.frequency === 'every_15_days') daysPerHand = 15;
    else if (sol.frequency === 'monthly') daysPerHand = 30;

    const groupPaidContribs = solContributions.filter(c => c.status === 'paid' && c.paidDate);
    let avgPaymentDelayDays = 0;
    if (groupPaidContribs.length > 0) {
      let totalDelay = 0;
      let count = 0;
      groupPaidContribs.forEach(c => {
        const cy = cycles.find(y => y.id === c.cycleId);
        if (cy && c.paidDate) {
          const limit = new Date(c.dueDate).getTime();
          const paid = new Date(c.paidDate).getTime();
          const delay = Math.max(0, Math.round((paid - limit) / (1000 * 60 * 60 * 24)));
          totalDelay += delay;
          count++;
        }
      });
      if (count > 0) {
        avgPaymentDelayDays = totalDelay / count;
      }
    }

    const totalDaysToAdd = (handDiff * daysPerHand) + Math.round(handDiff * avgPaymentDelayDays * 0.4);
    const projectedDate = new Date(baseDate);
    projectedDate.setDate(projectedDate.getDate() + totalDaysToAdd);
    
    return projectedDate.toISOString().split('T')[0];
  };

  // Dataset for Member Consistency Bar Chart (Consistency over last 6 months)
  const memberConsistencyData = React.useMemo(() => {
    return solMembers.map(m => {
      const memberContribs = solContributions.filter(c => c.memberId === m.id);
      const paidCount = memberContribs.filter(c => c.status === 'paid').length;
      const totalCount = memberContribs.length || 1;
      const rate = Math.round((paidCount / totalCount) * 100);
      
      return {
        name: m.name.split(' ')[0],
        fullName: m.name,
        'Konsistans (%)': rate,
        'Peye': paidCount,
        'Total': totalCount
      };
    });
  }, [solMembers, solContributions]);

  // Dataset for Member Current Cycle Consistency Bar Chart
  const currentCycleConsistencyData = React.useMemo(() => {
    if (!currentCycle) return [];
    return solMembers.map(m => {
      const cycleContribs = solContributions.filter(c => c.memberId === m.id && c.cycleId === currentCycle.id);
      const paidAmount = cycleContribs.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
      const pendingAmount = cycleContribs.filter(c => c.status !== 'paid').reduce((sum, c) => sum + c.amount, 0);
      const totalAmount = cycleContribs.reduce((sum, c) => sum + c.amount, 0);
      const paidCount = cycleContribs.filter(c => c.status === 'paid').length;
      const totalCount = cycleContribs.length || 1;
      const consistencyRate = Math.round((paidCount / totalCount) * 100);

      return {
        name: m.name.split(' ')[0],
        fullName: m.name,
        'Peye (HTG)': paidAmount,
        'Poko Peye (HTG)': pendingAmount,
        'Total (HTG)': totalAmount,
        'Konsistans (%)': consistencyRate,
        status: paidCount === totalCount ? 'Peye' : 'Poko Peye'
      };
    });
  }, [solMembers, solContributions, currentCycle]);

  return (
    <div id="sol-details-root" className="max-w-6xl mx-auto px-4 py-8 text-left font-sans leading-relaxed">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="flex items-start space-x-4">
          <button
            onClick={onBack}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shrink-0 mt-1 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-650" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{sol.name}</h1>
              {isMamanSol && (
                <span className="bg-orange-100 text-orange-950 text-[10px] font-black px-2.5 py-0.5 rounded-md flex items-center border border-orange-200 shadow-xs">
                  <Shield className="w-3 h-3 mr-1 text-orange-700" />
                  Gérante
                </span>
              )}
              <button
                onClick={generatePDFReport}
                className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-705 hover:text-slate-900 text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center shadow-xs transition-colors cursor-pointer"
                title="Pwodui Rapò PDF"
              >
                <FileText className="w-3.5 h-3.5 mr-1 text-orange-600" />
                <span>PDF Rapò</span>
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-xl">{sol.description}</p>
          </div>
        </div>

        {/* Quick specs card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-wrap items-center gap-6 md:gap-8 text-xs text-slate-800 font-medium shrink-0 ml-12 md:ml-0 shadow-sm">
          <div>
            <span className="text-slate-500 block text-[10px] font-extrabold uppercase mb-1">{t.potAmount}</span>
            <span className="font-mono text-lg font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-150">{(sol.contributionAmount * solMembers.length).toLocaleString()} HTG</span>
          </div>
          <div className="hidden sm:block w-px h-12 bg-slate-200"></div>
          <div>
            <span className="text-slate-500 block text-[10px] font-extrabold uppercase mb-1">{t.frequency}</span>
            <span className="font-black text-orange-950 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100 uppercase text-xs tracking-wider">{getFrequencyLabel(sol.frequency)}</span>
          </div>
        </div>
      </div>

      {/* QUICK SNAPSHOT CARD */}
      <BentoCard
        id="sol-quick-snapshot"
        index={0}
        hoverScale={false}
        className="p-6 mb-8 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-[2rem] shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-orange-500 animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">Snapchot Rapid Sik Sa A (Quick Snapshot)</h3>
            </div>
            <span className="px-2.5 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] font-black border border-orange-500/30 rounded-full uppercase tracking-wider">
              {currentCycle ? `Sik Aktif #${currentCycle.cycleNumber}` : "Pa gen sik aktif"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-1">
            {/* Total Payout Amount */}
            <div className="space-y-1 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center space-x-2 text-slate-450">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Montan Distribisyon (Total Payout)</span>
              </div>
              <p className="font-mono text-xl font-black text-emerald-400">
                {(sol.contributionAmount * solMembers.length).toLocaleString()} HTG
              </p>
              <p className="text-[9px] text-slate-400">
                {sol.contributionAmount.toLocaleString()} HTG x {solMembers.length} manm
              </p>
            </div>

            {/* Next Beneficiary */}
            <div className="space-y-1 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center space-x-2 text-slate-450">
                <Users className="w-4 h-4 text-orange-400" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Pwochen Benefisyè (Next Beneficiary)</span>
              </div>
              <p className="text-sm font-black text-slate-100 truncate">
                {nextBeneficiary ? nextBeneficiary.memberName : (currentLanguage === 'creole' ? "Pa genyen" : "Aucun")}
              </p>
              <p className="text-[9px] text-slate-400">
                {nextBeneficiary ? `Pozisyon #${nextBeneficiary.position} nan tiray la` : "Tout manm touche deja"}
              </p>
            </div>

            {/* Days Remaining */}
            <div className="space-y-1 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center space-x-2 text-slate-450">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Tan ki Rete (Days Remaining)</span>
              </div>
              <p className="font-mono text-xl font-black text-amber-400">
                {currentCycle ? `${daysRemaining} ${currentLanguage === 'creole' ? 'Jou' : 'Jours'}` : "0 Jou"}
              </p>
              <p className="text-[9px] text-slate-400">
                {currentCycle ? `Sik la ap fini le ${currentCycle.endDate}` : "Sik la poko demare"}
              </p>
            </div>
          </div>
        </div>
      </BentoCard>

      {/* MAMAN SÒL ADMINISTRATIVE UTILITY */}
      {isMamanSol && activeBeneficiary && (
        <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/15 border border-orange-500/20 rounded-[2rem] p-5 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-orange-700 tracking-wider uppercase bg-orange-500/10 px-2 py-0.5 rounded">
              Panèl Sipèvizyon Maman Sòl
            </span>
            <p className="text-sm font-black text-slate-800">
              Men ki aktif: <span className="text-orange-700">#{activeBeneficiary.position} &ndash; {activeBeneficiary.memberName}</span>
            </p>
            <p className="text-xs text-slate-600">
              Lè ou konfime tout moun peye, ou ka peye benefisye a epi fèmen wotasyon men sa a pou kòmanse pwochen an.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            {unpaidMembersForCurrentCycle.length > 0 && (
              <button
                onClick={() => {
                  const memberIds = unpaidMembersForCurrentCycle.map(m => m.id);
                  onSendReminders(sol.id, memberIds);
                }}
                className="w-full sm:w-auto bg-slate-900 hover:bg-orange-600 text-white font-extrabold text-xs py-3 px-5 rounded-2xl shadow-sm flex items-center justify-center space-x-2 transition-transform hover:-translate-y-0.5 shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {currentLanguage === 'creole' 
                    ? `Voye Rapèl (${unpaidMembersForCurrentCycle.length})` 
                    : `Rappeler (${unpaidMembersForCurrentCycle.length})`}
                </span>
              </button>
            )}

            <button
              onClick={async () => {
                if (window.confirm(currentLanguage === 'creole' 
                  ? `Èske w konfime ou distribiye Pòt la (${sol.totalPot.toLocaleString()} HTG) bay ${activeBeneficiary.memberName} epi w vle fèmen men sa a?`
                  : `Confirmez-vous la distribution de la main de ${sol.totalPot.toLocaleString()} HTG à ${activeBeneficiary.memberName} ?`
                )) {
                  try {
                    await onCompleteCycleHand(sol.id);
                    
                    // Trigger a spectacular, community-rewarding confetti celebration!
                    const duration = 5 * 1000;
                    const end = Date.now() + duration;

                    const frame = () => {
                      confetti({
                        particleCount: 5,
                        angle: 60,
                        spread: 65,
                        origin: { x: 0, y: 0.8 },
                        colors: ['#f97316', '#fb923c', '#fdba74', '#10b981', '#34d399', '#3b82f6']
                      });
                      confetti({
                        particleCount: 5,
                        angle: 120,
                        spread: 65,
                        origin: { x: 1, y: 0.8 },
                        colors: ['#f97316', '#fb923c', '#fdba74', '#10b981', '#34d399', '#3b82f6']
                      });

                      if (Date.now() < end) {
                        requestAnimationFrame(frame);
                      }
                    };
                    frame();
                  } catch (err) {
                    console.error("Confetti trigger skipped because of hand rotation error:", err);
                  }
                }
              }}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs py-3 px-5 rounded-2xl shadow-sm flex items-center justify-center space-x-2 transition-transform hover:-translate-y-0.5 shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t.completeCycle}</span>
            </button>
          </div>
        </div>
      )}

      {/* METRIC PROGRESS CARD */}
      {currentCycle && (
        <BentoCard
          id="sol-details-metric-progress"
          index={1}
          hoverScale={false}
          className="p-8 mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t.payoutProgress}</p>
            <div className="flex items-center space-x-3">
              <span className="font-mono text-2xl font-black text-slate-800">
                {solBeneficiaries.filter(b => b.status === 'completed').length} / {solBeneficiaries.length}
              </span>
              <span className="text-xs text-slate-500">men touche</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(solBeneficiaries.filter(b => b.status === 'completed').length / solBeneficiaries.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-1 md:border-l border-slate-200 md:pl-6 text-xs text-slate-600 font-medium">
            <span className="text-slate-450 block text-[10px] font-bold uppercase mb-1">{t.activeBeneficiary}</span>
            {activeBeneficiary ? (
              <div>
                <p className="font-extrabold text-slate-850 text-sm">{activeBeneficiary.memberName}</p>
                <p className="text-[10px] text-orange-600 font-bold">Men #{activeBeneficiary.position} &bull; Dat limit: {activeBeneficiary.payoutDate}</p>
              </div>
            ) : (
              <p className="italic text-slate-400">Pa gen sèk men aktif</p>
            )}
          </div>

          <div className="space-y-1 md:border-l border-slate-200 md:pl-6 text-xs text-slate-600 font-medium">
            <span className="text-slate-450 block text-[10px] font-bold uppercase mb-1">{t.nextBeneficiary}</span>
            {nextBeneficiary ? (
              <div>
                <p className="font-extrabold text-slate-850 text-sm">{nextBeneficiary.memberName}</p>
                <p className="text-[10px] text-slate-400 font-mono">Men #{nextBeneficiary.position} &bull; Tou proche</p>
              </div>
            ) : (
              <p className="italic text-slate-400">Sèk sa a fini nèt</p>
            )}
          </div>

          <div className="space-y-2 lg:border-l border-slate-200 lg:pl-6 text-xs text-slate-600 font-medium">
            <span className="text-slate-450 block text-[10px] font-bold uppercase mb-1">Peman Benefisyè Aktif (Milestone Progress)</span>
            {activeBeneficiary ? (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 text-[11px]">
                    {currentCollectedAmount.toLocaleString()} / {totalTargetAmount.toLocaleString()} HTG
                  </span>
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                    {contributionProgressPercent}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-orange-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${contributionProgressPercent}%` }}
                  ></div>
                </div>
                <p className="text-[9px] text-slate-400 font-medium">
                  {paidCurrentCycleContributions.length} nan {totalExpectedContributions} manm peye pou men sa a
                </p>
              </div>
            ) : (
              <p className="italic text-slate-400">Pa gen sèk men aktif</p>
            )}
          </div>
        </BentoCard>
      )}

      {/* COMPONENT TABS CONTROLLERS */}
      <div className="flex border-b border-slate-200 mb-6 space-x-2 overflow-x-auto scrollbar-none">
        {(['members', 'contributions', 'beneficiaries', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 text-xs font-black border-b-2 transition-all shrink-0 uppercase tracking-wider cursor-pointer ${
              activeTab === tab
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab === 'members'
              ? t.membersTab
              : tab === 'contributions'
              ? t.contributionsTab
              : tab === 'beneficiaries'
              ? t.beneficiariesTab
              : t.settingsTab}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: MEMBERS */}
      {activeTab === 'members' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h3 className="text-md font-bold text-slate-800">Patisipan k ap woule ({solMembers.length})</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportMembersToCSV}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-705 text-xs font-black py-2 px-3.5 rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                title="Sove anyè manm yo kòm CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Dirèktori CSV (Maman Sòl Records)</span>
              </button>
              {isMamanSol && (
                <>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="bg-slate-900 hover:bg-orange-600 text-white text-xs font-black py-2 px-3 rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{t.inviteMemberBtn}</span>
                  </button>
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-black py-2 px-3 rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                    id="bulk-import-members-btn"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Enpòte an Masa (Bulk)</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* SEARCH & FILTER BAR */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder={currentLanguage === 'creole' ? 'Chache manm pa non oswa telefòn...' : 'Rechercher un membre par nom ou téléphone...'}
                className="w-full pl-9 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-orange-500 focus:bg-white text-slate-700"
              />
            </div>
            <div className="relative min-w-[150px]">
              <select
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-orange-500 focus:bg-white font-bold text-slate-700"
              >
                <option value="all">{currentLanguage === 'creole' ? 'Tout Manm' : 'Tous les membres'}</option>
                <option value="paid">{currentLanguage === 'creole' ? 'Peye' : 'Payés'}</option>
                <option value="unpaid">{currentLanguage === 'creole' ? 'Poko Peye' : 'Non payés'}</option>
              </select>
            </div>
          </div>

          {/* CURRENT CYCLE CONTRIBUTION CONSISTENCY BAR CHART */}
          {currentCycle && currentCycleConsistencyData.length > 0 && (
            <BentoCard
              id="sol-member-cycle-consistency-chart"
              index={0}
              hoverScale={false}
              className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-orange-600 animate-pulse" />
                    {currentLanguage === 'creole' 
                      ? `Konsistans Kotizasyon Patisipan yo (Sik Kouran #${currentCycle.cycleNumber})`
                      : `Régularité des Cotisations des Membres (Cycle Actuel #${currentCycle.cycleNumber})`}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {currentLanguage === 'creole'
                      ? 'Vizyalizasyon nivo peman kotizasyon ak fon ki kolekte nan men chak manm pou wotasyon aktif la.'
                      : 'Visualisation du montant cotisé et collecté par membre pour cette rotation active.'}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-md shadow-xs"></span> {currentLanguage === 'creole' ? 'Peye' : 'Payé'}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded-md shadow-xs"></span> {currentLanguage === 'creole' ? 'Poko Peye' : 'Non payé'}</span>
                </div>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={currentCycleConsistencyData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(val) => `${val.toLocaleString()} G`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: '#0f172a', 
                        border: 'none', 
                        borderRadius: '12px', 
                        color: '#fff', 
                        fontSize: '11px',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                      }}
                      formatter={(value: any, name: any) => [
                        `${value.toLocaleString()} HTG`,
                        name === 'Peye (HTG)' 
                          ? (currentLanguage === 'creole' ? 'Kotizasyon Peye' : 'Cotisation Payée')
                          : (currentLanguage === 'creole' ? 'Poko Peye' : 'Non Payée')
                      ]}
                    />
                    <Bar dataKey="Peye (HTG)" stackId="a" fill="#10b981" maxBarSize={32} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Poko Peye (HTG)" stackId="a" fill="#f59e0b" maxBarSize={32} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </BentoCard>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredSolMembers.length === 0 && (
              <div className="col-span-full text-center py-8 text-xs text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">
                {currentLanguage === 'creole' ? 'Pa gen manm ki koresponn ak rechèch sa a.' : 'Aucun membre ne correspond à cette recherche.'}
              </div>
            )}
            {filteredSolMembers.map((member, index) => {
              const loyalty = getLoyaltyPoints(member.id);
              return (
                <BentoCard
                  key={member.id}
                  id={`member-card-${member.id}`}
                  index={index}
                  hoverScale={true}
                  onClick={() => setSelectedMemberProfile(member)}
                  className={`p-4 relative flex items-center space-x-3 cursor-pointer hover:ring-2 hover:ring-orange-500/20 transition-all ${
                    member.id === sol.creatorId
                      ? 'bg-orange-50/40 border-orange-200/50'
                      : 'bg-white'
                  }`}
                >
                  <img
                    src={member.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`}
                    alt={member.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1">
                      <p className="text-xs font-bold text-slate-850 truncate max-w-[120px]">{member.name}</p>
                      {member.id === sol.creatorId && (
                        <span className="px-1 py-0.5 text-[8px] bg-orange-600 text-white rounded font-extrabold uppercase shrink-0">Mè Sòl</span>
                      )}
                      {sol.memberTiers?.[member.id] && (
                        <span className="px-1.5 py-0.5 text-[8px] bg-sky-50 text-sky-700 border border-sky-150 rounded-md font-bold shrink-0">
                          {sol.memberTiers[member.id].tierAmount.toLocaleString()} HTG
                        </span>
                      )}
                      {loyalty.isElite && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[8px] bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded font-black uppercase shrink-0 gap-0.5 animate-pulse" title="Elite Member: Pa gen reta ak peman rapid!">
                          <Award className="w-2.5 h-2.5" />
                          <span>Manm Elit</span>
                        </span>
                      )}
                      {isFastPayer(member.id) && (
                        <span className="inline-flex items-center px-1 py-0.5 text-[8px] bg-amber-100 text-amber-800 border border-amber-200 rounded font-extrabold uppercase shrink-0 gap-0.5" title="Peye alè oswa anvan lè">
                          <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500 shrink-0" />
                          <span>Peye Rapid</span>
                        </span>
                      )}
                      {currentCycle && (
                        (() => {
                          const cycleContrib = solContributions.find(c => c.memberId === member.id && c.cycleId === currentCycle.id);
                          const isPaid = cycleContrib?.status === 'paid';
                          const badgeText = isPaid
                            ? (currentLanguage === 'creole' ? 'Peye' : currentLanguage === 'french' ? 'Payé' : 'Paid')
                            : (currentLanguage === 'creole' ? 'Poko peye' : currentLanguage === 'french' ? 'Non payé' : 'Unpaid');
                          const badgeClass = isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200';
                          return (
                            <span className={`px-1 py-0.5 text-[7.5px] rounded font-extrabold uppercase shrink-0 ${badgeClass}`}>
                              {badgeText}
                            </span>
                          );
                        })()
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{member.phone}</p>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <p className="text-slate-550 truncate">
                        Pozisyon tiray: <b className="text-slate-700">#{solBeneficiaries.find(b => b.memberId === member.id)?.position || '?'}</b>
                      </p>
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded-md font-mono text-[9px] font-bold text-slate-600">
                        {loyalty.points} Pts Fidelite
                      </span>
                    </div>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className={`w-2.5 h-2.5 rounded-full block ${
                      member.status === 'active' ? 'bg-emerald-500' : 'bg-orange-400'
                    }`} />
                  </div>
                </BentoCard>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CONTRIBUTIONS */}
      {activeTab === 'contributions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2">
            <h3 className="text-md font-bold text-slate-800">Liv rapò kotizasyon nimerik</h3>
            <span className="text-xs text-slate-450 font-mono">Total so: {solContributions.length} tranzaksyon</span>
          </div>

          <BentoCard
            id="sol-details-contributions-table"
            index={1}
            hoverScale={false}
            className="overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 font-bold uppercase text-[9.5px] tracking-wider">
                    <th className="p-4">Manm / Patisipan</th>
                    <th className="p-4">Kantite HTG</th>
                    <th className="p-4">Dat Limit</th>
                    <th className="p-4">Sitiyasyon</th>
                    {isMamanSol && <th className="p-4 text-right">Aksyon Gérante</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {solContributions
                    .sort((a,b) => b.dueDate.localeCompare(a.dueDate))
                    .map((contrib) => {
                      const m = members.find(mem => mem.id === contrib.memberId);
                      return (
                        <tr key={contrib.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center space-x-2.5">
                              <img
                                src={m?.avatarUrl}
                                alt={m?.name}
                                className="w-6 h-6 rounded-full object-cover border border-slate-100"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <p className="font-bold text-slate-800">{m?.name || 'Unknown'}</p>
                                {contrib.paidDate && (
                                  <p className="text-[10px] text-slate-400 font-mono">Peye: {contrib.paidDate} {contrib.paymentMethod ? `(${contrib.paymentMethod})` : ''}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-800">{contrib.amount.toLocaleString()} HTG</td>
                          <td className="p-4 font-mono text-slate-600">{contrib.dueDate}</td>
                          <td className="p-4">{getStatusBadge(contrib.status)}</td>
                          {isMamanSol && (
                            <td className="p-4 text-right">
                              {contrib.status !== 'paid' ? (
                                <div className="flex justify-end gap-1.5 flex-wrap">
                                  <button
                                    onClick={() => setConfirmPaidId(contrib.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-black px-2.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
                                  >
                                    {t.markAsPaid}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm(currentLanguage === 'creole' ? `Èske w vle anrejistre yon peman kach (Manyèl Override) pou ${m?.name || 'manm sa a'}?` : `Enregistrer un paiement manuel en espèces (Manual Override) pour ${m?.name || 'ce membre'}?`)) {
                                        onMarkPaid(contrib.id, 'Manual Override (Cash)');
                                      }
                                    }}
                                    className="bg-amber-650 hover:bg-amber-700 text-white text-[10.5px] font-black px-2.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
                                    title="Administrative Manual Override (record off-platform cash payment)"
                                  >
                                    <span>Override (Cash)</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-emerald-650 font-black">&#10003; Konfime</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </BentoCard>
        </div>
      )}

      {/* TAB CONTENT: BENEFICIARIES ORDER / TIRAY */}
      {activeTab === 'beneficiaries' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-bold text-slate-800">Sèk ak Lòd Touché (Tiray)</h3>
            <span className="text-xs text-orange-700 font-extrabold bg-orange-50 border border-orange-200 px-3 py-0.5 rounded-full">
              {sol.tirayMethod === 'random' ? t.tirayRandom : sol.tirayMethod === 'first_come' ? t.tirayFirstCome : t.tirayManual}
            </span>
          </div>

          {/* VISUAL PAYOUT PATH MAP */}
          <BentoCard
            id="payout-path-map-card"
            index={1}
            hoverScale={false}
            className="p-5 md:p-6 bg-[#FAF9F6] border border-slate-200 rounded-[2rem] space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-150 pb-3 gap-3">
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-600 animate-ping"></span>
                  Chemen Distribisyon Men yo (Payout Path)
                </h4>
                <p className="text-[10px] text-slate-500">Vizyalizasyon sikilasyon ak sekans distribisyon kès la</p>
              </div>
              <div className="flex items-center space-x-3 text-[10px] font-bold">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-md"></span> Touche</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-orange-500 rounded-md animate-pulse"></span> Next</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-slate-300 rounded-md"></span> Ap Vini</span>
              </div>
            </div>

            {/* SIMULATE SWAP CONTROLS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-orange-600" />
                    Similatè Payout Swap (Swap Simulator)
                  </p>
                  <p className="text-[10px] text-slate-500">Pratike chanjman nan kès la si de manm bezwen swap plas pou wotasyon sa a</p>
                </div>
                <button
                  onClick={() => {
                    setIsSimulatingSwap(!isSimulatingSwap);
                    if (isSimulatingSwap) {
                      setSwapMemberA('');
                      setSwapMemberB('');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${isSimulatingSwap ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-755 hover:bg-slate-200'}`}
                >
                  {isSimulatingSwap ? "Fèmen Similasyon" : "Simile Payout Swap"}
                </button>
              </div>

              {isSimulatingSwap && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Premye Manm (Member A)</label>
                    <select
                      value={swapMemberA}
                      onChange={(e) => setSwapMemberA(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-orange-500 text-slate-750 font-medium"
                    >
                      <option value="">-- Chwazi Manm A --</option>
                      {solBeneficiaries.map(b => (
                        <option key={`swap-a-${b.id}`} value={b.memberId}>
                          {b.position}. {b.memberName} ({b.status === 'completed' ? 'Touche' : b.status === 'current' ? 'Kounye a' : 'Ap vini'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Dezyèm Manm (Member B)</label>
                    <select
                      value={swapMemberB}
                      onChange={(e) => setSwapMemberB(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-orange-500 text-slate-750 font-medium"
                    >
                      <option value="">-- Chwazi Manm B --</option>
                      {solBeneficiaries.map(b => (
                        <option key={`swap-b-${b.id}`} value={b.memberId}>
                          {b.position}. {b.memberName} ({b.status === 'completed' ? 'Touche' : b.status === 'current' ? 'Kounye a' : 'Ap vini'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end pb-0.5">
                    {swapMemberA && swapMemberB && swapMemberA !== swapMemberB ? (
                      <div className="w-full p-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
                        <p className="text-[10px] text-amber-800 font-extrabold uppercase tracking-tight">
                          ⚠️ PREVIEW SIMILASYON AKTIF
                        </p>
                        <p className="text-[8px] text-slate-500 mt-0.5">Nòt: Sa a se yon previzyon sèlman, lòd la pa chanje nèt nan baz la.</p>
                      </div>
                    ) : (
                      <p className="text-[9px] text-slate-400 italic">Chwazi de (2) manm diferan pou previze lòd la</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Horizontal flow line */}
            <div className="flex items-center overflow-x-auto pb-4 pt-2 gap-3 no-scrollbar scroll-smooth">
              {simulatedBeneficiaries.map((b, index) => {
                const itemMember = members.find(m => m.id === b.memberId);
                const isCompleted = b.status === 'completed';
                const isCurrent = b.status === 'current';
                
                let borderCol = "border-slate-200 bg-white";
                let textCol = "text-slate-500";
                let statusBadge = "bg-slate-100 text-slate-500";
                let statusText = "Ap vini";

                if (isCompleted) {
                  borderCol = "border-emerald-500 bg-emerald-50/20";
                  textCol = "text-emerald-800 font-bold";
                  statusBadge = "bg-emerald-500 text-white";
                  statusText = "Touche ✓";
                } else if (isCurrent) {
                  borderCol = "border-orange-500 bg-orange-50 ring-2 ring-orange-100";
                  textCol = "text-orange-900 font-extrabold";
                  statusBadge = "bg-orange-600 text-white animate-pulse";
                  statusText = "Kounye a ➔";
                }

                return (
                  <React.Fragment key={b.id}>
                    {/* Node Card */}
                    <div className={`flex flex-col items-center p-3.5 border rounded-2xl min-w-[130px] max-w-[150px] shrink-0 text-center space-y-2 ${borderCol}`}>
                      <span className="text-[10px] font-mono font-black text-slate-400">POS #{b.position}</span>
                      <div className="relative">
                        <img
                          src={itemMember?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${b.memberName}`}
                          alt={b.memberName}
                          className={`w-10 h-10 rounded-full object-cover border-2 ${isCompleted ? 'border-emerald-500' : isCurrent ? 'border-orange-500 animate-pulse' : 'border-slate-200'}`}
                          referrerPolicy="no-referrer"
                        />
                        {isCompleted && (
                          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border border-white">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 w-full">
                        <p className={`text-xs truncate ${textCol}`}>{b.memberName}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5 font-bold">{b.payoutAmount.toLocaleString()} HTG</p>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${statusBadge}`}>
                        {statusText}
                      </span>
                    </div>

                    {/* Arrow Connection if not last */}
                    {index < simulatedBeneficiaries.length - 1 && (
                      <div className="flex items-center shrink-0">
                        <ArrowRight className={`w-4 h-4 ${isCompleted ? 'text-emerald-500' : 'text-slate-300'}`} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </BentoCard>

          <div className="relative border-l-2 border-slate-200 pl-6 ml-4 py-3 space-y-6 text-xs text-slate-600">
            {simulatedBeneficiaries.map((b, index) => {
              const itemMember = members.find(m => m.id === b.memberId);
              
              let cardBg = "";
              let dotBg = "bg-slate-300 ring-slate-100";
              let badge = null;

              if (b.status === 'completed') {
                cardBg = "bg-emerald-50/40 border-emerald-100 text-emerald-800";
                dotBg = "bg-emerald-500 ring-emerald-100";
                badge = <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-black uppercase">{t.completedPayout}</span>;
              } else if (b.status === 'current') {
                cardBg = "bg-orange-50 border-orange-200 text-slate-900 ring-2 ring-orange-100/50";
                dotBg = "bg-orange-600 ring-orange-100 animate-pulse";
                badge = <span className="text-[9px] bg-orange-600 text-white px-2 py-0.5 rounded font-black uppercase tracking-wider">{t.currentPayout}</span>;
              }

              return (
                <div key={b.id} className="relative">
                  {/* Timeline bullet dot */}
                  <div className={`absolute -left-[32px] top-4 w-5 h-5 rounded-lg ring-4 flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${dotBg} z-10`}>
                    {b.position}
                  </div>

                  {/* Card panel */}
                  <BentoCard
                    id={`beneficiary-card-${b.id}`}
                    index={index}
                    hoverScale={true}
                    className={`p-4 flex items-center justify-between gap-4 ${cardBg}`}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={itemMember?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${b.memberName}`}
                        alt={b.memberName}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-extrabold text-slate-900">{b.memberName}</p>
                          {b.memberId === currentUser.id && (
                            <span className="bg-slate-900 text-white text-[8px] font-bold px-1.5 rounded uppercase">W a isit</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-550 font-mono mt-0.5">
                          Men #{b.position} | {b.status === 'completed' ? `Dat Peye: ${b.payoutDate}` : `Dat Previze: ${getProjectedPayoutDate(b)}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <p className="font-mono font-black text-slate-850 text-sm">{b.payoutAmount.toLocaleString()} HTG</p>
                      {badge}
                    </div>
                  </BentoCard>
                </div>
              );
            })}
          </div>

          <div className="bg-orange-50 border border-orange-200/50 rounded-2xl p-4 text-[11px] text-orange-950 leading-relaxed font-semibold mt-4">
            🗓️ <b>Metòd Previzyon Payout (Projection Engine)</b>: Dat previze yo kalkile otomatikman selon frekans gwoup la ({sol.frequency}) epi yo pran an konsiderasyon vitès ak konsistans mwayèn manm yo pou peye kotizasyon yo pou bay yon dat ki reyèl.
          </div>

          {/* PREVIOUS CYCLES SECTION */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="space-y-1">
              <h3 className="text-md font-bold text-slate-800">Sik ki te Pase yo (Previous Cycles)</h3>
              <p className="text-xs text-slate-400">Istorik ak achiv konplè sou sik Sòl ki fini ak siksè.</p>
            </div>

            {(() => {
              const completedCyclesForSol = cycles.filter(c => c.solId === sol.id && c.status === 'completed');
              if (completedCyclesForSol.length === 0) {
                return (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 italic">
                    Pa gen okenn sik ki te pase pou Sòl sa a ankò. Sa a se premye sik aktif la.
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedCyclesForSol.map((cycle) => {
                    const finalBen = beneficiaries.find(b => b.solId === sol.id && b.position === solMembers.length);
                    return (
                      <div key={cycle.id} className="p-4 bg-emerald-50/20 border border-emerald-150 rounded-2xl flex justify-between items-center">
                        <div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase">Sik #{cycle.cycleNumber} Konplete</span>
                          <h4 className="text-xs font-black text-slate-900 mt-2 uppercase tracking-wide">Dènye Benefisyè:</h4>
                          <p className="text-xs text-slate-650 font-bold mt-0.5">{finalBen ? finalBen.memberName : 'Tout manm yo'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-black text-slate-400 block">Total Kolekte</span>
                          <p className="text-sm font-mono font-black text-emerald-700 mt-1">
                            {(cycle.totalCollected || (sol.contributionAmount * solMembers.length)).toLocaleString()} HTG
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Fini: {cycle.endDate || 'Jen 2026'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB CONTENT: SETTINGS / BYLAWS */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-[2rem] border border-slate-205 p-6 md:p-8 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-800">Bylaws, Règleman ak Konpòtman Sòl la</h3>
            <p className="text-xs text-slate-400">Règleman sa a te siyen piblikman pa tout manm k ap patisipan yo lè yo te antre nan sèk sa a.</p>
          </div>

          <div className="bg-slate-50 border border-slate-205 p-5 rounded-2xl font-mono text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
            {sol.rules}
          </div>

          <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Maman Sòl (Manadjè)</span>
              <p className="font-bold text-slate-800">Marie Carmel Pierre</p>
              <p className="text-[10px] text-slate-505 font-mono mt-0.5">marie.carmel@solayiti.com &bull; +509 3744-1234</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Lanse nan sistèm nimerik</span>
              <p className="font-bold text-slate-800">{sol.createdAt}</p>
              <p className="text-[10px] text-slate-505 font-mono mt-0.5">Sik #1 deklare aktif</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INVITE MEMBER */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-sm text-left relative animate-in zoom-in-95 duration-150">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-md font-bold text-slate-900 uppercase tracking-wider">{t.inviteMemberBtn}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Voye yon envitasyon pa imèl pou patisipe nan {sol.name}.</p>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">{t.inviteNameLabel}</label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Jean-Robert Vital"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">{t.inviteEmailLabel}</label>
                <input
                  type="email"
                  required
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="jrtech@outlet.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-orange-500 focus:bg-white"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="w-1/2 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-650 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
                >
                  {t.continueBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BULK IMPORT MEMBERS */}
      {showBulkModal && (
        <div id="bulk-import-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-md text-left relative animate-in zoom-in-95 duration-150">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-md font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-5 h-5 text-orange-600" />
                <span>Enpòte Manm an Masa (Bulk Import)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Mete plizyè manm anmenmtan pou asire wotasyon Sòl la pare byen vit.</p>
            </div>

            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  dragOver ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 bg-slate-50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const text = event.target?.result as string;
                      setBulkInputText(text);
                    };
                    reader.readAsText(file);
                  }
                }}
              >
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-700">Trennen dosye CSV la isit la</p>
                <p className="text-[10px] text-slate-400 mt-1">Oswa chwazi yon dosye depi sou aparèy ou an</p>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="bulk-file-input"
                />
                <label
                  htmlFor="bulk-file-input"
                  className="mt-3 inline-block px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 cursor-pointer shadow-xs hover:bg-slate-50"
                >
                  Chwazi Dosye (Select File)
                </label>
              </div>

              {/* Paste Text Zone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kole done manm yo (Fòma: Non, Email):</label>
                <textarea
                  rows={4}
                  value={bulkInputText}
                  onChange={(e) => setBulkInputText(e.target.value)}
                  placeholder="Jean Dupont, jean@example.com&#10;Marie Carmel, marie@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-700 focus:outline-orange-500 focus:bg-white"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[9.5px] text-amber-800 font-bold leading-normal">
                Makè fòma: Mete yon sèl liy pou chak patisipan. Si ou pa mete imèl, sistèm nan ap kreye youn otomatik pou yo.
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkInputText('');
                  }}
                  className="w-1/2 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-650 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkImport(bulkInputText)}
                  className="w-1/2 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
                >
                  Enpòte Kounye a
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM PAY DIALOG */}
      {confirmPaidId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-sm text-left relative">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-md font-bold text-slate-900">{t.paymentConfirmTitle}</h3>
              <p className="text-[11px] text-slate-400 mt-1">{t.paymentConfirmBody}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Metòd Transmisyon</label>
                <div className="grid grid-cols-2 gap-2">
                  {['MonCash', 'Sogebank', 'NatcomPay', 'Cash Direct'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPayMethod(method)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                        payMethod === method
                          ? 'border-emerald-500 bg-emerald-105 text-emerald-800 shadow-sm font-black'
                          : 'border-slate-250 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {method === 'MonCash' ? '💰 MonCash' : method === 'Sogebank' ? '🏦 Sogebank' : method === 'NatcomPay' ? '📲 Natcom' : '💵 Cash'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmPaidId(null)}
                  className="w-1/2 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-650 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPaid}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
                >
                  Komfime Peye
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR & HISTORICAL SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <SolCalendar 
          contributions={solContributions} 
          beneficiaries={solBeneficiaries} 
          currentLanguage={currentLanguage} 
        />
        
        {/* Previous Cycles Section */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-orange-600 animate-spin-slow" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Sik ak Men ki Pase yo ({finishedCycles.length})</h3>
          </div>
          
          {finishedCycles.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Sòl sa a nan premye sik li. Pa gen okenn sik ki fini anvan sa.</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {finishedCycles.map(cy => {
                const cycleContribs = solContributions.filter(c => c.cycleId === cy.id && c.status === 'paid');
                const totalAmount = cycleContribs.reduce((sum, c) => sum + c.amount, 0);
                
                const cycleBen = solBeneficiaries.find(b => b.cycleId === cy.id);
                const benName = cycleBen ? cycleBen.memberName : (currentLanguage === 'creole' ? 'Pa deklare' : 'Non assigné');

                return (
                  <div key={cy.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                    <div>
                      <p className="font-extrabold text-slate-800">Sik #${cy.cycleNumber} - Fini ak siksè</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Dat: {cy.startDate} rive {cy.endDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-black text-slate-850">
                        {totalAmount > 0 ? totalAmount.toLocaleString() : (sol.contributionAmount * solMembers.length).toLocaleString()} HTG Kolekte
                      </p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Benefisyè: {benName}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MEMBER PAYMENT CONSISTENCY BAR CHART (Recharts) */}
      <BentoCard
        id="sol-details-consistency-chart"
        index={5}
        hoverScale={false}
        className="p-6 md:p-8 space-y-6 mt-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
              Konsistans Peman Patisipan yo (Last 6 Months)
            </h3>
            <p className="text-xs text-slate-500">
              Analiz pousantaj peman kotizasyon alè pou chak manm nan gwoup Sòl sa a pou dènye 6 mwa yo.
            </p>
          </div>
          <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-xl text-[10px] font-black border border-orange-100 uppercase tracking-tight shrink-0">
            Endis Fidelyte & Fyabilite
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={memberConsistencyData}
              margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip 
                contentStyle={{ 
                  background: '#0f172a', 
                  border: 'none', 
                  borderRadius: '16px', 
                  color: '#fff', 
                  fontSize: '11px',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                }}
                formatter={(value: any, name: any, props: any) => [
                  `${value}% (${props.payload.Peye} nan ${props.payload.Total} kotizasyon)`,
                  `Konsistans Peman`
                ]}
              />
              <Bar dataKey="Konsistans (%)" radius={[8, 8, 0, 0]} maxBarSize={50}>
                {memberConsistencyData.map((entry, index) => {
                  const val = entry['Konsistans (%)'];
                  const fill = val >= 85 ? '#10b981' : val >= 50 ? '#f59e0b' : '#ef4444';
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-450 font-bold pt-2 border-t border-slate-100 gap-3">
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-md"></span> 85% - 100% (Trè Fidèl)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded-md"></span> 50% - 84% (Mwayen)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-500 rounded-md"></span> Anba 50% (Atansyon Reta)</span>
          </div>
          <span className="text-orange-600 font-extrabold uppercase">Mennen pa Contivo AI Engine</span>
        </div>
      </BentoCard>

      {/* MAMAN SÒL PRIVATE NOTES (Manager only) */}
      {isMamanSol && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-xs mt-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-orange-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Nòt ak Remak Maman Sòl (Privé)</h3>
                <p className="text-[10px] text-slate-400">Espas sa a se pou ou menm sèlman pou jere nòt sou manm oswa evènman yo.</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-slate-900 text-slate-100 text-[8.5px] font-black tracking-widest rounded-full uppercase">GÉRANTE ONLI</span>
          </div>

          {/* BACKGROUND AUTOMATED SCHEDULER STATUS */}
          <div className="p-4 bg-[#FAF9F6] border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                <p className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">Sistèm Rapèl Otomatik (Background Scheduler)</p>
              </div>
              <p className="text-[10px] text-slate-500">
                Sistèm lan ap kouri an sekirite nan background lan chak 30s. L ap voye imel otomatik ak mesaj bay manm yo <strong>presizeman 48 èdtan</strong> anvan dat limit la si kotizasyon yo poko peye.
              </p>
            </div>
            <button
              onClick={handleRunSchedulerSimulation}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] uppercase rounded-xl shadow-xs shrink-0 cursor-pointer transition-colors"
            >
              🚀 Teste Scheduler 48h
            </button>
          </div>

          {/* Note Form */}
          <form onSubmit={handleAddNote} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3 space-y-1 text-xs">
              <label className="font-extrabold text-slate-600 uppercase tracking-wider text-[9px]">Kategori / Pou Kilès</label>
              <select
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-orange-500 font-bold text-slate-700"
              >
                <option value="General">Kès / Jeneral</option>
                {solMembers.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
                <option value="Tiray / Sik">Tiray oswa Sik</option>
              </select>
            </div>
            <div className="md:col-span-7 space-y-1 text-xs">
              <label className="font-extrabold text-slate-600 uppercase tracking-wider text-[9px]">Mesaj / Remak</label>
              <input
                type="text"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Ekri yon nòt rapid isit la... (eg: Dieuseul ap gen ti reta mwa sa a)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-orange-500 text-slate-700 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              className="md:col-span-2 w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Ajoute Nòt
            </button>
          </form>

          {/* Notes List */}
          <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
            {mamanNotes.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-150">Pa gen okenn nòt ki sove ankò.</p>
            ) : (
              mamanNotes.map(n => (
                <div key={n.id} className="flex items-start justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-850 text-[8.5px] font-extrabold rounded-md uppercase tracking-wider">
                        {n.category}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">{n.date}</span>
                    </div>
                    <p className="text-slate-750 font-medium leading-relaxed">{n.content}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(n.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Efase nòt sa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedMemberProfile && (
        <MemberProfileModal
          member={selectedMemberProfile}
          allSols={allSols}
          allContributions={contributions}
          allBeneficiaries={beneficiaries}
          currentLanguage={currentLanguage}
          onClose={() => setSelectedMemberProfile(null)}
          isMamanSol={isMamanSol}
          activeSol={sol}
          onUpdateTier={onUpdateMemberTier}
        />
      )}

    </div>
  );
}

function SolCalendar({ contributions, beneficiaries, currentLanguage }: { contributions: Contribution[], beneficiaries: Beneficiary[], currentLanguage: Language }) {
  // We start the calendar at June 2026 (matching current system date June 23, 2026)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // 0-indexed, so 5 is June

  const monthNames = {
    creole: ['Janvye', 'Fevriye', 'Mas', 'Avril', 'Me', 'Jen', 'Jiyè', 'Out', 'Septanm', 'Oktòb', 'Novanm', 'Desanm'],
    french: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    english: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  };

  const dayNames = {
    creole: ['Dim', 'Len', 'Mad', 'Mèk', 'Jod', 'Vand', 'Sam'],
    french: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    english: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  // Highlight dates
  const eventsByDay: { [day: number]: { type: 'deadline' | 'payout', label: string, name: string }[] } = {};

  // Deadlines from contributions
  contributions.forEach(c => {
    if (!c.dueDate) return;
    const d = new Date(c.dueDate);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push({
        type: 'deadline',
        label: c.status === 'paid' ? 'Limit Peye' : 'Kotizasyon Poko Peye',
        name: `${c.amount.toLocaleString()} HTG`
      });
    }
  });

  // Payouts from beneficiaries
  beneficiaries.forEach(b => {
    if (!b.payoutDate) return;
    const d = new Date(b.payoutDate);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push({
        type: 'payout',
        label: b.status === 'completed' ? 'Touche' : 'Dat Distribisyon',
        name: b.memberName
      });
    }
  });

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Kalandriye Sòl la</h4>
        <div className="flex items-center space-x-2">
          <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-xs font-bold px-2 cursor-pointer border border-slate-200 text-slate-700">&lt;</button>
          <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
            {monthNames[currentLanguage][currentMonth]} {currentYear}
          </span>
          <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-xs font-bold px-2 cursor-pointer border border-slate-200 text-slate-700">&gt;</button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-450 uppercase">
        {dayNames[currentLanguage].map(d => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square bg-slate-50/20 rounded-xl" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const events = eventsByDay[day] || [];
          const hasDeadline = events.some(e => e.type === 'deadline');
          const hasPayout = events.some(e => e.type === 'payout');

          let bgClass = 'bg-slate-50 hover:bg-slate-100 text-slate-700';
          let borderClass = 'border border-slate-100';
          if (hasDeadline && hasPayout) {
            bgClass = 'bg-amber-100 text-amber-950 font-black';
            borderClass = 'border-2 border-amber-400';
          } else if (hasDeadline) {
            bgClass = 'bg-rose-50 text-rose-950 font-black';
            borderClass = 'border border-rose-300';
          } else if (hasPayout) {
            bgClass = 'bg-emerald-50 text-emerald-950 font-black';
            borderClass = 'border border-emerald-300';
          }

          return (
            <div key={`day-${day}`} className={`aspect-square ${bgClass} ${borderClass} rounded-xl p-1 flex flex-col justify-between relative group cursor-pointer`}>
              <span className="text-[11px] font-bold">{day}</span>
              <div className="flex justify-center space-x-0.5">
                {hasDeadline && <span className="w-1 h-1 bg-rose-600 rounded-full" />}
                {hasPayout && <span className="w-1 h-1 bg-emerald-600 rounded-full" />}
              </div>

              {/* Tooltip on hover */}
              {events.length > 0 && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[9px] p-2 rounded-lg shadow-lg z-50 w-36 text-left leading-normal pointer-events-none">
                  {events.map((ev, idx) => (
                    <div key={idx} className="border-b border-slate-700 last:border-0 pb-1 mb-1 last:pb-0 last:mb-0">
                      <span className={`font-black uppercase tracking-wider ${ev.type === 'payout' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {ev.label}:
                      </span>
                      <p className="font-medium text-white">{ev.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
