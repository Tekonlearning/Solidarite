import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, Mail, Users, DollarSign, BookOpen } from 'lucide-react';
import { Language, SolGroup, Frequency } from '../types';
import { translations } from '../translations';

interface CreateSolProps {
  currentLanguage: Language;
  onBack: () => void;
  onSave: (newSol: Omit<SolGroup, 'id' | 'currentCycleId' | 'cycleNumber' | 'createdAt'>, initialInvited: string[]) => void;
  currentUser: { id: string; name: string };
}

export default function CreateSol({ currentLanguage, onBack, onSave, currentUser }: CreateSolProps) {
  const t = translations[currentLanguage];

  const [step, setStep] = useState(1);

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Financial rules
  const [contribAmount, setContribAmount] = useState<number>(2500);
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [maxMembers, setMaxMembers] = useState<number>(6);
  const [tirayMethod, setTirayMethod] = useState<'random' | 'first_come' | 'manual'>('random');
  const [autoAssignMembers, setAutoAssignMembers] = useState<boolean>(true);
  const [autoAssignWeightBasis, setAutoAssignWeightBasis] = useState<'uniform' | 'punctuality' | 'need'>('punctuality');

  // Step 3: Regulations / Bylaws
  const [rules, setRules] = useState(
    currentLanguage === 'creole'
      ? "1. Kotizasyon dwe fèt anvan dat limit la.\n2. Reta san esplikasyon bay penalite 10% kòb la.\n3. Peyi an dlo, sèk la asire vwayaj nou konfyans."
      : "1. Cotisations requises avant l'heure d'échéance.\n2. Tout retard non justifié implique une pénalité de 10%.\n3. Respect mutuel et solidarité."
  );

  // Step 4: Member invitations
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedList, setInvitedList] = useState<{ name: string; email: string }[]>([
    { name: "Claudette Dorval", email: "claudette.dorval@yahoo.fr" },
    { name: "Dieuseul Joseph", email: "dieuseul.joseph@gmail.com" }
  ]);

  const addInvite = () => {
    if (!inviteName || !inviteEmail) return;
    setInvitedList([...invitedList, { name: inviteName, email: inviteEmail }]);
    setInviteName('');
    setInviteEmail('');
  };

  const removeInvite = (index: number) => {
    setInvitedList(invitedList.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (step === 1 && !name.trim()) return;
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1) {
      onBack();
    } else {
      setStep(step - 1);
    }
  };

  const handleConfirm = () => {
    onSave({
      name,
      description,
      contributionAmount: contribAmount,
      frequency,
      totalPot: contribAmount * maxMembers,
      status: 'upcoming',
      creatorId: currentUser.id,
      maxMembers,
      rules,
      tirayMethod,
      autoAssignMembers,
      autoAssignWeightBasis,
    }, invitedList.map(i => i.email));
  };

  return (
    <div id="create-sol-container" className="max-w-3xl mx-auto px-4 py-8">
      
      {/* Header with back */}
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={handleBack}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">{t.create}</h1>
          <p className="text-xs text-slate-500">Maman Sòl: {currentUser.name}</p>
        </div>
          {/* STEP INDICATOR DOTS */}
      <div className="flex items-center justify-between mb-10 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs overflow-hidden scrollbar-none">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center space-x-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                step === s
                  ? 'bg-orange-600 text-white shadow-sm'
                  : step > s
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-slate-50 border border-slate-200 text-slate-400'
              }`}
            >
              {step > s ? <Check className="w-3.5 h-3.5" /> : s}
            </div>
            <span
              className={`hidden md:inline text-xs font-bold ${
                step === s ? 'text-orange-600' : 'text-slate-400'
              }`}
            >
              {s === 1
                ? t.step1Title
                : s === 2
                ? t.step2Title
                : s === 3
                ? t.rulesLabel.split(' ')[0]
                : s === 4
                ? t.step4Title
                : t.step5Title}
            </span>
          </div>
        ))}
      </div>

      {/* STEP CARD RENDERING */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 md:p-8 text-left">
        
        {/* Step 1: General Info */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t.step1Title}</h2>
              <p className="text-xs text-slate-400 mt-1">{t.step1Desc}</p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.solNameLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.placeholderSolName}
                  className="w-full bg-slate-50 border border-slate-205 rounded-xl p-3 text-sm focus:outline-orange-500 focus:bg-white focus:ring-0"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.solDescLabel}
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.placeholderSolDesc}
                  className="w-full bg-slate-50 border border-slate-205 rounded-xl p-3 text-sm focus:outline-orange-500 focus:bg-white focus:ring-0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Financial Rules */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t.step2Title}</h2>
              <p className="text-xs text-slate-400 mt-1">{t.step2Desc}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.contribAmountLabel} (HTG)
                </label>
                <div className="flex items-center bg-slate-50 border border-slate-205 rounded-xl p-3">
                  <DollarSign className="w-4 h-4 text-slate-450 mr-2" />
                  <input
                    type="number"
                    value={contribAmount}
                    onChange={(e) => setContribAmount(Math.max(100, parseInt(e.target.value) || 0))}
                    className="bg-transparent font-bold text-slate-800 w-full outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.frequencyLabel}
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className="w-full bg-slate-50 border border-slate-205 rounded-xl p-3 text-sm focus:outline-orange-500"
                >
                  <option value="daily">{t.freqDaily}</option>
                  <option value="weekly">{t.freqWeekly}</option>
                  <option value="every_15_days">{t.freqEvery15Days}</option>
                  <option value="biweekly">{t.freqBiweekly}</option>
                  <option value="monthly">{t.freqMonthly}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.maxMembersLabel}
                </label>
                <div className="flex items-center bg-slate-50 border border-slate-205 rounded-xl p-3">
                  <Users className="w-4 h-4 text-slate-450 mr-2" />
                  <input
                    type="number"
                    min="3"
                    max="20"
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(Math.min(20, Math.max(3, parseInt(e.target.value) || 3)))}
                    className="bg-transparent font-bold text-slate-800 w-full outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">Limite pratik la se ant 3 a 20 moun.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t.tirayMethodLabel}
                </label>
                <select
                  value={tirayMethod}
                  onChange={(e) => setTirayMethod(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-205 rounded-xl p-3 text-sm focus:outline-orange-500"
                >
                  <option value="random">{t.tirayRandom}</option>
                  <option value="first_come">{t.tirayFirstCome}</option>
                  <option value="manual">{t.tirayManual}</option>
                </select>
              </div>
            </div>

            {/* Auto-Assign Members Control */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  id="auto-assign-checkbox"
                  type="checkbox"
                  checked={autoAssignMembers}
                  onChange={(e) => setAutoAssignMembers(e.target.checked)}
                  className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="auto-assign-checkbox" className="text-xs font-extrabold text-slate-800 uppercase tracking-wider cursor-pointer">
                  Otomatikman Atribiye Pozisyon Tiray yo (Auto-Assign Members)
                </label>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal pl-7">
                Lè sèk sa kòmanse, sistèm nan ap otomatikman melanje ak asiyen manm yo nan orè tiray la baze sou yon algoritm jis.
              </p>

              {autoAssignMembers && (
                <div className="pl-7 pt-1 space-y-2">
                  <label className="block text-[10px] font-black text-slate-750 uppercase">
                    Kalite Algoritm Atribisyon (Weighted Fairness Basis):
                  </label>
                  <select
                    value={autoAssignWeightBasis}
                    onChange={(e) => setAutoAssignWeightBasis(e.target.value as any)}
                    className="w-full max-w-md bg-white border border-slate-205 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-orange-500"
                  >
                    <option value="punctuality">Priyorite Pèfòmans (Prioritize punctual members with higher weights)</option>
                    <option value="need">Sipò Kominotè (Prioritize guests & newer members for early payout)</option>
                    <option value="uniform">Distribisyon Egal (Perfectly uniform equal-chance shuffle)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Simulated Pot banner */}
            <div className="bg-orange-50 border border-orange-200/60 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-orange-700">Valè yon men pou chak moun (Kès total)</p>
                <p className="text-xl font-mono font-black text-orange-855 mt-1">{(contribAmount * maxMembers).toLocaleString()} HTG</p>
              </div>
              <div className="text-right text-xs text-orange-700 font-medium">
                <p>Mete: {contribAmount.toLocaleString()} HTG</p>
                <p className="font-bold">Total {maxMembers} fwa</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Regulations / Bylaws */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t.step3Title}</h2>
              <p className="text-xs text-slate-400 mt-1">{t.step3Desc}</p>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-705 uppercase mb-1">
                {t.rulesLabel}
              </label>
              <textarea
                rows={8}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder={t.placeholderRules}
                className="w-full bg-slate-50 border border-slate-205 rounded-xl p-3 text-sm font-mono text-xs focus:outline-orange-500 focus:bg-white focus:ring-0 leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* Step 4: Add Member invitations */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t.step4Title}</h2>
              <p className="text-xs text-slate-400 mt-1">{t.step4Desc}</p>
            </div>

            {/* Quick Invite Form */}
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.inviteMemberBtn}</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder={t.inviteNameLabel}
                  className="bg-white border border-slate-205 rounded-xl p-2.5 text-sm outline-none focus:border-orange-500"
                />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t.inviteEmailLabel}
                  className="bg-white border border-slate-205 rounded-xl p-2.5 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <button
                type="button"
                onClick={addInvite}
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addInviteBtn}</span>
              </button>
            </div>

            {/* Invited List list */}
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase mb-3 px-1">{t.invitedListTitle} ({invitedList.length})</p>
              {invitedList.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-2xl text-slate-400 text-xs italic">
                  {t.emptyInvited}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                  {invitedList.map((invite, index) => (
                    <div key={index} className="flex items-center justify-between py-2 px-1">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{invite.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{invite.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeInvite(index)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Review & Launch */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t.step5Title}</h2>
              <p className="text-xs text-slate-400 mt-1">{t.step5Desc}</p>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-450 uppercase block text-[10px] font-bold">Non Sòl la</span>
                  <span className="font-bold text-slate-850 text-sm">{name}</span>
                </div>
                <div>
                  <span className="text-slate-450 uppercase block text-[10px] font-bold">Kantite nan Kès la (POT)</span>
                  <span className="font-mono font-black text-emerald-600 text-sm">{(contribAmount * maxMembers).toLocaleString()} HTG</span>
                </div>
                <div>
                  <span className="text-slate-450 uppercase block text-[10px] font-bold">Dòz pou chak moun</span>
                  <span className="font-bold text-slate-800">{contribAmount.toLocaleString()} HTG</span>
                </div>
                <div>
                  <span className="text-slate-450 uppercase block text-[10px] font-bold">Frekans</span>
                  <span className="font-bold text-orange-600">
                    {frequency === 'daily' ? t.freqDaily : frequency === 'weekly' ? t.freqWeekly : frequency === 'every_15_days' ? t.freqEvery15Days : frequency === 'biweekly' ? t.freqBiweekly : t.freqMonthly}
                  </span>
                </div>
                <div>
                  <span className="text-slate-450 uppercase block text-[10px] font-bold">Fason tiray la</span>
                  <span className="font-bold text-slate-700">
                    {tirayMethod === 'random' ? t.tirayRandom : tirayMethod === 'first_come' ? t.tirayFirstCome : t.tirayManual}
                  </span>
                </div>
                <div>
                  <span className="text-slate-450 uppercase block text-[10px] font-bold">Manm envite</span>
                  <span className="font-bold text-slate-705">{invitedList.length} pitit</span>
                </div>
                <div>
                  <span className="text-slate-450 uppercase block text-[10px] font-bold">Distribisyon otomatik</span>
                  <span className="font-bold text-slate-800">
                    {autoAssignMembers ? `Wi (${autoAssignWeightBasis === 'punctuality' ? 'Priyorite Pèfòmans' : autoAssignWeightBasis === 'need' ? 'Sipò Kominotè' : 'Egalite'})` : 'Non'}
                  </span>
                </div>
              </div>

              {description && (
                <div className="border-t border-slate-200/60 pt-3">
                  <span className="text-slate-450 uppercase block text-[10px] font-bold">Deskripsyon</span>
                  <span className="text-xs text-slate-600 leading-relaxed block mt-1">{description}</span>
                </div>
              )}
            </div>

            {/* Maman Sòl agreement warning */}
            <div className="bg-orange-50 border border-orange-200/60 rounded-2xl p-4 flex items-start space-x-3 text-xs text-orange-950 font-medium leading-relaxed">
              <div className="w-5 h-5 bg-orange-600 text-white font-bold rounded-full flex items-center justify-center shrink-0 text-[10px]">!</div>
              <p>
                {t.reviewMessage}
              </p>
            </div>
          </div>
        )}

        {/* STEP CONTROLS BAR */}
        <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-150">
          <button
            onClick={handleBack}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-705 hover:bg-slate-50 transition-colors"
          >
            {t.backBtn}
          </button>

          {step < 5 ? (
            <button
              onClick={handleNext}
              disabled={step === 1 && !name.trim()}
              className={`px-6 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-sm flex items-center space-x-2 transition-transform ${
                step === 1 && !name.trim()
                  ? 'bg-slate-300 shadow-none cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 hover:-translate-y-0.5'
              }`}
            >
              <span>{t.continueBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-750 shadow-sm transition-transform hover:-translate-y-0.5"
            >
              {t.confirmBtn}
            </button>
          )}
        </div>

      </div>

      </div>
    </div>
  );
}
