import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  MapPin, 
  Clock, 
  Camera, 
  CheckCircle2, 
  Flame, 
  AlertCircle, 
  Loader2, 
  ChefHat, 
  IndianRupee, 
  MessageSquare,
  BarChart3,
  Users,
  Target,
  TrendingUp,
  History
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { sessionService } from '../services/sessionService';
import { addHours, formatDistanceToNow } from 'date-fns';
import { User as FirebaseUser } from 'firebase/auth';
import { VendorSession, Vendor } from '../types';

interface VendorDashboardProps {
  userLocation: { lat: number, lng: number } | null;
  user: FirebaseUser;
}

export default function VendorDashboard({ userLocation, user }: VendorDashboardProps) {
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<VendorSession | null>(null);
  const [vendorProfile, setVendorProfile] = useState<Vendor | null>(null);
  const [editData, setEditData] = useState({
    dishName: '',
    price: '',
    description: '',
  });
  const [formData, setFormData] = useState({
    dishName: '',
    price: '',
    description: '',
    duration: '4', 
    category: '🥟 Momos',
    priceRange: 'mid' as const,
    isVeg: true,
    spiceLevel: 'medium' as const,
    whatsappNumber: '',
  });

  const categories = ['🥟 Momos', '🍜 Noodles', '🍱 Rice/Thali', '🌮 Snacks', '🔥 Grilled', '🧁 Sweets', '☕ Chiya', '🥗 Other'];

  useEffect(() => {
    // Check for active sessions on mount
    const q = query(
      collection(db, 'sessions'), 
      where('vendorId', '==', user.uid),
      where('status', '==', 'open')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const session = snapshot.docs[0].data() as VendorSession;
        const sessionId = snapshot.docs[0].id;
        const now = new Date().toISOString();
        
        if (session.closesAt > now) {
          setCurrentSessionId(sessionId);
          setActiveSession({ ...session, id: sessionId });
          setIsLive(true);
          setEditData({
            dishName: session.dishName,
            price: session.price.toString(),
            description: session.description || '',
          });
        }
      } else {
        setIsLive(false);
        setCurrentSessionId(null);
        setActiveSession(null);
      }
    });

    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    const fetchProfile = async () => {
      const profile = await sessionService.getVendorProfile(user.uid);
      if (profile) {
        setVendorProfile(profile);
        if (profile.whatsappNumber) setFormData(prev => ({ ...prev, whatsappNumber: profile.whatsappNumber! }));
      }
    };
    fetchProfile();
  }, [user.uid]);

  const handleUpdateDetails = async () => {
    if (!currentSessionId || !editData.dishName || !editData.price) return;
    
    setLoading(true);
    try {
      await sessionService.updateSessionDetails(currentSessionId, {
        dishName: editData.dishName,
        price: parseFloat(editData.price),
        description: editData.description
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update session", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExtend = async () => {
    if (!currentSessionId || !activeSession) return;
    setLoading(true);
    try {
      await sessionService.extendSession(currentSessionId, activeSession.closesAt);
    } catch (error) {
      console.error("Failed to extend session", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoLive = async () => {
    if (!formData.dishName || !formData.price || !userLocation) return;
    
    setLoading(true);
    try {
      const sessionId = await sessionService.createFlare({
        vendorId: user.uid,
        vendorName: user.displayName || 'Unnamed Vendor',
        dishName: formData.dishName,
        price: parseFloat(formData.price),
        currency: 'Rs.',
        description: formData.description,
        location: userLocation,
        category: formData.category,
        priceRange: formData.priceRange,
        isVeg: formData.isVeg,
        spiceLevel: formData.spiceLevel,
        whatsappNumber: formData.whatsappNumber,
        closesAt: addHours(new Date(), parseInt(formData.duration)).toISOString(),
        tags: [formData.category],
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
    <div className="p-8 pb-32 max-w-2xl mx-auto">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900 mb-2 italic">Street Console.</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Command center for your street presence</p>
        </div>
        {vendorProfile?.isVerifiedVendor && (
          <div className="bg-orange-500 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg shadow-orange-100">
            <Target size={16} />
            <span className="font-black text-[10px] uppercase tracking-widest italic">Elite Vendor</span>
          </div>
        )}
      </div>

      {!isLive ? (
        <div className="space-y-12">
          {/* Analytics Overview - Feature 7 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 p-6 rounded-[2rem] text-white">
              <div className="flex justify-between items-start mb-4">
                <BarChart3 className="text-orange-500" size={24} />
                <TrendingUp size={16} className="text-green-500" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Total Signals</p>
              <p className="text-3xl font-black italic">{vendorProfile?.totalSessions || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
               <div className="flex justify-between items-start mb-4 text-slate-900">
                  <ChefHat size={24} className="text-orange-600" />
                  <Target size={16} className="text-slate-300" />
               </div>
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Account Trust</p>
               <p className="text-3xl font-black text-slate-900 italic">Level 1</p>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Hero Dish</label>
                <input 
                  type="text" 
                  placeholder="Spicy Buff Momos" 
                  value={formData.dishName}
                  onChange={e => setFormData({...formData, dishName: e.target.value})}
                  className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 placeholder:text-slate-300 font-black italic focus:ring-2 focus:ring-orange-600 transition-all text-slate-800"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Category</label>
                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                  {categories.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setFormData({...formData, category: cat})}
                      className={cn(
                        "px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                        formData.category === cat ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-400"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Price (Rs.)</label>
                  <input 
                    type="number" 
                    placeholder="250" 
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 placeholder:text-slate-300 font-black italic focus:ring-2 focus:ring-orange-600 transition-all text-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Spice Level</label>
                  <select 
                    value={formData.spiceLevel}
                    onChange={e => setFormData({...formData, spiceLevel: e.target.value as any})}
                    className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 font-black italic focus:ring-2 focus:ring-orange-600 transition-all text-slate-800"
                  >
                    <option value="mild">Mild (🌶️)</option>
                    <option value="medium">Medium (🌶️🌶️)</option>
                    <option value="hot">Hot (🌶️🌶️🌶️)</option>
                    <option value="extra-hot">Extra (🌶️💀)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Dietary</label>
                   <div className="flex bg-slate-100 p-1 rounded-2xl">
                     <button 
                        onClick={() => setFormData({...formData, isVeg: true})}
                        className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all", formData.isVeg ? "bg-green-500 text-white" : "text-slate-400")}
                     >
                       VEG
                     </button>
                     <button 
                        onClick={() => setFormData({...formData, isVeg: false})}
                        className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all", !formData.isVeg ? "bg-red-500 text-white" : "text-slate-400")}
                     >
                       NON-VEG
                     </button>
                   </div>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">WhatsApp #</label>
                   <input 
                     type="text" 
                     placeholder="98XXXXXXXX" 
                     value={formData.whatsappNumber}
                     onChange={e => setFormData({...formData, whatsappNumber: e.target.value})}
                     className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 placeholder:text-slate-300 font-black italic focus:ring-2 focus:ring-orange-600 transition-all text-slate-800"
                   />
                 </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Narrative (Menu notes)</label>
                <textarea 
                  placeholder="Authentic Dharan Buff Momos, served with roasted tomato chutney..." 
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 placeholder:text-slate-300 font-medium italic focus:ring-2 focus:ring-orange-600 transition-all text-slate-800 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Signal Duration</label>
                <div className="flex gap-4">
                  {['2', '4', '6', '8'].map(h => (
                    <button 
                      key={h}
                      onClick={() => setFormData({...formData, duration: h})}
                      className={cn(
                        "flex-1 py-4 rounded-2xl font-black italic text-sm transition-all border",
                        formData.duration === h ? "bg-orange-100 border-orange-500 text-orange-600" : "bg-slate-50 border-slate-100 text-slate-400"
                      )}
                    >
                      {h} HR
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error messaging */}
            {!userLocation && (
              <div className="p-5 bg-red-50 rounded-3xl flex gap-4 text-red-600 border border-red-100 shadow-xl shadow-red-100">
                 <AlertCircle size={24} className="shrink-0" />
                 <p className="text-[11px] font-black uppercase tracking-widest leading-relaxed">
                   Signal Interference: No GPS coordinate found. Please unlock location services to launch.
                 </p>
              </div>
            )}

            <button 
              onClick={handleGoLive}
              disabled={!formData.dishName || !formData.price || !userLocation || loading}
              className="w-full bg-slate-900 text-white rounded-[2.5rem] py-6 font-black text-xl uppercase tracking-[0.2em] shadow-2xl shadow-slate-300/50 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-3 italic"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Launch Signal.'}
            </button>
          </motion.div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-10"
        >
          {/* Active Status Display */}
          <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl shadow-orange-200 border-8 border-orange-500/10 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-100 rounded-full -mr-32 -mt-32 animate-pulse" />
            
            <div className="w-28 h-28 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white mb-8 relative z-10 shadow-2xl transform hover:rotate-3 transition-transform">
              <Flame size={56} className="text-orange-500 animate-bounce" />
            </div>
            
            <h3 className="text-4xl font-black text-slate-900 mb-2 italic tracking-tight">Broadcasting.</h3>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-10">Live on the grid</p>
            
            <div className="grid grid-cols-2 gap-6 w-full relative z-10 mb-8">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div className="flex justify-center mb-2"><Users size={20} className="text-slate-300" /></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Signal Views</p>
                <p className="text-3xl font-black text-slate-900 italic">{activeSession?.viewCount || 0}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div className="flex justify-center mb-2"><MessageSquare size={20} className="text-green-400" /></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">WhatsApp Taps</p>
                <p className="text-3xl font-black text-slate-900 italic">{activeSession?.whatsappTaps || 0}</p>
              </div>
            </div>

            <div className="w-full bg-orange-500/5 p-6 rounded-[2.5rem] border border-orange-500/10 text-left">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                   <Clock size={24} className="text-orange-600" />
                 </div>
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Broadcast ends at</p>
                   <p className="text-lg font-black text-slate-900 italic">
                     {activeSession ? new Date(activeSession.closesAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                   </p>
                 </div>
              </div>
              <button 
                onClick={handleExtend}
                disabled={loading || (activeSession?.extensionCount || 0) >= 2}
                className="w-full py-4 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-100 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : `⏱️ Extend 1 Hour (${2 - (activeSession?.extensionCount || 0)} left)`}
              </button>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] flex items-center justify-between shadow-2xl text-white">
            <div className="flex items-center gap-6 flex-1">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 italic font-black text-orange-500 shrink-0">
                FLR.
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em] mb-1">Active Dish</p>
                {isEditing ? (
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      value={editData.dishName}
                      onChange={e => setEditData({...editData, dishName: e.target.value})}
                      className="w-full bg-white/10 border-none rounded-xl px-4 py-2 text-white font-black italic text-lg focus:ring-1 focus:ring-orange-500"
                    />
                    <div className="flex gap-2">
                       <input 
                        type="number" 
                        value={editData.price}
                        onChange={e => setEditData({...editData, price: e.target.value})}
                        className="w-24 bg-white/10 border-none rounded-xl px-4 py-2 text-white font-black italic text-sm focus:ring-1 focus:ring-orange-500"
                        placeholder="Price"
                      />
                      <button 
                        onClick={handleUpdateDetails}
                        className="bg-orange-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                      >
                        X
                      </button>
                    </div>
                    <textarea 
                      value={editData.description}
                      onChange={e => setEditData({...editData, description: e.target.value})}
                      className="w-full bg-white/10 border-none rounded-xl px-4 py-2 text-white font-medium italic text-xs focus:ring-1 focus:ring-orange-500 resize-none"
                      placeholder="Special instructions..."
                      rows={2}
                    />
                  </div>
                ) : (
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <p className="text-xl font-black italic truncate">{editData.dishName}</p>
                      <p className="text-sm font-bold text-orange-400 mt-1">Rs. {editData.price}</p>
                    </div>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button 
            onClick={handleEndFlare}
            disabled={loading}
            className="w-full bg-white border-2 border-slate-100 text-slate-400 rounded-[2rem] py-6 font-black uppercase tracking-[0.2em] hover:text-red-500 hover:border-red-500 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Terminate Broadcast.'}
          </button>
        </motion.div>
      )}
    </div>
  );
}
