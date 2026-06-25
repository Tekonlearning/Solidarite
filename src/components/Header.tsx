import React, { useState, useEffect } from 'react';
import { Globe, Bell, User, Users, RefreshCw, Layers, LogOut, Sun, Moon } from 'lucide-react';
import { Language, UserSession } from '../types';
import { translations } from '../translations';
import { mockUsers } from '../mockData';

interface HeaderProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  currentUser: UserSession | null;
  onUserChange: (user: UserSession) => void;
  unreadNotificationsCount: number;
  onViewNotifications: () => void;
  onLogout: () => void;
  onLoginClick: () => void;
}

export default function Header({
  currentLanguage,
  onLanguageChange,
  currentUser,
  onUserChange,
  unreadNotificationsCount,
  onViewNotifications,
  onLogout,
  onLoginClick
}: HeaderProps) {
  const t = translations[currentLanguage];
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const getRoleLabel = (role: string) => {
    return role === 'maman_sol' ? t.roleMamanSol : t.member;
  };

  return (
    <header id="app-header" className="sticky top-0 z-40 bg-[#FBF9F7]/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-4 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* LOGO & BRAND CARD */}
        <div className="flex items-center space-x-3 cursor-pointer select-none">
          <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm transition-transform hover:scale-105 duration-200">
            S
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase leading-none text-slate-900">
              {t.brandName}
            </h1>
            <p className="text-[9px] text-orange-600 font-bold uppercase tracking-widest mt-0.5">
              Men Nan Men
            </p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center space-x-3 md:space-x-4">
          
          {/* Real-time UTC indicators */}
          <div className="hidden lg:flex flex-col text-right font-mono text-[9px] text-slate-400">
            <span>UTC: 2026-06-19 14:28:00</span>
            <span className="text-orange-600 font-bold tracking-wider">BENTO NET SYSTEM</span>
          </div>

          {/* LANGUAGE SELECTOR */}
          <div className="relative flex items-center bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs transition-colors hover:border-slate-350">
            <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
            <select
              id="language-select"
              value={currentLanguage}
              onChange={(e) => onLanguageChange(e.target.value as Language)}
              className="bg-transparent text-xs font-bold text-slate-800 border-none outline-none pr-5 cursor-pointer focus:ring-0"
            >
              <option value="creole">Kreyòl</option>
              <option value="french">FR</option>
              <option value="english">EN</option>
            </select>
          </div>

          {/* DARK MODE TOGGLE */}
          <button
            onClick={toggleDarkMode}
            className="p-2 bg-white text-slate-705 hover:bg-slate-50 rounded-xl border border-slate-200 shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center justify-center"
            title={isDark ? "Mòd Limyè" : "Mòd Nwa"}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-500 animate-pulse" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* NOTIFICATION TRIGGER */}
          <button
            id="notification-trigger"
            onClick={onViewNotifications}
            className="relative p-2 bg-white text-slate-705 hover:bg-slate-50 rounded-xl border border-slate-200 shadow-xs transition-transform active:scale-95"
            title={t.notifTitle}
          >
            <Bell className="w-4 h-4 text-slate-700" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full shadow-sm animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
          {/* USER PICKER (SIMULATOR MODE OR EXPERT LOGIN) */}
          <div className="relative">
            {currentUser ? (
              <>
                <button
                  id="user-picker-btn"
                  onClick={() => setShowUserPicker(!showUserPicker)}
                  className="flex items-center space-x-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-black tracking-wide hover:bg-orange-600 transition-colors shadow-sm active:scale-95 duration-200"
                >
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-5 h-5 rounded-full object-cover border border-slate-700 pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  <span className="hidden sm:inline max-w-[100px] truncate">{currentUser.name.split(' ')[0]}</span>
                  <RefreshCw className="w-3 h-3 text-slate-350 shrink-0" />
                </button>

                {showUserPicker && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="border-b border-slate-100 pb-3 mb-3">
                      <p className="text-[10px] font-black text-orange-600 tracking-wider uppercase mb-1">
                        {t.switchUser}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {t.switchUserDesc}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {mockUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            onUserChange(user);
                            setShowUserPicker(false);
                          }}
                          className={`w-full flex items-center space-x-3 p-2 rounded-xl text-left transition-all ${
                            currentUser.id === user.id
                              ? 'bg-orange-50 border border-orange-200'
                              : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {user.role === 'maman_sol' ? 'Maman Sòl (Gérante)' : 'Manm (Membre)'}
                            </p>
                          </div>
                          {currentUser.id === user.id && (
                            <span className="w-2.5 h-2.5 bg-orange-600 rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span>ID: {currentUser.id}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-650">
                        {getRoleLabel(currentUser.role)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserPicker(false);
                        onLogout();
                      }}
                      className="mt-3.5 w-full flex items-center justify-center space-x-2 py-2.5 bg-[#FFECEB] hover:bg-red-100 border border-red-200 hover:border-red-350 text-red-700 font-bold rounded-xl text-[10px] uppercase tracking-wider text-center transition-all shadow-xs"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t.logout}</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                id="header-login-btn"
                onClick={onLoginClick}
                className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-colors shadow-sm active:scale-95 duration-200"
              >
                <LogOut className="w-3.5 h-3.5 rotate-180" />
                <span>{t.login}</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
