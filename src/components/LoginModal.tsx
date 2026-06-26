import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Phone, Shield, Eye, EyeOff, X, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Language, MemberRole } from '../types';
import { translations } from '../translations';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase/config';

interface LoginModalProps {
  language: Language;
  onClose: () => void;
  onSuccess: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export default function LoginModal({ language, onClose, onSuccess }: LoginModalProps) {
  const { loginWithGoogle, loginWithEmail, signUpWithEmail, authError, setAuthError } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Client-side validation states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  
  // Success state for password reset
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';

  // Load remember me email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('sana_remembered_email');
    const savedRemember = localStorage.getItem('sana_remember_me');
    if (savedRemember === 'true' && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    } else if (savedRemember === 'false') {
      setRememberMe(false);
    }
  }, []);

  const t = translations[language] || translations.creole;

  // Localized texts
  const strings = {
    creole: {
      titleLogin: "Konekte sou Kont ou",
      titleRegister: "Kreye yon nouvo Kont",
      titleForgot: "Reyisyalize Modpas",
      descLogin: "Konekte pou w kòmanse jere sòl ou yo pi fasil e pi sekirize.",
      descRegister: "Kreye yon kont jodi a pou w jwenn aksè nan pi bon sistèm Sòl nimerik la.",
      descForgot: "Antre imèl ou anba a epi n ap voye yon lyen sekirize pou w chanje modpas ou.",
      emailLabel: "Adrès Imèl",
      emailPl: "egzanp: user@solayiti.ht",
      passLabel: "Modpas",
      passPl: "Antre modpas ou",
      nameLabel: "Non ak Siyati",
      namePl: "egzanp: Jean Baptiste",
      phoneLabel: "Nimewo Telefòn",
      phonePl: "egzanp: +509 3700-0000",
      roleLabel: "Wòl nan Sòl la",
      roleMember: "Manm Senp (Member)",
      roleMaman: "Maman Sòl (Manager / Gérante)",
      btnSubmitLogin: "Konekte kounye a",
      btnSubmitRegister: "Kreye Kont lan",
      btnSubmitForgot: "Voye Lyen Reyisyalizasyon",
      toggleToRegister: "Ou pa gen kont ankò? Enskri la a",
      toggleToLogin: "Ou gen yon kont deja? Konekte la a",
      forgotPasswordLink: "Modpas bliye?",
      rememberMeLabel: "Sonje mwen sou aparèy sa a",
      orDivider: "Oswa kontinye avèk",
      googleBtn: "Konekte ak Google",
      roleHelp: "Wòl 'Maman Sòl' pèmèt ou kreye ak jere pwòp sòl pa w, pandan ke 'Manm' pèmèt ou patisipe sèlman.",
      backToLogin: "Tounen nan paj koneksyon",
      resetSuccessTitle: "Imèl Voye ak Siksè!",
      resetSuccessDesc: "Yon lyen sekirize pati pou {email}. Swiv enstriksyon yo nan imèl la pou w mete yon nouvo modpas.",
      invalidEmailErr: "Fòma adrès imèl sa a pa kòrèk.",
      passwordTooWeak: "Modpas la dwe gen omwen 6 karaktè.",
      nameRequired: "Non ak Siyati a obligatwa pou enskripsyon an.",
      strengthWeak: "Fèb",
      strengthMedium: "Mwayen",
      strengthStrong: "Fò",
      strengthLabel: "Fòs modpas la:",
    },
    french: {
      titleLogin: "Connectez-vous à votre compte",
      titleRegister: "Créer un nouveau compte",
      titleForgot: "Mot de passe oublié",
      descLogin: "Connectez-vous pour commencer à gérer vos tontines plus simplement et en toute sécurité.",
      descRegister: "Inscrivez-vous dès aujourd'hui pour accéder au meilleur système de Sòl numérique.",
      descForgot: "Entrez votre adresse e-mail ci-dessous et nous vous enverrons un lien pour réinitialiser votre mot de passe.",
      emailLabel: "Adresse E-mail",
      emailPl: "ex: utilisateur@sana.ht",
      passLabel: "Mot de passe",
      passPl: "Saisissez votre mot de passe",
      nameLabel: "Nom Complet",
      namePl: "ex: Jean Baptiste",
      phoneLabel: "Numéro de Téléphone",
      phonePl: "ex: +509 3700-0000",
      roleLabel: "Rôle dans le Sòl",
      roleMember: "Membre Régulier",
      roleMaman: "Maman Sòl (Gérante)",
      btnSubmitLogin: "Se connecter",
      btnSubmitRegister: "Créer mon compte",
      btnSubmitForgot: "Envoyer le lien de réinitialisation",
      toggleToRegister: "Pas de compte ? Inscrivez-vous ici",
      toggleToLogin: "Déjà inscrit ? Connectez-vous ici",
      forgotPasswordLink: "Mot de passe oublié ?",
      rememberMeLabel: "Se souvenir de moi",
      orDivider: "Ou continuer avec",
      googleBtn: "Se connecter avec Google",
      roleHelp: "Le rôle de 'Maman Sòl' vous permet de créer et d'administrer des tontines, tandis que 'Membre' vous permet d'y participer.",
      backToLogin: "Retour à la connexion",
      resetSuccessTitle: "E-mail envoyé avec succès !",
      resetSuccessDesc: "Un lien de réinitialisation sécurisé a été envoyé à {email}. Veuillez vérifier votre boîte de réception.",
      invalidEmailErr: "L'adresse e-mail n'est pas valide.",
      passwordTooWeak: "Le mot de passe doit contenir au moins 6 caractères.",
      nameRequired: "Le nom complet est obligatoire pour l'inscription.",
      strengthWeak: "Faible",
      strengthMedium: "Moyen",
      strengthStrong: "Fort",
      strengthLabel: "Force du mot de passe :",
    },
    english: {
      titleLogin: "Sign In to Your Account",
      titleRegister: "Create a New Account",
      titleForgot: "Reset Your Password",
      descLogin: "Sign in to start managing your rotational savings easily and securely.",
      descRegister: "Register today to gain access to the leading digital Sol/Tontine system.",
      descForgot: "Enter your email address below and we'll send you a secure link to reset your password.",
      emailLabel: "Email Address",
      emailPl: "e.g., user@sana.ht",
      passLabel: "Password",
      passPl: "Enter your password",
      nameLabel: "Full Name",
      namePl: "e.g., Jean Baptiste",
      phoneLabel: "Phone Number",
      phonePl: "e.g., +509 3700-0000",
      roleLabel: "Role Designation",
      roleMember: "Regular Member",
      roleMaman: "Maman Sòl (Manager / Host)",
      btnSubmitLogin: "Sign In Now",
      btnSubmitRegister: "Create Account",
      btnSubmitForgot: "Send Reset Link",
      toggleToRegister: "New to SaNa? Register here",
      toggleToLogin: "Already have an account? Sign in here",
      forgotPasswordLink: "Forgot Password?",
      rememberMeLabel: "Remember me on this device",
      orDivider: "Or continue with",
      googleBtn: "Continue with Google",
      roleHelp: "Maman Sòl allows you to create and host your own Sol groups, while Member allows you to join existing ones.",
      backToLogin: "Back to Login",
      resetSuccessTitle: "Reset Email Sent!",
      resetSuccessDesc: "A secure password reset link has been successfully sent to {email}. Please check your inbox.",
      invalidEmailErr: "Please enter a valid email address.",
      passwordTooWeak: "Password must be at least 6 characters.",
      nameRequired: "Full Name is required for registration.",
      strengthWeak: "Weak",
      strengthMedium: "Medium",
      strengthStrong: "Strong",
      strengthLabel: "Password strength:",
    }
  }[language] || {
    titleLogin: "Konekte sou Kont ou",
    titleRegister: "Kreye yon nouvo Kont",
    titleForgot: "Reyisyalize Modpas",
    descLogin: "Konekte pou w kòmanse jere sòl ou yo pi fasil e pi sekirize.",
    descRegister: "Kreye yon kont jodi a pou w jwenn aksè nan pi bon sistèm Sòl nimerik la.",
    descForgot: "Antre imèl ou anba a epi n ap voye yon lyen sekirize pou w chanje modpas ou.",
    emailLabel: "Adrès Imèl",
    emailPl: "egzanp: user@solayiti.ht",
    passLabel: "Modpas",
    passPl: "Antre modpas ou",
    nameLabel: "Non ak Siyati",
    namePl: "egzanp: Jean Baptiste",
    phoneLabel: "Nimewo Telefòn",
    phonePl: "egzanp: +509 3700-0000",
    roleLabel: "Wòl nan Sòl la",
    roleMember: "Manm Senp (Member)",
    roleMaman: "Maman Sòl (Manager / Gérante)",
    btnSubmitLogin: "Konekte kounye a",
    btnSubmitRegister: "Kreye Kont lan",
    btnSubmitForgot: "Voye Lyen Reyisyalizasyon",
    toggleToRegister: "Ou pa gen kont ankò? Enskri la a",
    toggleToLogin: "Ou gen yon kont deja? Konekte la a",
    forgotPasswordLink: "Modpas bliye?",
    rememberMeLabel: "Sonje mwen sou aparèy sa a",
    orDivider: "Oswa kontinye avèk",
    googleBtn: "Konekte ak Google",
    roleHelp: "Wòl 'Maman Sòl' pèmèt ou kreye ak jere pwòp sòl pa w, pandan ke 'Manm' pèmèt ou patisipe sèlman.",
    backToLogin: "Tounen nan paj koneksyon",
    resetSuccessTitle: "Imèl Voye ak Siksè!",
    resetSuccessDesc: "Yon lyen sekirize pati pou {email}. Swiv enstriksyon yo nan imèl la pou w mete yon nouvo modpas.",
    invalidEmailErr: "Fòma adrès imèl sa a pa kòrèk.",
    passwordTooWeak: "Modpas la dwe gen omwen 6 karaktè.",
    nameRequired: "Non ak Siyati a obligatwa pou enskripsyon an.",
    strengthWeak: "Fèb",
    strengthMedium: "Mwayen",
    strengthStrong: "Fò",
    strengthLabel: "Fòs modpas la:",
  };

  // Helper validation regex
  const validateEmailFormat = (input: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input.trim());
  };

  // Dynamic Password Strength Calculations
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: '', color: 'bg-slate-200', textColor: 'text-slate-400' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (/\d/.test(pass)) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    
    if (score <= 1) {
      return { score, text: strings.strengthWeak, color: 'bg-rose-500', textColor: 'text-rose-500' };
    } else if (score <= 3) {
      return { score, text: strings.strengthMedium, color: 'bg-amber-500', textColor: 'text-amber-500' };
    } else {
      return { score, text: strings.strengthStrong, color: 'bg-emerald-500', textColor: 'text-emerald-500' };
    }
  };

  const strength = getPasswordStrength(password);

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setEmailError(null);
    setPasswordError(null);
    setNameError(null);

    let hasErrors = false;

    // 1. Validate Email
    if (!email) {
      setEmailError(strings.invalidEmailErr);
      hasErrors = true;
    } else if (!validateEmailFormat(email)) {
      setEmailError(strings.invalidEmailErr);
      hasErrors = true;
    }

    // 2. Validate Password
    if (!password) {
      setPasswordError(strings.passwordTooWeak);
      hasErrors = true;
    } else if (password.length < 6) {
      setPasswordError(strings.passwordTooWeak);
      hasErrors = true;
    }

    // 3. Validate Name (Register mode only)
    if (isRegister && !name.trim()) {
      setNameError(strings.nameRequired);
      hasErrors = true;
    }

    if (hasErrors) return;

    setLoading(true);

    try {
      if (isRegister) {
        await signUpWithEmail(email.trim(), password, name.trim(), role, phone.trim());
      } else {
        await loginWithEmail(email.trim(), password);
        
        // Handle Remember Me logic
        if (rememberMe) {
          localStorage.setItem('sana_remembered_email', email.trim());
          localStorage.setItem('sana_remember_me', 'true');
        } else {
          localStorage.removeItem('sana_remembered_email');
          localStorage.setItem('sana_remember_me', 'false');
        }
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Password Reset Link Handler
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setEmailError(null);
    setResetSuccess(null);

    if (!email || !validateEmailFormat(email)) {
      setEmailError(strings.invalidEmailErr);
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSuccess(strings.resetSuccessDesc.replace('{email}', email.trim()));
    } catch (err: any) {
      console.error('Password reset failure:', err);
      let friendlyMsg = 'Echwe pou voye imèl. Tanpri eseye ankò.';
      if (err.code === 'auth/user-not-found') {
        friendlyMsg = language === 'creole' 
          ? "Sistèm nan pa jwenn okenn kont ki anrejistre avèk adrès imèl sa a."
          : language === 'french'
          ? "Aucun compte n'a été trouvé avec cette adresse e-mail."
          : "No account was found with this email address.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyMsg = strings.invalidEmailErr;
      } else if (err.message) {
        friendlyMsg = err.message;
      }
      setAuthError(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Login Handler with precise error descriptions
  const handleGoogleLogin = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
      onSuccess();
    } catch (err: any) {
      console.error('Google login cancelled or failed:', err);
      let friendlyMsg = 'Echwe pou konekte ak Google.';
      
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        friendlyMsg = language === 'creole'
          ? "Ou te fèmen fenèt Google la anvan koneksyon an fini. Tanpri eseye ankò."
          : language === 'french'
          ? "Vous avez fermé la fenêtre d'authentification Google avant la fin."
          : "You closed the Google sign-in window before completing the process.";
      } else if (err.code === 'auth/popup-blocked') {
        friendlyMsg = language === 'creole'
          ? "Navigatè w la bloke fenèt pop-up la. Tanpri pèmèt li pou sit sa a."
          : language === 'french'
          ? "Le navigateur a bloqué la fenêtre pop-up. Veuillez autoriser les pop-ups pour ce site."
          : "Your browser blocked the login popup. Please allow popups for this site.";
      } else if (err.code === 'auth/network-request-failed') {
        friendlyMsg = language === 'creole'
          ? "Erè rezo. Tanpri verifye koneksyon entènèt ou epi eseye ankò."
          : language === 'french'
          ? "Erreur réseau. Veuillez vérifier votre connexion Internet."
          : "Network error. Please check your internet connection.";
      } else if (err.message) {
        friendlyMsg = `${friendlyMsg} (${err.message})`;
      }
      
      setAuthError(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      id="login-modal-backdrop" 
      className="fixed inset-0 z-55 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="login-modal-content" 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-t-4 border-orange-500 border-x border-b border-slate-100 overflow-hidden font-sans text-slate-800 animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full border border-slate-150 text-slate-400 hover:text-slate-750 transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal body (scrollable) */}
        <div className="overflow-y-auto p-6 md:p-8 custom-scrollbar">
          
          {/* Back to Login Button for Forgot Password screen */}
          {isForgot && (
            <button
              onClick={() => {
                setMode('login');
                setAuthError(null);
                setResetSuccess(null);
                setEmailError(null);
              }}
              className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{strings.backToLogin}</span>
            </button>
          )}

          {/* Header branding */}
          <div className="text-center mb-6 mt-2">
            <span className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl mb-3 font-black text-xl shadow-xs">
              Sòl
            </span>
            <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">
              {isForgot 
                ? strings.titleForgot 
                : isRegister 
                ? strings.titleRegister 
                : strings.titleLogin
              }
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-sm mx-auto">
              {isForgot 
                ? strings.descForgot 
                : isRegister 
                ? strings.descRegister 
                : strings.descLogin
              }
            </p>
          </div>

          {/* AUTH ERROR DISPLAY */}
          {authError && (
            <div className="mb-5 bg-rose-50 border border-rose-200 p-4 rounded-xl text-xs text-rose-950 flex flex-col space-y-1.5 animate-in slide-in-from-top-2 duration-150 shadow-xs">
              <div className="flex items-start justify-between">
                <span className="font-bold flex items-center space-x-1.5 text-rose-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Mesaj Erè</span>
                </span>
                <button 
                  onClick={() => setAuthError(null)}
                  className="text-rose-500 hover:text-rose-800 text-[10px] font-black uppercase cursor-pointer"
                >
                  Ok
                </button>
              </div>
              <p className="font-medium leading-relaxed">{authError}</p>
            </div>
          )}

          {/* SUCCESS MESSAGE DISPLAY */}
          {resetSuccess && (
            <div className="mb-5 bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-950 flex flex-col space-y-1.5 animate-in slide-in-from-top-2 duration-150 shadow-xs">
              <span className="font-bold flex items-center space-x-1.5 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{strings.resetSuccessTitle}</span>
              </span>
              <p className="font-medium leading-relaxed">{resetSuccess}</p>
            </div>
          )}

          {/* FORGOT PASSWORD FORM */}
          {isForgot ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {strings.emailLabel} <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder={strings.emailPl}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    disabled={loading}
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border ${
                      emailError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-orange-500 focus:ring-orange-100'
                    } rounded-xl text-sm transition-all focus:ring-2 outline-none`}
                  />
                </div>
                {emailError && (
                  <p className="text-[10px] font-bold text-rose-600 mt-1 pl-1">{emailError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-xs font-black tracking-wide uppercase">
                    {strings.btnSubmitForgot}
                  </span>
                )}
              </button>
            </form>
          ) : (
            /* STANDARD LOGIN & REGISTRATION FORM */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* NAME FIELD (REGISTER ONLY) */}
              {isRegister && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {strings.nameLabel} <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder={strings.namePl}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (nameError) setNameError(null);
                      }}
                      disabled={loading}
                      className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border ${
                        nameError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-orange-500 focus:ring-orange-100'
                      } rounded-xl text-sm transition-all focus:ring-2 outline-none`}
                    />
                  </div>
                  {nameError && (
                    <p className="text-[10px] font-bold text-rose-600 mt-1 pl-1">{nameError}</p>
                  )}
                </div>
              )}

              {/* EMAIL FIELD */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {strings.emailLabel} <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder={strings.emailPl}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    disabled={loading}
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border ${
                      emailError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-orange-500 focus:ring-orange-100'
                    } rounded-xl text-sm transition-all focus:ring-2 outline-none`}
                  />
                </div>
                {emailError && (
                  <p className="text-[10px] font-bold text-rose-600 mt-1 pl-1">{emailError}</p>
                )}
              </div>

              {/* PHONE FIELD (REGISTER ONLY) */}
              {isRegister && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {strings.phoneLabel}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      placeholder={strings.phonePl}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl text-sm transition-all focus:ring-2 focus:ring-orange-100 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* PASSWORD FIELD WITH DYNAMIC SHIELD TOGGLE */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {strings.passLabel} <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder={strings.passPl}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    disabled={loading}
                    minLength={6}
                    className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border ${
                      passwordError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-orange-500 focus:ring-orange-100'
                    } rounded-xl text-sm transition-all focus:ring-2 outline-none`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors p-1"
                    title={showPassword ? "Kache modpas la" : "Montre modpas la"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-[10px] font-bold text-rose-600 mt-1 pl-1">{passwordError}</p>
                )}

                {/* Password Strength Meter for registration */}
                {isRegister && password.length > 0 && (
                  <div className="mt-2 space-y-1.5 p-2 bg-slate-50 rounded-lg animate-in fade-in duration-200">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-bold">{strings.strengthLabel}</span>
                      <span className={`font-bold uppercase ${strength.textColor}`}>{strength.text}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex gap-0.5">
                      <div className={`h-full transition-all duration-300 ${strength.color} ${strength.score >= 1 ? 'w-1/3' : 'w-0'}`} />
                      <div className={`h-full transition-all duration-300 ${strength.color} ${strength.score >= 3 ? 'w-1/3' : 'w-0'}`} />
                      <div className={`h-full transition-all duration-300 ${strength.color} ${strength.score >= 4 ? 'w-1/3' : 'w-0'}`} />
                    </div>
                  </div>
                )}
              </div>

              {/* REMEMBER ME & FORGOT PASSWORD PANEL */}
              {!isRegister && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 text-xs text-slate-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500 accent-orange-600"
                    />
                    <span>{strings.rememberMeLabel}</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setAuthError(null);
                      setResetSuccess(null);
                      setEmailError(null);
                    }}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
                  >
                    {strings.forgotPasswordLink}
                  </button>
                </div>
              )}

              {/* ROLE DESIGNATION (REGISTER ONLY) */}
              {isRegister && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {strings.roleLabel}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('member')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        role === 'member'
                          ? 'border-orange-500 bg-orange-50 text-orange-800 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <p className="text-xs">{strings.roleMember}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('maman_sol')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        role === 'maman_sol'
                          ? 'border-orange-500 bg-orange-50 text-orange-800 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <p className="text-xs">{strings.roleMaman}</p>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed italic mt-1">
                    {strings.roleHelp}
                  </p>
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-xs font-black tracking-wide uppercase">
                    {isRegister ? strings.btnSubmitRegister : strings.btnSubmitLogin}
                  </span>
                )}
              </button>
            </form>
          )}

          {/* TOGGLE MODE LINK */}
          <div className="text-center mt-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setMode(isRegister ? 'login' : 'register');
                setAuthError(null);
                setResetSuccess(null);
                setEmailError(null);
                setPasswordError(null);
                setNameError(null);
              }}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors inline-block"
            >
              {isRegister ? strings.toggleToLogin : strings.toggleToRegister}
            </button>
          </div>

          {/* OR DIVIDER */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200"></span>
            </div>
            <div className="relative flex justify-center text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3">
              {strings.orDivider}
            </div>
          </div>

          {/* GOOGLE AUTH */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold py-3 px-4 rounded-xl shadow-xs transition-colors cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l3.66-2.82z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.82c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span className="text-xs font-black tracking-wide uppercase">
              {strings.googleBtn}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
