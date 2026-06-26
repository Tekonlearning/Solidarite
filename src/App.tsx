/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Home, Layers, FileText, Bell, User, PlusCircle, Globe, Sparkles, BookOpen, Clock, Layers2, ShieldCheck, HelpCircle, AlertTriangle } from 'lucide-react';
import { Language, SolGroup, Member, Contribution, Beneficiary, Cycle, SolNotification, UserSession } from './types';
import { initialSols, initialMembers, initialContributions, initialBeneficiaries, initialCycles, initialNotifications, mockUsers } from './mockData';
import Header from './components/Header';
import PublicLanding from './components/PublicLanding';
import Dashboard from './components/Dashboard';
import CreateSol from './components/CreateSol';
import SolDetails from './components/SolDetails';
import Reports from './components/Reports';
import LoginModal from './components/LoginModal';
import { translations } from './translations';

import { useQueryClient } from '@tanstack/react-query';
import { seedInitialData, updateNotification as dbUpdateNotification, createNotification } from './lib/firebase/firestore';
import {
  useSolsQuery,
  useMembersQuery,
  useContributionsQuery,
  useBeneficiariesQuery,
  useCyclesQuery,
  useNotificationsQuery
} from './lib/firebase/queries';
import { useAuth } from './contexts/AuthContext';
import { solService } from './services/sol.service';
import { contributionService } from './services/contribution.service';

