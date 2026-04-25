/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map as MapIcon, PlusCircle, User, Info, MapPin, Signal, Loader2, LogIn, LogOut } from 'lucide-react';
import { cn } from './lib/utils';
import { VendorSession } from './types';
import { MOCK_SESSIONS } from './constants';
import { sessionService } from './services/sessionService';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';

// We'll lazy load the map to avoid SSR/Initial load issues with Leaflet
const MapDiscovery = React.lazy(() => import('./components/MapDiscovery'));
const VendorDashboard = React.lazy(() => import('./components/VendorDashboard'));
const ProfileTab = React.lazy(() => import('./components/ProfileTab'));

export default function App() {
  const [activeTab, setActiveTab] = useState<'discover' | 'vendor' | 'profile'>('discover');
  const [sessions, setSessions] = useState<VendorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    // 1. Handle Auth State
    const unsubsAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // 2. Get User Location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      }, (err) => {
        console.warn("Location access denied", err);
      });
    }

    // 3. Subscribe to Real-time Sessions
    const unsubscribeSessions = sessionService.subscribeToLiveSessions((liveSessions) => {
      setSessions(liveSessions.length > 0 ? liveSessions : MOCK_SESSIONS);
      setLoading(false);
    });

    return () => {
      unsubsAuth();
      unsubscribeSessions();
    };
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setActiveTab('discover');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 h-20 bg-white border-b border-slate-200 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
            <Signal size={22} strokeWidth={3} className="text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-orange-600 italic">FLARE.</span>
        </div>
        <div className="flex items-center gap-3">
          {!user ? (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all"
            >
              <LogIn size={14} />
              Login
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleLogout}
                className="w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center bg-white hover:bg-slate-50 transition-colors text-slate-400"
              >
                <LogOut size={18} />
              </button>
              <div className="w-10 h-10 bg-orange-100 rounded-full border-2 border-orange-500 flex items-center justify-center text-orange-600 font-black uppercase text-xs">
                {user.displayName?.substring(0, 2) || '??'}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden bg-[#F1F3F4]">
        <React.Suspense fallback={<LoadingOverlay message="Initializing Map..." />}>
          {loading ? (
            <LoadingOverlay message="Scanning local signals..." />
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'discover' && (
                <motion.div
                  key="discover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full w-full"
                >
                  <MapDiscovery sessions={sessions} />
                </motion.div>
              )}
              {activeTab === 'vendor' && (
                <motion.div
                  key="vendor"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full w-full overflow-y-auto"
                >
                  {user ? (
                    <VendorDashboard userLocation={userLocation} user={user} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                       <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-300 mb-6">
                         <User size={40} />
                       </div>
                       <h3 className="text-2xl font-black text-slate-900 mb-2 italic">Vendor Access Locked.</h3>
                       <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">Login to start signalling nearby eaters</p>
                       <button 
                         onClick={handleLogin}
                         className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-200 active:scale-95 transition-transform"
                       >
                         Auth via Google
                       </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="h-full w-full overflow-y-auto"
                >
                  {user ? (
                    <ProfileTab user={user} onLogout={handleLogout} userLocation={userLocation} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-100">
                       <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-300 mb-6">
                         <User size={40} />
                       </div>
                       <h3 className="text-2xl font-black text-slate-900 mb-2 italic">Access Locked.</h3>
                       <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">Login to manage your profile and alerts</p>
                       <button 
                         onClick={handleLogin}
                         className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-200 active:scale-95 transition-transform"
                       >
                         Auth via Google
                       </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </React.Suspense>
      </main>

      {/* Bottom Navigation */}
      <nav className="shrink-0 bg-white border-t border-slate-200 px-8 py-4 pb-8 flex items-center justify-around z-50">
        <NavButton 
          active={activeTab === 'discover'} 
          onClick={() => setActiveTab('discover')}
          icon={<MapPin size={26} />}
          label="I'm Hungry"
        />
        <div className="relative -top-8">
           <button 
             onClick={() => setActiveTab('vendor')}
             className={cn(
               "w-16 h-16 rounded-2xl flex items-center justify-center text-white transition-all duration-300 shadow-2xl",
               activeTab === 'vendor' ? "bg-slate-900 scale-110 shadow-slate-200" : "bg-orange-600 hover:bg-orange-700 shadow-orange-200"
             )}
           >
             <PlusCircle size={32} className={cn("transition-transform duration-300", activeTab === 'vendor' && "rotate-45")} />
           </button>
           <p className={cn(
             "absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors whitespace-nowrap",
             activeTab === 'vendor' ? "text-slate-900" : "text-slate-400"
           )}>
             {activeTab === 'vendor' ? 'Cooking' : 'I\'m Cooking'}
           </p>
        </div>
        <NavButton 
          active={activeTab === 'profile'} 
          onClick={() => setActiveTab('profile')}
          icon={<User size={26} />}
          label="Profile"
        />
      </nav>

      {/* Bottom Ticker Flare Panel */}
      <div className="h-10 bg-orange-600 shrink-0 flex items-center px-8 text-white font-bold text-[10px] tracking-widest gap-8 z-50">
        <span className="uppercase opacity-70 flex-shrink-0">Live Signals:</span>
        <div className="flex gap-8 overflow-hidden items-center whitespace-nowrap">
           {sessions.map(s => (
             <span key={s.id} className="animate-marquee">🔥 {s.dishName} at {s.vendorName}</span>
           ))}
        </div>
      </div>
    </div>
  );
}

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-50">
      <motion.div 
         animate={{ scale: [1, 1.05, 1] }}
         transition={{ repeat: Infinity, duration: 2 }}
         className="flex flex-col items-center gap-6"
      >
        <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-orange-200">
          <Signal size={32} className="animate-pulse" />
        </div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{message}</p>
      </motion.div>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all",
        active ? "text-orange-500" : "text-stone-300 hover:text-stone-500"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { strokeWidth: active ? 2.5 : 2 })}
      <span className={cn("text-[10px] font-bold uppercase tracking-wider", active ? "opacity-100" : "opacity-0")}>
        {label}
      </span>
    </button>
  );
}


