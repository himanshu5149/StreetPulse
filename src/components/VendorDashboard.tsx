import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Clock, Camera, CheckCircle2, Flame, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { nanoid } from 'nanoid';
import { sessionService } from '../services/sessionService';
import { addHours } from 'date-fns';
import { User as FirebaseUser } from 'firebase/auth';

interface VendorDashboardProps {
  userLocation: { lat: number, lng: number } | null;
  user: FirebaseUser;
}

export default function VendorDashboard({ userLocation, user }: VendorDashboardProps) {
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    dishName: '',
    price: '',
    description: '',
    duration: '4', // Default 4 hours
  });

  const handleGoLive = async () => {
    if (!formData.dishName || !formData.price || !userLocation) return;
    
    setLoading(true);
    try {
      const sessionId = await sessionService.createFlare({
        vendorId: user.uid,
        vendorName: user.displayName || 'Unnamed Vendor',
        dishName: formData.dishName,
        price: parseFloat(formData.price),
        currency: '$',
        description: formData.description,
        location: userLocation,
        closesAt: addHours(new Date(), parseInt(formData.duration)).toISOString(),
        tags: [],
      });
      
      if (sessionId) {
        setCurrentSessionId(sessionId);
        setIsLive(true);
      }
    } catch (error) {
      console.error("Failed to launch flare", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEndFlare = async () => {
    if (!currentSessionId) return;
    
    setLoading(true);
    try {
      await sessionService.endFlare(currentSessionId);
      setIsLive(false);
      setCurrentSessionId(null);
    } catch (error) {
      console.error("Failed to end flare", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 pb-32">
      <div className="mb-10">
        <h2 className="text-4xl font-black tracking-tighter text-slate-900 mb-2 italic">Vendor Flare.</h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Signal your location to nearby eaters</p>
      </div>

      {!isLive ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Signal Flare Form */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Dish Name</label>
              <input 
                type="text" 
                placeholder="Spicy Chicken Momos" 
                value={formData.dishName}
                onChange={e => setFormData({...formData, dishName: e.target.value})}
                className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 placeholder:text-slate-300 font-black italic focus:ring-2 focus:ring-orange-600 transition-all text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Price ($)</label>
                <input 
                  type="number" 
                  placeholder="12" 
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 placeholder:text-slate-300 font-black italic focus:ring-2 focus:ring-orange-600 transition-all text-slate-800"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Duration</label>
                <select 
                  value={formData.duration}
                  onChange={e => setFormData({...formData, duration: e.target.value})}
                  className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 font-black italic focus:ring-2 focus:ring-orange-600 transition-all text-slate-800"
                >
                  <option value="2">2 Hours</option>
                  <option value="4">4 Hours</option>
                  <option value="6">6 Hours</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Narrative</label>
              <textarea 
                placeholder="Hand-pulled noodles, served hot under the bridge..." 
                rows={3}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 placeholder:text-slate-300 font-medium italic focus:ring-2 focus:ring-orange-600 transition-all text-slate-800 resize-none"
              />
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-5 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:text-orange-600 hover:border-orange-600 transition-all">
              <Camera size={24} />
              <span className="font-black text-[11px] uppercase tracking-[0.2em]">Add Visual Flare</span>
            </button>
          </div>

          {!userLocation && (
            <div className="p-5 bg-red-50 rounded-3xl flex gap-4 text-red-600 border border-red-100">
               <AlertCircle size={24} className="shrink-0" />
               <p className="text-[11px] font-black uppercase tracking-widest leading-relaxed">
                 Position Locked. Please enable GPS to launch signal.
               </p>
            </div>
          )}

          <button 
            onClick={handleGoLive}
            disabled={!formData.dishName || !formData.price || !userLocation || loading}
            className="w-full bg-slate-900 text-white rounded-[2rem] py-6 font-black text-xl uppercase tracking-[0.2em] shadow-2xl shadow-slate-300/50 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-3 italic"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Launch Flare.'}
          </button>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-10"
        >
          {/* Active Status */}
          <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-orange-200/50 border-4 border-orange-500 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-50 rounded-full -mr-24 -mt-24 animate-pulse opacity-50" />
            
            <div className="w-28 h-28 bg-orange-600 rounded-[2.5rem] flex items-center justify-center text-white mb-8 relative z-10 shadow-2xl shadow-orange-200 transform hover:scale-105 transition-transform">
              <Flame size={56} className="animate-bounce" />
            </div>
            
            <h3 className="text-3xl font-black text-slate-900 mb-2 italic">Signal Active.</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8">Eaters are scanning for you</p>
            
            <div className="grid grid-cols-2 gap-6 w-full relative z-10">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Unique Views</p>
                <p className="text-3xl font-black text-slate-900 italic">128</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">TTL</p>
                <p className="text-3xl font-black text-slate-900 italic">{formData.duration}h</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center border border-green-100">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <p className="text-lg font-black text-slate-900 italic leading-none mb-1">{formData.dishName}</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] leading-none">${formData.price} Per Item</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleEndFlare}
            disabled={loading}
            className="w-full bg-slate-900 text-white rounded-[2rem] py-5 font-black uppercase tracking-[0.2em] hover:bg-black transition-colors flex items-center justify-center gap-3 shadow-xl"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Kill Signal.'}
          </button>
        </motion.div>
      )}
    </div>
  );
}