export default function App() {
  const { currentUser, switchUser, loading: authLoading, loginWithGoogle, logout, authError, setAuthError } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 1. Language preference
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('sol_lang');
    if (saved) return saved as Language;
    
    // Detect browser locale and default to 'creole' if available (Haitian Creole is 'ht'), otherwise 'french'
    const browserLang = typeof navigator !== 'undefined' ? (navigator.language || '').toLowerCase() : '';
    const hasCreole = browserLang.includes('ht') || browserLang.includes('creole') || browserLang.includes('cr');
    return hasCreole ? 'creole' : 'french';
  });

  // 4. View routing state
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'sol-detail' | 'create-sol' | 'reports' | 'notifications'>('landing');
  const [selectedSolId, setSelectedSolId] = useState<string | null>(null);

  // Guided Walkthrough states
  const [showWalkthrough, setShowWalkthrough] = useState<boolean>(false);
  const [walkthroughStep, setWalkthroughStep] = useState<number>(0);

  // Urgent contribution alert states
  const [hasShownUrgentModal, setHasShownUrgentModal] = useState<boolean>(false);
  const [urgentContribution, setUrgentContribution] = useState<any | null>(null);

  // Auto-trigger walkthrough on initial login if not completed before
  useEffect(() => {
    if (currentUser && !localStorage.getItem('maman_sol_walkthrough_completed')) {
      setShowWalkthrough(true);
      setWalkthroughStep(0);
    }
  }, [currentUser]);

  const handleCompleteWalkthrough = () => {
    localStorage.setItem('maman_sol_walkthrough_completed', 'true');
    setShowWalkthrough(false);
  };

  // Redirect users who log out or don't have active sessions to Public Landing
  useEffect(() => {
    if (!currentUser && currentView !== 'landing') {
      setCurrentView('landing');
      setShowLoginModal(true);
    }
  }, [currentUser, currentView]);

  // 3. React Query integration for Firestore data
  const queryClient = useQueryClient();

  // Seed initial data on mounting if Firestore collections are empty once authenticated
  const [isSeeded, setIsSeeded] = useState(false);
  useEffect(() => {
    if (authLoading || !currentUser || isSeeded) return;

    seedInitialData().then(() => {
      setIsSeeded(true);
      // Invalidate queries to trigger instant hydration
      queryClient.invalidateQueries();
    }).catch((err) => {
      console.error('Failed to seed database during initialized session:', err);
    });
  }, [authLoading, currentUser, isSeeded, queryClient]);

  // Read collections directly from Firestore
  const solsQuery = useSolsQuery();
  const membersQuery = useMembersQuery();
  const contributionsQuery = useContributionsQuery();
  const beneficiariesQuery = useBeneficiariesQuery();
  const cyclesQuery = useCyclesQuery();
  const notificationsQuery = useNotificationsQuery();

  const sols = solsQuery.data || [];
  const members = membersQuery.data || [];
  const contributions = contributionsQuery.data || [];
  const beneficiaries = beneficiariesQuery.data || [];
  const cycles = cyclesQuery.data || [];
  const notifications = notificationsQuery.data || [];

  // Synchronise with LocalStorage on preferences only
  useEffect(() => {
    localStorage.setItem('sol_lang', language);
  }, [language]);

  useEffect(() => {
    if (currentUser && contributions.length > 0 && !hasShownUrgentModal) {
      const pendingUrgent = contributions.find(c => {
        if (c.memberId !== currentUser.id || c.status !== 'pending') return false;
        const dueDateMs = new Date(c.dueDate).getTime();
        const nowMs = Date.now();
        const diffMs = dueDateMs - nowMs;
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours > -12 && diffHours <= 24;
      });
      if (pendingUrgent) {
        setUrgentContribution(pendingUrgent);
        setHasShownUrgentModal(true);
      }
    }
  }, [currentUser, contributions, hasShownUrgentModal]);

  // BACKGROUND AUTOMATED SCHEDULER: Auto-remind members 48 hours before deadline
  useEffect(() => {
    if (authLoading || !currentUser || sols.length === 0 || contributions.length === 0) return;

    const runBackgroundScheduler = async () => {
      try {
        const sentList = JSON.parse(localStorage.getItem('sent_scheduled_reminders') || '[]');
        let updated = false;

        for (const c of contributions) {
          if (c.status === 'paid') continue;
          if (sentList.includes(c.id)) continue;

          // Check if due date is within the next 48 hours
          const dueDateMs = new Date(c.dueDate).getTime();
          const nowMs = Date.now();
          const diffMs = dueDateMs - nowMs;
          const diffHours = diffMs / (1000 * 60 * 60);

          // If the due date is within 48 hours
          if (diffHours > 0 && diffHours <= 48) {
            const sol = sols.find(s => s.id === c.solId);
            const member = members.find(m => m.id === c.memberId);
            if (!sol || !member) continue;

            const solName = sol.name;
            const memberName = member.name;

            // Create automatic notification/email simulation
            const notifObj = {
              id: `auto-remind-${c.id}-${Date.now()}`,
              solId: c.solId,
              category: 'contribution_due' as const,
              title: language === 'creole' 
                ? `⚡ [RAPÈL AUTOMATIK] Kotizasyon pou ${solName}` 
                : `⚡ [RAPPEL AUTOMATIQUE] Cotisation pour ${solName}`,
              message: language === 'creole'
                ? `Remak: Sistèm Contivo AI voye yon email otomatik bay ${memberName} kòm rapèl (Rete mwens pase 48èdtan anvan limit la: ${c.dueDate}).`
                : `Remarque : Le système Contivo AI a envoyé un email automatique à ${memberName} en guise de rappel (Moins de 48h restantes avant la date limite : ${c.dueDate}).`,
              date: new Date().toISOString(),
              read: false
            };

            await createNotification(notifObj);
            sentList.push(c.id);
            updated = true;
          }
        }

        if (updated) {
          localStorage.setItem('sent_scheduled_reminders', JSON.stringify(sentList));
          queryClient.invalidateQueries();
        }
      } catch (err) {
        console.error('Error in Background Scheduler:', err);
      }
    };

    // Run immediately and then every 30 seconds
    runBackgroundScheduler();
    const interval = setInterval(runBackgroundScheduler, 30000);
    return () => clearInterval(interval);
  }, [authLoading, currentUser, sols, contributions, members, language, queryClient]);


  // HELPER ACTIONS & MUTATORS
  
  // A. Mark Contribution as paid (either by the member or the manager)
  const handleMarkPaid = async (contribId: string, method?: string) => {
    const chosenMethod = method || 'MonCash';
    try {
      await contributionService.markPaid(contribId, chosenMethod, language);
      queryClient.invalidateQueries();
    } catch (err) {
      console.error('Error in handleMarkPaid:', err);
    }
  };

  // B. Simulate immediate member contribution from dashboard
  const handleMemberQuickPay = async (contribId: string) => {
    try {
      await contributionService.quickPay(contribId, language);
      queryClient.invalidateQueries();
      alert(language === 'creole' 
        ? 'Vèsman MonCash ou a voye bay Maman Sòl pou verifikasyon!' 
        : 'Virement de cotisation envoyé avec succès via simulation MonCash!'
      );
    } catch (err) {
      console.error('Error in handleMemberQuickPay:', err);
    }
  };

  // C. Create a brand new Sòl group & its initial rotation schedule
  const handleCreateSol = async (
    newSolData: Omit<SolGroup, 'id' | 'currentCycleId' | 'cycleNumber' | 'createdAt'>,
    invitedEmails: string[]
  ) => {
    if (!currentUser) return;
    try {
      const newSolId = await solService.createSol(newSolData, invitedEmails, currentUser, language);
      queryClient.invalidateQueries();

      // Switch view to details of new Sòl immediately!
      setSelectedSolId(newSolId);
      setCurrentView('sol-detail');
    } catch (err) {
      console.error('Error in handleCreateSol:', err);
    }
  };

  // D. Admin Maman Sòl: rotate hand (close current period, disburse payout, mobilize next beneficiary in sequence!)
  const handleCompleteSolHand = async (solId: string) => {
    try {
      const result = await solService.rotateHand(solId, language);
      queryClient.invalidateQueries();
      
      // Quick success toast simulation
      alert(language === 'creole' 
        ? `Konfime! Lajan men te delivre bay ${result.activeBenName}.`
        : `Succès! La main de ${result.activeBenName} est clôturée.`
      );
    } catch (err) {
      console.error('Error in handleCompleteSolHand:', err);
    }
  };

  // E. Invite member callback
  const handleInviteNewMember = async (solId: string, name: string, email: string) => {
    try {
      const position = await solService.inviteMember(solId, name, email, language);
      queryClient.invalidateQueries();

      alert(language === 'creole'
        ? `Nouvo manm ${name} te rantre nan lis la! Pozisyon tiray li se #${position}.`
        : `Nouveau membre ${name} ajouté avec succès au tour de rôle !`
      );
    } catch (err) {
      console.error('Error in handleInviteNewMember:', err);
    }
  };

  // F. Send reminders to unpaid members
  const handleSendReminders = async (solId: string, unpaidMemberIds: string[]) => {
    try {
      const sol = sols.find(s => s.id === solId);
      if (!sol) return;

      const activeCycle = cycles.find(cy => cy.solId === solId && cy.status === 'active');
      if (!activeCycle) return;

      for (const mId of unpaidMemberIds) {
        const member = members.find(m => m.id === mId);
        if (!member) continue;

        const notifId = `remind-${solId}-${mId}-${Date.now()}`;
        const notifObj = {
          id: notifId,
          solId,
          category: 'contribution_due' as const,
          title: language === 'creole' 
            ? `Rapèl Kotizasyon pou ${sol.name}` 
            : `Rappel de Cotisation pour ${sol.name}`,
          message: language === 'creole'
            ? `Maman Sòl Marie Carmel Pierre ap mande w pou peye kotizasyon w lan pou sik sa a.`
            : `La gérante vous rappelle d'effectuer votre cotisation pour ce cycle.`,
          date: new Date().toISOString(),
          read: false
        };

        await createNotification(notifObj);
      }

      alert(language === 'creole'
        ? `Siksè! Yo voye rapèl (Notifikasyon, SMS, Email) bay ${unpaidMemberIds.length} manm ki poko peye.`
        : `Succès ! Rappels de paiement (Notifications, SMS, Email) envoyés à ${unpaidMemberIds.length} membres.`
      );

      queryClient.invalidateQueries();
    } catch (err) {
      console.error('Error in handleSendReminders:', err);
    }
  };

  const handleUpdateMemberTier = async (memberId: string, tierAmount: number, goalAmount?: number) => {
    if (!selectedSolId) return;
    try {
      await solService.updateMemberTier(selectedSolId, memberId, tierAmount, goalAmount);
      queryClient.invalidateQueries();
    } catch (err) {
      console.error('Error updating member tier:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await dbUpdateNotification(n.id, { read: true });
    }
    queryClient.invalidateQueries();
  };

  const getUnreadNotifs = () => notifications.filter(n => !n.read).length;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FBF9F7] flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-black text-slate-800 tracking-tight uppercase text-[10px] tracking-widest text-center px-4">
          Na Syonnal Sòl k ap chaje...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* 1. APP HEADER */}
      <Header
        currentLanguage={language}
        onLanguageChange={setLanguage}
        currentUser={currentUser}
        onUserChange={async (user) => {
          await switchUser(user.id);
          const msg = language === 'creole' 
            ? `Ou konekte kounye a kòm ${user.name} (${user.role === 'maman_sol' ? 'Maman Sòl' : 'Manm'})`
            : `Connecté en tant que ${user.name} (${user.role === 'maman_sol' ? 'Gérante' : 'Membre'})`;
          alert(msg);
        }}
        unreadNotificationsCount={getUnreadNotifs()}
        onViewNotifications={async () => {
          await handleMarkAllNotificationsRead();
          setCurrentView('notifications');
        }}
        onLogout={async () => {
          await logout();
          setCurrentView('landing');
        }}
        onLoginClick={() => {
          setShowLoginModal(true);
        }}
      />

      {/* 2. MAIN HUB SCREEN */}
      <main className="flex-1 pb-20 md:pb-8">
        
        {currentView === 'landing' && (
          <PublicLanding
            currentLanguage={language}
            onGetStarted={() => {
              if (currentUser) {
                setCurrentView('dashboard');
              } else {
                setShowLoginModal(true);
              }
            }}
            sols={sols}
            members={members}
            beneficiaries={beneficiaries}
            cycles={cycles}
          />
        )}

        {currentView === 'dashboard' && (
          <Dashboard
            currentLanguage={language}
            sols={sols}
            members={members}
            contributions={contributions}
            beneficiaries={beneficiaries}
            currentUser={currentUser}
            notifications={notifications}
            cycles={cycles}
            onCreateSolClick={() => setCurrentView('create-sol')}
            onSelectSol={(solId) => {
              setSelectedSolId(solId);
              setCurrentView('sol-detail');
            }}
            onPayContribution={handleMemberQuickPay}
          />
        )}

        {currentView === 'sol-detail' && selectedSolId && (
          (() => {
            const sol = sols.find(s => s.id === selectedSolId);
            if (!sol) return <div className="p-8 text-center text-xs">Sòl detaye nèt pa jwenn.</div>;
            return (
              <SolDetails
                currentLanguage={language}
                sol={sol}
                allSols={sols}
                members={members}
                contributions={contributions}
                beneficiaries={beneficiaries}
                cycles={cycles}
                currentUser={currentUser}
                onBack={() => setCurrentView('dashboard')}
                onMarkPaid={handleMarkPaid}
                onCompleteCycleHand={handleCompleteSolHand}
                onInviteMember={handleInviteNewMember}
                onSendReminders={handleSendReminders}
                onUpdateMemberTier={handleUpdateMemberTier}
              />
            );
          })()
        )}

        {currentView === 'create-sol' && (
          <CreateSol
            currentLanguage={language}
            onBack={() => setCurrentView('dashboard')}
            onSave={(newSol, invited) => {
              handleCreateSol(newSol, invited);
              alert(language === 'creole' ? 'Nouvo Sòl bati ak siksè!' : 'SOL groupe créé !');
            }}
            currentUser={currentUser}
          />
        )}

        {currentView === 'reports' && (
          <Reports
            currentLanguage={language}
            sols={sols}
            members={members}
            contributions={contributions}
            beneficiaries={beneficiaries}
            cycles={cycles}
          />
        )}

        {currentView === 'notifications' && (
          <div className="max-w-xl mx-auto px-4 py-8 text-left space-y-6">
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900">
                  {language === 'creole' ? 'Tout Notifikasyon' : 'Toutes les Notifications'}
                </h1>
                <p className="text-xs text-slate-500">Mizajou operasyonèl ak wotasyon Sòl</p>
              </div>
              <button
                onClick={handleMarkAllNotificationsRead}
                className="text-xs text-amber-600 font-bold hover:underline"
              >
                {translations[language].markAllRead}
              </button>
            </div>

            <div className="space-y-3 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              {notifications.length === 0 ? (
                <p className="text-center italic text-xs text-slate-400 py-6">
                  {translations[language].emptyNotifications}
                </p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">{n.title}</span>
                      <span className="text-[9px] font-mono text-slate-400">{n.date}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      {/* 3. MOBILE NAVIGATION FOOTER */}
      <nav id="mobile-bottom-nav" className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 px-4 py-2.5 flex items-center justify-between shadow-2xl md:hidden">
        
        {/* Landing/Home logo */}
        <button
          onClick={() => setCurrentView('landing')}
          className={`flex flex-col items-center space-y-1 flex-1 text-center font-medium ${
            currentView === 'landing' ? 'text-amber-500' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Globe className="w-5 h-5" />
          <span className="text-[9.5px] uppercase font-bold tracking-tight">SOL Info</span>
        </button>

        {/* Dashboard widget */}
        <button
          onClick={() => {
            if (currentUser) {
              setCurrentView('dashboard');
            } else {
              setShowLoginModal(true);
            }
          }}
          className={`flex flex-col items-center space-y-1 flex-1 text-center font-medium ${
            currentView === 'dashboard' || currentView === 'sol-detail' || currentView === 'create-sol'
              ? 'text-amber-500'
              : 'text-slate-400 hover:text-slate-755'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9.5px] uppercase font-bold tracking-tight">{translations[language].home}</span>
        </button>

        {/* Reports module */}
        <button
          onClick={() => {
            if (currentUser) {
              setCurrentView('reports');
            } else {
              setShowLoginModal(true);
            }
          }}
          className={`flex flex-col items-center space-y-1 flex-1 text-center font-medium ${
            currentView === 'reports' ? 'text-amber-500' : 'text-slate-400 hover:text-slate-705'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[9.5px] uppercase font-bold tracking-tight">{translations[language].reports}</span>
        </button>

        {/* Notifications list */}
        <button
          onClick={() => {
            if (currentUser) {
              setCurrentView('notifications');
            } else {
              setShowLoginModal(true);
            }
          }}
          className={`flex flex-col items-center space-y-1 flex-1 text-center font-medium ${
            currentView === 'notifications' ? 'text-amber-500' : 'text-slate-400 hover:text-slate-705'
          }`}
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {getUnreadNotifs() > 0 && (
              <span className="absolute -top-1 -right-1.5 w-3 h-3 bg-semibold bg-amber-500 text-white rounded-full text-[7.5px] flex items-center justify-center font-black animate-pulse">
                {getUnreadNotifs()}
              </span>
            )}
          </div>
          <span className="text-[9.5px] uppercase font-bold tracking-tight">Reminders</span>
        </button>

      </nav>

      {/* 4. DESKTOP OPTIONAL SIDE RAIL */}
      <div id="desktop-nav-assistant" className="fixed top-24 left-6 z-30 hidden xl:flex flex-col p-4 bg-white border border-slate-100 rounded-3xl shadow-lg w-52 text-xs space-y-3">
        <div className="flex items-center space-x-2 text-amber-600 font-bold border-b pb-2">
          <Sparkles className="w-4 h-4 animate-bounce" />
          <span>Sòl Mèt</span>
        </div>
        
        <button
          onClick={() => setCurrentView('landing')}
          className={`w-full text-left p-2.5 rounded-xl font-bold transition-all flex items-center space-x-2.5 ${
            currentView === 'landing' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Globe className="w-4 h-4 shrink-0" />
          <span>Kijan l mache?</span>
        </button>

        <button
          onClick={() => {
            if (currentUser) {
              setCurrentView('dashboard');
            } else {
              setShowLoginModal(true);
            }
          }}
          className={`w-full text-left p-2.5 rounded-xl font-bold transition-all flex items-center space-x-2.5 ${
            currentView === 'dashboard' || currentView === 'sol-detail' || currentView === 'create-sol'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Home className="w-4 h-4 shrink-0" />
          <span>Mwen & Sòl mwen yo</span>
        </button>

        <button
          onClick={() => {
            if (currentUser) {
              setCurrentView('reports');
            } else {
              setShowLoginModal(true);
            }
          }}
          className={`w-full text-left p-2.5 rounded-xl font-bold transition-all flex items-center space-x-2.5 ${
            currentView === 'reports' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Liv kontab & Rapò</span>
        </button>

        <button
          onClick={() => {
            if (currentUser) {
              setCurrentView('notifications');
            } else {
              setShowLoginModal(true);
            }
          }}
          className={`w-full text-left p-2.5 rounded-xl font-bold transition-all flex items-center space-x-2.5 ${
            currentView === 'notifications' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Bell className="w-4 h-4 shrink-0" />
          <span>Siy ak Rapèl yo</span>
        </button>

        <div className="border-t pt-3 space-y-1 text-[10px] text-slate-400">
          <p>Maman Sòl: <b className="text-slate-700">{currentUser ? currentUser.name.split(' ')[0] : 'Marie Carmel'}</b></p>
          <p>Dachbòd sekirize</p>
        </div>
      </div>

      {/* 5. GORGEOUS CONNECTION / AUTHENTICATION MODAL */}
      {showLoginModal && (
        <LoginModal
          language={language}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false);
            setCurrentView('dashboard');
          }}
        />
      )}

      {/* FLOATING WALKTHROUGH TRIGGERS (Only when logged in) */}
      {currentUser && (
        <button
          id="walkthrough-fab"
          onClick={() => {
            setWalkthroughStep(0);
            setShowWalkthrough(true);
          }}
          className="no-print fixed bottom-6 right-6 z-40 bg-slate-900 hover:bg-orange-600 text-white font-black text-[10px] tracking-wider uppercase py-3 px-4 rounded-2xl shadow-xl border border-slate-750 flex items-center space-x-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-orange-400 animate-pulse" />
          <span>Gid premye pa yo</span>
        </button>
      )}

      {/* INTERACTIVE 'FIRST STEPS' WALKTHROUGH OVERLAY */}
      {showWalkthrough && currentUser && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-[2.5rem] shadow-2xl overflow-hidden font-sans border-2 border-orange-500 animate-in zoom-in-95 duration-200">
            {/* Top color ribbon */}
            <div className="h-2.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
            
            <div className="p-8 md:p-10 space-y-6 text-left text-slate-800">
              
              {/* Step indicator */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-605">
                  Gid Premye Pa yo (Step {walkthroughStep + 1} / 5)
                </span>
                <button 
                  onClick={handleCompleteWalkthrough}
                  className="text-slate-400 hover:text-slate-700 text-xs font-bold uppercase transition-colors"
                >
                  Sote (Skip)
                </button>
              </div>

              {/* Step content */}
              {walkthroughStep === 0 && (
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center border border-orange-100 shadow-sm">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">Byenveni nan Maman Sòl, {currentUser.name.split(' ')[0]}!</h2>
                  <p className="text-xs text-slate-550 leading-relaxed">
                    Sistèm operasyonèl sa a fèt pou ede w jere koperativ Sòl mikwo-finans yo ak sekirite total. Ann pase 4 etap kle pou w konprann ki jan pou w kòmanse premye sik ou an fasil.
                  </p>
                </div>
              )}

              {walkthroughStep === 1 && (
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100 shadow-sm">
                    <PlusCircle className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">Etap 1: Kreye premye sèk la</h2>
                  <p className="text-xs text-slate-550 leading-relaxed">
                    Klike sou kat tiray dotted <strong>"+ Kreye Sòl"</strong> sou dacha a. Sa ap pèmèt ou defini limit manm yo, kantite kontribisyon yo, frekans lan (chak mwa oswa chak senmenn), ak metòd tiray la.
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                    <span>Kat la sitiye nan bwat bento a anba "Tout Sòl mwen yo"</span>
                  </div>
                </div>
              )}

              {walkthroughStep === 2 && (
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm">
                    <User className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">Etap 2: Envite manm yo</h2>
                  <p className="text-xs text-slate-550 leading-relaxed">
                    Lè w antre nan detay yon Sòl, ou ka anrejistre manm yo, ba yo yon nimewo telefòn ak yon imèl. Sistèm nan ap plase yo otomatikman nan yon pozisyon pou tiray la, epi l ap ba yo pwen fidelite pou jan yo peye alè.
                  </p>
                </div>
              )}

              {walkthroughStep === 3 && (
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm">
                    <Layers2 className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">Etap 3: Objektif Finansye yo</h2>
                  <p className="text-xs text-slate-550 leading-relaxed">
                    Bati objektif finansye gwoup la (tankou lekòl timoun yo, agrikilti, oswa rezèv dijans). Sa ap pouse tout manm yo ekonomize ansanm nan Sòl la pou rezoud gwo bezwen kominotè.
                  </p>
                </div>
              )}

              {walkthroughStep === 4 && (
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-rose-100 shadow-sm animate-bounce">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">Etap 4: Monitor Sante "Sòl Health"</h2>
                  <p className="text-xs text-slate-550 leading-relaxed">
                    Gid otomatik gauge <strong>Sòl Health</strong> sou Dashboard la ap evalye konsistans kotizasyon yo, vitès peman yo, ak pousantaj sik konplete yo. Sa garanti sèk la rete an bòn sante san okenn defo!
                  </p>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => walkthroughStep > 0 && setWalkthroughStep(walkthroughStep - 1)}
                  disabled={walkthroughStep === 0}
                  className={`text-xs font-bold uppercase py-2 px-4 rounded-xl transition-all ${walkthroughStep === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Tounen (Back)
                </button>
                
                <div className="flex space-x-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div 
                      key={`dot-${i}`} 
                      className={`w-2 h-2 rounded-full transition-all ${i === walkthroughStep ? 'bg-orange-600 w-4' : 'bg-slate-200'}`}
                    />
                  ))}
                </div>

                {walkthroughStep < 4 ? (
                  <button
                    onClick={() => setWalkthroughStep(walkthroughStep + 1)}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase py-2.5 px-5 rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    Kontinye (Next)
                  </button>
                ) : (
                  <button
                    onClick={handleCompleteWalkthrough}
                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-black uppercase py-2.5 px-6 rounded-xl shadow-lg transition-all animate-pulse cursor-pointer"
                  >
                    Kòmanse Kounye a!
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* URGENT CONTRIBUTION MODAL ALERT (DUE WITHIN 24 HOURS) */}
      {urgentContribution && (
        <div id="urgent-contribution-modal" className="fixed inset-0 z-[11000] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-[2rem] shadow-2xl overflow-hidden font-sans border-4 border-rose-600 animate-in zoom-in-95 duration-200">
            {/* Urgent top banner */}
            <div className="bg-rose-600 text-white px-6 py-4 flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 animate-bounce shrink-0" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider">Avètisman Kotizasyon Ijant!</h3>
                <p className="text-[10px] text-rose-100">Ou gen mwens pase 24 èdtan pou w peye</p>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-5 text-left text-slate-800">
              <p className="text-xs text-slate-600 leading-relaxed">
                Sistèm nan detekte ou gen yon kontribisyon ki poko peye pou sèk Sòl <strong>{sols.find(s => s.id === urgentContribution.solId)?.name || 'Sòl'}</strong> k ap rive nan limit li trè byento.
              </p>

              {/* Due Date & Amount Info */}
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase text-rose-800 tracking-wider">Kantite pou Peye</span>
                  <p className="text-xl font-mono font-black text-rose-700 mt-0.5">{urgentContribution.amount.toLocaleString()} HTG</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase text-rose-800 tracking-wider">Dat Limit (Due Date)</span>
                  <p className="text-xs font-mono font-bold text-slate-700 mt-1">{urgentContribution.dueDate}</p>
                </div>
              </div>

              <div className="text-[10px] text-slate-450 leading-normal bg-slate-50 border border-slate-100 p-3 rounded-xl">
                Lè w klike sou bouton peman an, sistèm nan ap trete kontribisyon w lan imedyatman pou evite penalite reta 10%.
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setUrgentContribution(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-xl transition-colors cursor-pointer text-center font-bold"
                >
                  Fèmen (Close)
                </button>
                <button
                  onClick={async () => {
                    await handleMemberQuickPay(urgentContribution.id);
                    setUrgentContribution(null);
                    alert(language === 'creole' ? 'Peman an fèt avèk siksè!' : 'Paiement effectué avec succès !');
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase rounded-xl shadow-md transition-colors cursor-pointer text-center flex items-center justify-center space-x-1 font-bold"
                >
                  <span>Peye Kounye a</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
