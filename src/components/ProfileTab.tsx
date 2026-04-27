import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Bell, MapPin, LogOut, CheckCircle2, ShieldAlert, Loader2, Globe, X } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { sessionService } from '../services/sessionService';
import { UserAlert } from '../types';
import { cn } from '../lib/utils';

interface ProfileTabProps {
  user: FirebaseUser;
  onLogout: () => void;
  userLocation: { lat: number, lng: number } | null;
}

export default function ProfileTab({ user, onLogout, userLocation }: ProfileTabProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alertConfig, setAlertConfig] = useState<Omit<UserAlert, 'id'>>({
    userId: user.uid,
    radiusKm: 2,
    enabled: true,
    keywords: [],
  });
  const [locationName, setLocationName] = useState<string>('Detecting location...');
  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    const fetchAlert = async () => {
      const existing = await sessionService.getUserAlert(user.uid);
      if (existing) {
        setAlertConfig(existing);
      }
    };
    fetchAlert();

    // Reverse geocode to get English location name
    if (userLocation) {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}&accept-language=en`)
        .then(res => res.json())
        .then(data => {
          const city = data.address.city || data.address.town || data.address.village;
          const country = data.address.country;
          if (city && country) {
            setLocationName(`${city}, ${country}`);
          } else {
            setLocationName(data.display_name.split(',').slice(0, 2).join(','));
          }
        })
        .catch(() => setLocationName('Location active'));
    }
  }, [user.uid, userLocation]);

  const handleSaveAlert = async () => {
    setLoading(true);
    await sessionService.saveAlert(alertConfig);
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);

    // Request notification permission
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification("Signal Flare Active", {
          body: `You will be notified when vendors go live within ${alertConfig.radiusKm}km of your location.`,
          icon: "/favicon.ico"
        });
      }
    }
  };

  return (
    <div className="p-8 pb-32">
      <div className="mb-10">
        <h2 className="text-4xl font-black tracking-tighter text-slate-900 mb-2 italic">User Identity.</h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Manage your presence and alerts</p>
      </div>

      <div className="space-y-8">
        {/* User Info Card */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-orange-100 rounded-full border-4 border-orange-500 flex items-center justify-center text-orange-600 font-black text-3xl mb-4 shadow-inner">
            {user.displayName?.substring(0, 2) || '??'}
          </div>
          <h3 className="text-2xl font-black text-slate-900 leading-tight italic">{user.displayName}</h3>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-6">{user.email}</p>
          
          <div className="w-full h-px bg-slate-50 mb-6" />
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-black text-[10px] uppercase tracking-[0.2em] transition-colors"
          >
            <LogOut size={16} />
            Detach Identity
          </button>
        </div>

        {/* Alerts Configuration */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                <Bell size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Signal Alerts</h4>
                <p className="text-[10px] text-slate-400 font-bold">Get notified when vendors go live</p>
              </div>
            </div>
            
            <button 
              onClick={() => setAlertConfig({...alertConfig, enabled: !alertConfig.enabled})}
              className={cn(
                "w-14 h-8 rounded-full relative transition-colors duration-300 shadow-inner",
                alertConfig.enabled ? "bg-orange-500" : "bg-slate-200"
              )}
            >
              <div className={cn(
                "absolute top-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md",
                alertConfig.enabled ? "translate-x-7" : "translate-x-1"
              )} />
            </button>
          </div>

          <div className="space-y-6 opacity-100 transition-opacity">
            {!alertConfig.enabled && <div className="absolute inset-0 bg-white/50 z-10 rounded-3xl" />}
            
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Detection Radius</label>
                <span className="text-lg font-black text-orange-600 italic leading-none">{alertConfig.radiusKm} KM</span>
              </div>
              <input 
                type="range"
                min="0.5"
                max="20"
                step="0.5"
                value={alertConfig.radiusKm}
                onChange={e => setAlertConfig({...alertConfig, radiusKm: parseFloat(e.target.value)})}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Favorite Dishes & Keywords</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="e.g. Momo, Pizza, Spicy..."
                  value={keywordInput}
                  onChange={e => setKeywordInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && keywordInput.trim()) {
                      e.preventDefault();
                      if (!alertConfig.keywords.includes(keywordInput.trim())) {
                        setAlertConfig({...alertConfig, keywords: [...alertConfig.keywords, keywordInput.trim()]});
                      }
                      setKeywordInput('');
                    }
                  }}
                  className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-orange-500 transition-all italic"
                />
                <button 
                  onClick={() => {
                    if (keywordInput.trim() && !alertConfig.keywords.includes(keywordInput.trim())) {
                      setAlertConfig({...alertConfig, keywords: [...alertConfig.keywords, keywordInput.trim()]});
                      setKeywordInput('');
                    }
                  }}
                  className="bg-slate-900 text-white px-4 rounded-xl text-xs font-black"
                >
                  ADD
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {alertConfig.keywords.map(word => (
                  <span key={word} className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-orange-100">
                    {word}
                    <X size={12} className="cursor-pointer" onClick={() => setAlertConfig({...alertConfig, keywords: alertConfig.keywords.filter(k => k !== word)})} />
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                 <Globe size={18} />
               </div>
               <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Current Anchor</p>
                 <p className="text-sm font-black text-slate-900 italic leading-none">{locationName}</p>
               </div>
            </div>

            <button 
              onClick={handleSaveAlert}
              disabled={loading || !alertConfig.enabled}
              className={cn(
                "w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 italic",
                success 
                  ? "bg-green-500 text-white shadow-xl shadow-green-200" 
                  : "bg-slate-900 text-white shadow-2xl shadow-slate-300/50 hover:bg-black active:scale-95 disabled:opacity-50"
              )}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 
               success ? <><CheckCircle2 size={20} /> Config Locked</> : 
               'Save Preferences.'}
            </button>
          </div>
        </div>

        {/* Global Stats/Misc */}
        <div className="grid grid-cols-2 gap-6">
           <div className="bg-slate-900 p-6 rounded-[2rem] text-white">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-2">Total Verified Signals</p>
              <p className="text-3xl font-black italic">1,402</p>
           </div>
           <div className="bg-orange-600 p-6 rounded-[2rem] text-white">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-2">Trust Level</p>
              <p className="text-3xl font-black italic">ELITE</p>
           </div>
        </div>
      </div>
    </div>
  );
}
