import React, { useState } from 'react';
import { Play, Award, Shield, Users, HelpCircle, ArrowRight, Heart, MessageSquare, Check, DollarSign } from 'lucide-react';
import { Language, SolGroup, Member, Beneficiary, Cycle, Frequency } from '../types';
import { translations } from '../translations';

interface PublicLandingProps {
  currentLanguage: Language;
  onGetStarted: () => void;
  sols?: SolGroup[];
  members?: Member[];
  beneficiaries?: Beneficiary[];
  cycles?: Cycle[];
}

export default function PublicLanding({ 
  currentLanguage, 
  onGetStarted,
  sols = [],
  members = [],
  beneficiaries = [],
  cycles = []
}: PublicLandingProps) {
  const t = translations[currentLanguage];

  // Interactive Sòl Simulator state
  const [calcAmt, setCalcAmt] = useState<number>(2500);
  const [calcMembers, setCalcMembers] = useState<number>(6);
  const [calcFreq, setCalcFreq] = useState<Frequency>('weekly');

  // Find first active Sòl group to showcase real rotation data on the Hero card
  const demoSol = sols.length > 0 ? sols[0] : null;
  const demoBeneficiaries = demoSol
    ? beneficiaries.filter(b => b.solId === demoSol.id).sort((a, b) => a.position - b.position)
    : [];
  const showRealDemoCard = demoSol && demoBeneficiaries.length > 0;

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // FAQ keys
  const faqs = [
    {
      q: currentLanguage === 'creole' ? "Kisa yon Sòl ye e kijan plas sa ede m?" : currentLanguage === 'french' ? "Qu'est-ce qu'un SOL et comment cela m'aide-t-il ?" : "What is a SOL and how does it help me?",
      a: currentLanguage === 'creole' ? "Sòl se yon fòm epany tradisyonèl kote yon gwoup moun mete ansanm pou yo bay yon kantite lajan regilyèman, epi chak moun touche tout kòb la nan tou pa yo. Platfòm nou an asire sekirite, kalkil fasil e otomatik, ak transparans nèt." : currentLanguage === 'french' ? "Le SOL est une forme d'épargne rotative traditionnelle où un groupe cotise régulièrement pour qu'à tour de rôle, chaque membre récupère le pot total. Notre plateforme garantit la transparence, la sécurité et des calculs équitables." : "A SOL is a traditional rotating savings circle where a group contributes regularly and each person receives the entire pool in turn. Our platform ensures security, fair automatic draws, and full transparency."
    },
    {
      q: currentLanguage === 'creole' ? "Kiyès ki deziyen kòm 'Maman Sòl'?" : currentLanguage === 'french' ? "Qui est désigné comme 'Maman Sòl' ?" : "Who is designated as 'Maman Sòl'?",
      a: currentLanguage === 'creole' ? "Maman Sòl se kreyatè oswa manadjè gwoup la. Se li ki responsab pou envite lòt manm yo, verifye si yo peye kotizasyon an regilyèman, epi deklare kilè men an distribiye bay moun ki dwe touche a." : currentLanguage === 'french' ? "La Maman Sòl est la créatrice ou la gérante du groupe. Elle est responsable d'inviter les membres, de valider les encaissements et de confirmer la remise des fonds à chaque bénéficiaire." : "Maman Sòl is the group creator/manager. She is responsible for inviting members, verifying contributions, and confirming payouts."
    },
    {
      q: currentLanguage === 'creole' ? "Kijan nou fè tiray lòd touche a?" : currentLanguage === 'french' ? "Comment l'ordre de tirage est-il déterminé ?" : "How is the rotation drawing order decided?",
      a: currentLanguage === 'creole' ? "Lè w ap kreye Sòl la, ou kapab deziyen si w vle yon tiray otomatik (oaza), premye vini premye sèvi, oswa si Maman Sòl la ap plasman lòd la manyèlman daprè bezwen chak moun nan gwoup la." : currentLanguage === 'french' ? "Lors de la création du SOL, vous pouvez opter pour un tirage au sort automatique, un ordre d'inscription, ou une attribution manuelle par la Maman Sòl selon les besoins d'urgence de chacun." : "When creating the SOL, you can choose randomized auto-draw, first-come-first-served, or manual allocation by Maman Sòl based on members' financial needs."
    },
    {
      q: currentLanguage === 'creole' ? "Èske gen tranzaksyon lajan dirèk sou platfòm nan?" : currentLanguage === 'french' ? "Y a-t-il des transactions financières directes sur la plateforme ?" : "Are there direct money transactions on the platform?",
      a: currentLanguage === 'creole' ? "Platfòm sa a la kòm zouti jesyon ak konfyans pou MVP a. Peman yo kapab fèt pa MonCash, Sogebank, oswa kach an dirèk. Maman Sòl la dwe make yo kòm 'Peye' apre li resevwa kòb la pou asire liv kontab nimerik la toujou kòrèk." : currentLanguage === 'french' ? "Cette application sert de registre comptable de confiance. Les cotisations sont envoyées par les membres via MonCash, Sogebank ou espèces, puis la gérante valide la réception pour tenir le registre à jour." : "In this MVP version, the app acts as a secure, trusted shared ledger. Members make transfers via MonCash, local bank transfers, or cash, and Maman Sòl records them as 'Paid' to keep the shared ledger accurate."
    }
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMsg) return;
    setContactSent(true);
    setTimeout(() => {
      setContactSent(false);
      setContactName('');
      setContactEmail('');
      setContactMsg('');
    }, 4000);
  };

  const getMultiplier = () => {
    return calcAmt * calcMembers;
  };

  const getFreqName = () => {
    if (calcFreq === 'daily') return currentLanguage === 'creole' ? 'jou' : currentLanguage === 'french' ? 'jour' : 'day';
    if (calcFreq === 'weekly') return currentLanguage === 'creole' ? 'semèn' : currentLanguage === 'french' ? 'semaine' : 'week';
    if (calcFreq === 'biweekly') return currentLanguage === 'creole' ? 'kenz jou' : currentLanguage === 'french' ? 'deux semaines' : 'two weeks';
    return currentLanguage === 'creole' ? 'mwa' : currentLanguage === 'french' ? 'mois' : 'month';
  };

  return (
    <div id="public-landing" className="bg-slate-50 min-h-screen">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28 bg-gradient-to-b from-white to-slate-50">
        <div id="hero-pattern" className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Haitian Proverb Badge */}
            <div className="inline-flex items-center space-x-2 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full text-amber-800 text-xs font-bold shadow-sm">
              <Heart className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>&ldquo;Men anpil, chay pa lou&rdquo; &ndash; Solidarite Ayisyen</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-slate-900 leading-tight">
              {t.heroTitle}
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              {t.heroDesc}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                id="hero-get-started-btn"
                onClick={onGetStarted}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center space-x-3 transition-transform hover:-translate-y-0.5"
              >
                <span>{t.getStarted}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#simulator-section"
                className="bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 font-semibold px-6 py-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-center space-x-2 transition-colors"
              >
                <Play className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Teste Kalkilatris la</span>
              </a>
            </div>

            {/* Micro Stats trust factors in Haiti */}
            <div className="pt-6 border-t border-slate-100 flex items-center space-x-8">
              <div>
                <span className="block text-2xl font-extrabold text-slate-800">100%</span>
                <span className="text-xs text-slate-400">Transparan</span>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div>
                <span className="block text-2xl font-extrabold text-slate-800">Kreyòl</span>
                <span className="text-xs text-slate-400">Pwofesyonèl</span>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div>
                <span className="block text-2xl font-extrabold text-slate-800">MonCash</span>
                <span className="text-xs text-slate-400">Konpatib</span>
              </div>
            </div>

          </div>

          {/* Right Side Visual Banner */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-[360px] md:max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 relative">
              
              {/* Sòl representation */}
              <div className="border-b border-slate-100 pb-4 mb-4">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Wotasyon Sòl</span>
                <h3 className="text-md font-bold text-slate-800">
                  {showRealDemoCard ? demoSol.name : 'Sòl Zanmi Delmas 32'}
                </h3>
              </div>

              <div className="space-y-3">
                {showRealDemoCard ? (
                  demoBeneficiaries.slice(0, 3).map((ben, idx) => {
                    const isCompleted = ben.status === 'completed';
                    const isActive = ben.status === 'current';
                    const isUpcoming = ben.status === 'upcoming' || (!isCompleted && !isActive);
                    
                    const bgClass = isCompleted 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                      : isActive
                      ? 'bg-slate-50 text-slate-800 border border-slate-200/50'
                      : 'bg-amber-50/60 border border-amber-100 text-slate-800';

                    const initial = ben.memberName ? ben.memberName.charAt(0).toUpperCase() : 'M';
                    const avatarColor = isCompleted ? 'bg-emerald-500' : isActive ? 'bg-slate-800' : 'bg-amber-500';

                    const badgeText = isCompleted
                      ? (currentLanguage === 'creole' ? 'Touche deja' : 'Payé')
                      : isActive
                      ? (currentLanguage === 'creole' ? 'Aktif kounye a' : 'Main active')
                      : (currentLanguage === 'creole' ? 'Pwochen an liy' : 'Prochain en ligne');

                    return (
                      <div key={ben.id || idx} className={`flex items-center justify-between p-3 rounded-2xl ${bgClass}`}>
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full ${avatarColor} text-white flex items-center justify-center font-bold text-xs`}>
                            {initial}
                          </div>
                          <div>
                            <p className="text-xs font-bold">{ben.memberName}</p>
                            <p className="text-[10px] opacity-85">{badgeText} (Men #{ben.position})</p>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-slate-700">
                          {isCompleted ? `+${ben.payoutAmount.toLocaleString()} HTG` : isActive ? 'Maman Sòl' : 'Liy cho'}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <>
                    {/* Simulated Hand items */}
                    <div className="flex items-center justify-between p-3 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">F</div>
                        <div>
                          <p className="text-xs font-bold">Fabienne Chery</p>
                          <p className="text-[10px] text-emerald-600">Touche men #1</p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold">+15,000 HTG</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 text-slate-800 rounded-2xl border border-slate-200/50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">M</div>
                        <div>
                          <p className="text-xs font-bold">Marie Carmel Pierre</p>
                          <p className="text-[10px] text-slate-500">Men ki aktif kounye a</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-500">Maman Sòl</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-amber-50/60 border border-amber-100 rounded-2xl text-slate-800">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">J</div>
                        <div>
                          <p className="text-xs font-bold">Jean-Claude Baptiste</p>
                          <p className="text-[10px] text-amber-700 font-medium">Pwochen an liy (Men #3)</p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-amber-600 animate-pulse">Liy cho</span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">
                  {showRealDemoCard 
                    ? `Chak ${demoSol.frequency === 'daily' ? 'jou' : demoSol.frequency === 'weekly' ? 'semèn' : demoSol.frequency === 'monthly' ? 'mwa' : 'kenz jou'}: ` 
                    : 'Chak semèn: '
                  }
                  <b>{showRealDemoCard ? `${demoSol.contributionAmount.toLocaleString()} HTG` : '2,500 HTG'}</b>
                </span>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  {showRealDemoCard ? `Kès: ${demoSol.totalPot.toLocaleString()} HTG` : 'Kès: 15,000 HTG'}
                </span>
              </div>

            </div>

            {/* Absolute Badge */}
            <div className="absolute -bottom-6 -left-6 bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800 hidden sm:block max-w-[200px]">
              <p className="text-xs text-extrabold text-amber-400">100% Solidarite</p>
              <p className="text-[10px] text-slate-300 mt-1">Pa gen papye ki pou pèdi, toupatou ak sekirite.</p>
            </div>

          </div>

        </div>
      </section>

      {/* THREE VALUE PROPS */}
      <section className="py-16 bg-white border-t border-b border-slate-100 text-center">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-sans font-black tracking-tight text-slate-900 mb-2">
            {t.featuresTitle}
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto text-sm mb-12">
            Metòd tradisyonèl ranfòse ak zouti nimerik pou asire jistis ak ranfòsman konfyans.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-left space-y-4">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{t.feature1Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t.feature1Desc}</p>
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-left space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{t.feature2Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t.feature2Desc}</p>
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-left space-y-4">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{t.feature3Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t.feature3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full">{t.howItWorks}</span>
            <h2 className="text-3xl font-sans font-black tracking-tight text-slate-900 mt-3">Èske w pare pou w lanse pwòp Sòl pa w?</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative">
            
            {/* Step 1 */}
            <div className="text-center md:text-left space-y-4">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-full font-bold text-lg flex items-center justify-center mx-auto md:mx-0 shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-slate-800">{t.how1}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t.how1Desc}
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center md:text-left space-y-4">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-full font-bold text-lg flex items-center justify-center mx-auto md:mx-0 shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-slate-800">{t.how2}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t.how2Desc}
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center md:text-left space-y-4">
              <div className="w-12 h-12 bg-amber-500 text-white rounded-full font-bold text-lg flex items-center justify-center mx-auto md:mx-0 shadow-lg shadow-amber-500/20">
                3
              </div>
              <h3 className="text-xl font-bold text-slate-800">{t.how3}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t.how3Desc}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* SÒL LIVE CALCULATOR INTERACTIVE SIMULATOR */}
      <section id="simulator-section" className="py-16 bg-gradient-to-r from-amber-500 to-amber-600 text-white relative">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-5 space-y-4 text-left">
              <span className="bg-amber-400/30 text-amber-100 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full">Kalkilatris Sòl Nimerik</span>
              <h2 className="text-3xl font-sans font-black tracking-tight leading-tight">Simile pwogrè ak kòb Sòl ou kounye a</h2>
              <p className="text-sm text-amber-50/80 leading-relaxed">
                Chanje kantite moun, kantite kòb vèsman, ak frekans pou w wè reyalite lajan w ap akimile pou fòme men an (Kès la).
              </p>

              <div className="pt-4 space-y-1 block md:hidden">
                <p className="text-xs text-amber-200">Men anpil, chay pa lou!</p>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white text-slate-850 rounded-3xl p-6 md:p-8 shadow-2xl relative">
              <div className="space-y-6">
                
                {sols && sols.length > 0 && (
                  <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4 text-slate-800">
                    <span className="text-[9px] font-black tracking-widest text-amber-700 uppercase block mb-1">
                      CHWAZI YON SÒL KI REYÈL NAN BAZDONE A
                    </span>
                    <p className="text-xs text-slate-600 mb-3.5">
                      Klike sou youn nan sòl sa yo pou chaje paramèt yo otomatikman depi nan bazdone a:
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {sols.map((sol) => {
                        const isMatch = calcAmt === sol.contributionAmount && 
                                        calcMembers === sol.maxMembers && 
                                        calcFreq === sol.frequency;
                        return (
                          <button
                            key={sol.id}
                            type="button"
                            onClick={() => {
                              setCalcAmt(sol.contributionAmount);
                              setCalcMembers(sol.maxMembers);
                              setCalcFreq(sol.frequency);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border text-left ${
                              isMatch
                                ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                                : 'bg-white hover:bg-amber-50/30 text-slate-700 border-slate-200 hover:border-amber-250'
                            }`}
                          >
                            {sol.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 1. Contribution Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase mb-2">
                    Lajan kotizasyon (HTG)
                  </label>
                  <div className="flex items-center bg-slate-50 rounded-2xl p-3 border border-slate-200">
                    <span className="font-mono font-bold text-slate-500 mr-2">HTG</span>
                    <input
                      type="number"
                      value={calcAmt}
                      onChange={(e) => setCalcAmt(Math.max(100, parseInt(e.target.value) || 0))}
                      className="bg-transparent text-lg font-black text-slate-800 w-full outline-none"
                    />
                  </div>
                </div>

                {/* 2. Number of members slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase">
                      Kantite Manm nan Sòl la
                    </label>
                    <span className="text-sm font-extrabold text-amber-600">{calcMembers} manm</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={calcMembers}
                    onChange={(e) => setCalcMembers(parseInt(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>3 manm min.</span>
                    <span>15 manm max.</span>
                  </div>
                </div>

                {/* 3. Frequency button group */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase mb-2">
                    Kouman n ap mete kòb la?
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['daily', 'weekly', 'biweekly', 'monthly'] as const).map((freq) => (
                      <button
                        key={freq}
                        onClick={() => setCalcFreq(freq)}
                        className={`py-2 px-1 text-[10px] sm:px-2 sm:text-xs rounded-xl font-bold transition-all border text-center ${
                          calcFreq === freq
                            ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        {freq === 'daily'
                          ? (currentLanguage === 'creole' ? 'Chak jou' : currentLanguage === 'french' ? 'Chaque jour' : 'Daily')
                          : freq === 'weekly'
                          ? (currentLanguage === 'creole' ? 'Semèn' : currentLanguage === 'french' ? 'Semaine' : 'Weekly')
                          : freq === 'biweekly'
                          ? (currentLanguage === 'creole' ? 'Kenz jou' : currentLanguage === 'french' ? '15 jours' : 'Biweekly')
                          : (currentLanguage === 'creole' ? 'Mwa' : currentLanguage === 'french' ? 'Mois' : 'Monthly')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* RESULT SECTION */}
                <div className="bg-slate-900 text-white rounded-2xl p-5 text-center md:text-left md:flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Pòt la (Men an) w ap touche</p>
                    <p className="text-3xl font-black text-amber-400 font-mono mt-1">
                      {getMultiplier().toLocaleString()} <span className="text-sm">HTG</span>
                    </p>
                  </div>
                  <div className="mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-slate-800 md:pl-5 text-left text-xs text-slate-300">
                    <p>Sik la ap pran: <b className="text-white">{calcMembers} {getFreqName()}s</b></p>
                    <p className="mt-1">Kotizasyon: <b className="text-amber-300">{calcAmt.toLocaleString()} HTG</b> / {getFreqName()}</p>
                  </div>
                </div>

                {/* Interactive Explanation */}
                <p className="text-[11px] text-slate-500 italic text-center">
                  * Chak {getFreqName()}, tout {calcMembers} manm yo ap mete {calcAmt.toLocaleString()} HTG, epi youn nan manm yo pral touche yon "Pòt" {getMultiplier().toLocaleString()} HTG an total sak poze.
                </p>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQS SECTION */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-sans font-black tracking-tight text-slate-905">{t.faqTitle}</h2>
            <p className="text-slate-500 text-sm mt-2">{t.faq}</p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="p-6 bg-slate-50 rounded-2xl border border-slate-100/80 text-left">
                <h3 className="text-md font-bold text-slate-900 flex items-start">
                  <HelpCircle className="w-5 h-5 text-amber-500 mr-3 shrink-0 mt-0.5" />
                  <span>{faq.q}</span>
                </h3>
                <p className="text-sm text-slate-600 mt-3 ml-8 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section className="py-16 bg-slate-50 border-t border-slate-200/60">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center mb-8">
            <MessageSquare className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h2 className="text-2xl font-black text-slate-900">{t.contact}</h2>
            <p className="text-xs text-slate-500 mt-1">Sijere yon nouvo opsyon oswa mande asistans.</p>
          </div>

          {contactSent ? (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-150 rounded-3xl p-6 text-center space-y-2">
              <Check className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold">Mèsi anpil!</p>
              <p className="text-xs text-emerald-700">Mesaj ou a voye byen lwen. Ekip SOL ap reponn ou kounye a.</p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="bg-white rounded-3xl shadow-md border border-slate-100 p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Non ou</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Jean-Robert Vital"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-amber-500 focus:bg-white"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Imèl ou</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="jr.vital@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mesaj ou</label>
                <textarea
                  rows={4}
                  required
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  placeholder="Ekri kesyon oswa remak ou yo isit la..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-amber-500 focus:bg-white"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors text-xs uppercase"
              >
                Voye Mesaj la
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <span className="font-sans font-black text-white text-lg tracking-wider">{t.brandName}</span>
            <p className="mt-1 text-[11px] text-slate-500">Menn anpil chay pa lou. &copy; 2026 SOL Ayiti. Tout dwa rezève.</p>
          </div>
          <div className="flex flex-wrap gap-4 md:gap-6 justify-center">
            <a href="#about" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">{t.about}</a>
            <a href="#terms" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">{t.terms}</a>
            <a href="#privacy" onClick={(e) => e.preventDefault()} className="hover:text-white transition-colors">{t.privacy}</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
