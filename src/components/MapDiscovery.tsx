import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { VendorSession } from '../types';
import { 
  MapPin, 
  Clock, 
  Navigation, 
  Search, 
  X, 
  Navigation2, 
  CheckCircle2, 
  MessageSquare, 
  Star, 
  Timer,
  ChefHat,
  ShoppingBag,
  Globe,
  TrendingUp,
  Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { sessionService } from '../services/sessionService';
import { auth } from '../firebase';

// Fix for Leaflet default icon issues in React
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapDiscoveryProps {
  sessions: VendorSession[];
  userLocation?: { lat: number, lng: number } | null;
}

const createCustomIcon = (session: VendorSession) => {
  const lastVerified = session.lastVerifiedAt ? new Date(session.lastVerifiedAt) : null;
  const now = new Date();
  
  let statusColor = 'bg-red-500';
  if (lastVerified) {
    const diffMinutes = (now.getTime() - lastVerified.getTime()) / 60000;
    if (diffMinutes < 20) statusColor = 'bg-green-500';
    else if (diffMinutes < 50) statusColor = 'bg-yellow-500';
  }

  const isPopular = session.viewCount > 15;

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="relative w-12 h-12 flex items-center justify-center group cursor-pointer">
        <div class="absolute inset-0 ${statusColor} rounded-full animate-ping opacity-20"></div>
        ${isPopular ? '<div class="absolute -top-1 -right-1 w-4 h-4 bg-orange-600 rounded-full border-2 border-white z-20 flex items-center justify-center shadow-md"><span class="text-[8px] text-white">🔥</span></div>' : ''}
        <div class="relative w-12 h-12 ${statusColor} border-4 border-white rounded-full shadow-lg flex items-center justify-center text-white overflow-hidden transform transition-transform group-hover:scale-110">
          ${session.photoUrl ? `<img src="${session.photoUrl}" class="w-full h-full object-cover" />` : '<span class="text-xs font-black italic text-[10px]">FLR.</span>'}
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
};

function MapController({ center, bounds, initialCenter }: { center?: L.LatLngExpression, bounds?: L.LatLngBounds, initialCenter?: L.LatLngExpression }) {
  const map = useMap();
  const [hasSetInitial, setHasSetInitial] = useState(false);

  useEffect(() => {
    if (initialCenter && !hasSetInitial) {
      map.setView(initialCenter, 13);
      setHasSetInitial(true);
    }
  }, [initialCenter, map, hasSetInitial]);

  useEffect(() => {
    if (center) {
      map.setView(center, 15, { animate: true });
    } else if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [100, 100], animate: true });
    }
  }, [center, bounds, map]);
  return null;
}

const handleWhatsApp = async (session: VendorSession) => {
  if (!session.whatsappNumber) return;
  await sessionService.trackWhatsAppTap(session.id);
  const text = `Hi! I saw your flare on StreetPulse. Are you still at ${session.vendorName}?`;
  
  // Clean the number - preserve international (+) if present
  let cleanNumber = session.whatsappNumber.replace(/[^\d+]/g, '');
  
  // If it doesn't start with +, add it if it looks like a long number, or handle as local
  if (!cleanNumber.startsWith('+')) {
    // Basic heuristic: if it's 10 digits without a country code, it might be local.
    // However, in a truly global app, we should encourage vendors to include the country code.
    // For this demo, we'll prefix with 977 only if it's exactly 10 digits and doesn't look like it has a code.
    if (cleanNumber.length === 10) {
      cleanNumber = `977${cleanNumber}`;
    }
  } else {
    // Remove the + for the wa.me URL as it's not strictly needed but often cleaner without
    cleanNumber = cleanNumber.substring(1);
  }
  
  window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`, '_blank');
};

const CustomMarker = ({ session }: { session: VendorSession, key?: string }) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isClosingSoon, setIsClosingSoon] = useState(false);
  const isOwner = auth.currentUser?.uid === session.vendorId;

  // Google Maps inspired "Live Viewers" logic
  const liveViewers = useMemo(() => Math.floor(Math.random() * 8) + 2, []);

  useEffect(() => {
    const updateCountdown = () => {
      const end = new Date(session.closesAt);
      const now = new Date();
      const diff = end.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Closed');
        return;
      }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeRemaining(`${h}h ${m}m`);
      setIsClosingSoon(diff < 1800000);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
    return () => clearInterval(timer);
  }, [session.closesAt]);

  const handleVerify = async () => {
    if (!auth.currentUser) {
      alert("Please log in to verify food availability.");
      return;
    }
    await sessionService.verifySession(session.id, auth.currentUser.uid);
  };

  const handleRate = async (score: number) => {
    if (!auth.currentUser) {
      alert("Please log in to rate this vendor.");
      return;
    }
    await sessionService.submitRating({
      sessionId: session.id,
      vendorId: session.vendorId,
      raterUID: auth.currentUser.uid,
      score
    });
  };

  const handlePopupOpen = async () => {
    await sessionService.trackView(session.id);
  };

  return (
    <Marker 
      position={[session.location.lat, session.location.lng]} 
      icon={createCustomIcon(session)}
      eventHandlers={{
        popupopen: handlePopupOpen
      }}
    >
      <Popup className="food-popup" closeButton={false}>
        <div className="w-80 -m-px overflow-hidden rounded-[2.5rem] bg-white shadow-2xl font-sans border border-slate-100 p-6 space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h3 className="text-xl font-black text-slate-900 leading-tight italic">{session.dishName}</h3>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                <ChefHat size={12} /> {session.vendorName}
              </p>
            </div>
            <div className="bg-orange-100 px-3 py-1 rounded-full text-orange-600 font-black text-sm italic">
              {session.currency || 'Rs.'}{session.price}
            </div>
          </div>

          <div className="flex items-center gap-3 bg-blue-50 py-2.5 px-4 rounded-2xl">
             <Users size={14} className="text-blue-500 animate-pulse" />
             <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
               {liveViewers} people looking right now
             </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest">
            {session.category && <span className="bg-slate-900 text-white px-2 py-1 rounded-lg">{session.category}</span>}
            {session.isVeg !== undefined && <span className={cn("px-2 py-1 rounded-lg", session.isVeg ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>{session.isVeg ? 'Veg' : 'Non-Veg'}</span>}
            {session.spiceLevel && <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-lg">🌶️ {session.spiceLevel}</span>}
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 p-3 bg-slate-50 rounded-2xl">
            <div className="flex items-center gap-2">
              <Timer size={14} className={cn(isClosingSoon && "text-red-500 animate-pulse")} />
              <span className={cn(isClosingSoon && "text-red-500 font-black")}>Closing in {timeRemaining}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-green-500" />
              <span>{session.verificationCount} confirmed</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleVerify}
              disabled={auth.currentUser && session.verifiedBy.includes(auth.currentUser.uid)}
              className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              <CheckCircle2 size={14} /> Still Here?
            </button>
            <button 
              onClick={() => handleWhatsApp(session)}
              className="flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              <MessageSquare size={14} /> WhatsApp
            </button>
          </div>

          <div className="pt-2 border-t border-slate-50">
            <div className="flex justify-between gap-2">
              <button onClick={() => handleRate(3)} className="bg-orange-50 hover:bg-orange-100 p-3 rounded-2xl flex-1 text-center transition-colors">🔥 <span className="block text-[8px] font-black uppercase mt-1">Great</span></button>
              <button onClick={() => handleRate(2)} className="bg-blue-50 hover:bg-blue-100 p-3 rounded-2xl flex-1 text-center transition-colors">😐 <span className="block text-[8px] font-black uppercase mt-1">OK</span></button>
              <button onClick={() => handleRate(1)} className="bg-red-50 hover:bg-red-100 p-3 rounded-2xl flex-1 text-center transition-colors">👎 <span className="block text-[8px] font-black uppercase mt-1">Skip</span></button>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

export default function MapDiscovery({ sessions, userLocation }: MapDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<L.LatLngExpression | undefined>(undefined);
  const [locationName, setLocationName] = useState('Detecting...');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const initialCenter = useMemo<L.LatLngExpression>(() => {
    if (userLocation) return [userLocation.lat, userLocation.lng];
    if (sessions.length > 0) return [sessions[0].location.lat, sessions[0].location.lng];
    return [27.7, 85.3]; // Fallback to last known global hub or just stay neutral
  }, [userLocation, sessions]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    sessions.forEach(s => s.category && cats.add(s.category));
    return Array.from(cats);
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchSearch = (
        s.dishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const matchCat = !activeCategory || s.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [sessions, searchQuery, activeCategory]);

  const handleQuickSearch = (q: string) => {
    setLocationSearch(q);
    // Trigger submit-like behavior
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleLocationSearch(fakeEvent, q);
  };

  const handleLocationSearch = async (e: React.FormEvent, overrideQuery?: string) => {
    e.preventDefault();
    const query = overrideQuery || locationSearch;
    if (!query) return;
    
    setIsSearchingLocation(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=en&addressdetails=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, address } = data[0];
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
        
        const country = address.country;
        const city = address.city || address.town || address.village || address.state;
        setLocationName(city ? `${city}, ${country}` : country);
      }
    } catch (error) {
      console.error("Location search failed", error);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  useEffect(() => {
    if (sessions.length > 0 && !mapCenter) {
      const { lat, lng } = sessions[0].location;
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`)
        .then(res => res.json())
        .then(data => {
          const city = data.address.city || data.address.town || data.address.village;
          setLocationName(city || data.display_name.split(',')[0]);
        })
        .catch(() => setLocationName('Active Zone'));
    }
  }, [sessions]);

  const bounds = L.latLngBounds(filteredSessions.length > 0 
    ? filteredSessions.map(s => [s.location.lat, s.location.lng] as L.LatLngExpression)
    : sessions.map(s => [s.location.lat, s.location.lng] as L.LatLngExpression)
  );

  return (
    <div className="h-full w-full relative overflow-hidden">
      <MapContainer 
        center={initialCenter} 
        zoom={13} 
        className="h-full w-full z-0 grayscale-[0.05] contrast-[1.05] saturate-[1.1] brightness-[0.98]"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {filteredSessions.map(session => (
          <CustomMarker key={session.id} session={session} />
        ))}
        <MapController center={mapCenter} bounds={mapCenter ? undefined : bounds} initialCenter={initialCenter} />
        <ZoomControl position="topright" />
      </MapContainer>

      {/* Header UI */}
      <div className="absolute top-6 inset-x-6 z-[400] space-y-4 pointer-events-none">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pointer-events-none">
          
          {/* Location Search Bar - Google Maps Style */}
          <form 
            onSubmit={handleLocationSearch}
            className="flex items-center gap-3 bg-white/95 backdrop-blur-md p-1.5 pr-2 rounded-full border-2 border-white shadow-2xl pointer-events-auto w-full md:w-auto"
          >
             <div className="w-11 h-11 bg-slate-900 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg">
               <Globe size={18} className={isSearchingLocation ? "animate-spin" : ""} />
             </div>
             <input 
               type="text"
               placeholder="Search country or city..."
               value={locationSearch}
               onChange={(e) => setLocationSearch(e.target.value)}
               className="bg-transparent border-none outline-none text-xs font-black italic text-slate-800 placeholder:text-slate-300 w-full md:w-56 px-1 pointer-events-auto"
             />
             <button 
               type="submit"
               disabled={isSearchingLocation}
               className="w-10 h-10 bg-slate-900 hover:bg-black rounded-full flex items-center justify-center text-white transition-all shadow-lg active:scale-95 shrink-0"
             >
               <Search size={16} />
             </button>
          </form>

          {/* Cravings Search */}
          <div className="w-full md:max-w-sm relative pointer-events-auto">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-600">
               <ChefHat size={18} />
            </div>
            <input 
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/95 border-2 border-white rounded-full pl-14 pr-12 py-4 shadow-2xl text-xs font-black italic focus:ring-4 focus:ring-orange-100 outline-none transition-all placeholder:text-slate-300 pointer-events-auto"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-300 pointer-events-auto"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 pointer-events-auto hide-scrollbar">
          <button 
            onClick={() => {
              if (userLocation) setMapCenter([userLocation.lat, userLocation.lng]);
            }}
            className="px-6 py-3 bg-white/95 text-slate-900 border-2 border-white rounded-full text-[10px] font-black uppercase tracking-widest italic shrink-0 shadow-lg hover:bg-slate-50 transition-all flex items-center gap-2 pointer-events-auto"
          >
            <Navigation2 size={12} className="text-orange-500" /> Near Me
          </button>
          <div className="w-px h-10 bg-slate-200/50 mx-2 shrink-0 pointer-events-none" />
          <button 
            onClick={() => setActiveCategory(null)}
            className={cn(
              "px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border-2 transition-all shrink-0 italic pointer-events-auto",
              !activeCategory ? "bg-orange-600 text-white border-orange-600 shadow-xl shadow-orange-100" : "bg-white/90 text-slate-400 border-white hover:border-orange-200"
            )}
          >
            All Signals
          </button>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border-2 transition-all shrink-0 italic pointer-events-auto",
                activeCategory === cat ? "bg-orange-600 text-white border-orange-600 shadow-xl shadow-orange-100" : "bg-white/90 text-slate-400 border-white hover:border-orange-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Insight - inspired by Google Maps Popularity */}
      <div className="absolute top-48 left-6 z-[400] hidden md:block pointer-events-none">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          id="insight-panel"
          className="bg-white/95 backdrop-blur-xl p-6 rounded-[2.5rem] text-slate-900 border-2 border-white shadow-2xl space-y-4 w-60 pointer-events-auto hover:scale-105 transition-transform cursor-pointer"
          whileHover={{ y: -5 }}
          onClick={() => alert("This shows the predicted crowds at this location based on past Flare signals.")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                <TrendingUp size={16} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest italic text-slate-400">Street Pulse</p>
            </div>
            <div className="px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-[8px] font-black uppercase">Live</div>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-black italic leading-tight text-orange-600 animate-pulse drop-shadow-sm">High Density</p>
            <p className="text-[10px] font-bold text-slate-400 italic">Expected peak: 6 PM - 8 PM</p>
          </div>

          <div className="pt-2">
            <div className="flex items-end gap-1 h-12">
               {[30, 45, 60, 85, 100, 70, 40, 20].map((h, i) => (
                 <div 
                   key={i} 
                   className={cn(
                     "flex-1 rounded-t-sm transition-all duration-500",
                     i === 4 ? "bg-orange-600" : "bg-slate-200"
                   )}
                   style={{ height: `${h}%` }}
                 />
               ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Locate Me Button */}
      <button 
        onClick={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
              setMapCenter([pos.coords.latitude, pos.coords.longitude]);
            }, (err) => {
              alert("Please enable location services in your browser settings to use this feature.");
            });
          }
        }}
        className="absolute bottom-80 right-6 z-[400] w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white text-slate-900 hover:bg-slate-50 transition-all active:scale-90 pointer-events-auto"
      >
        <Navigation size={24} className="fill-slate-900" />
      </button>
      
      {/* Bottom Horizontal Cards */}
      <div className="absolute bottom-10 inset-x-0 z-[400] pointer-events-none">
        <div className="px-8 flex gap-6 overflow-x-auto pb-6 hide-scrollbar snap-x pointer-events-auto">
          {filteredSessions.map(session => (
            <motion.div 
              key={session.id}
              whileHover={{ y: -8, scale: 1.02 }}
              onClick={() => setMapCenter([session.location.lat, session.location.lng])}
              className="snap-center shrink-0 w-[280px] bg-white rounded-[3rem] p-6 shadow-2xl flex flex-col gap-4 cursor-pointer border-2 border-transparent hover:border-orange-100 transition-all pointer-events-auto"
            >
              <div className="flex justify-between items-start">
                <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border-4 border-slate-50 shadow-inner">
                  {session.photoUrl ? <img src={session.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200"><ChefHat size={24} /></div>}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <div className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Live</span>
                  </div>
                  <p className="text-xl font-black text-slate-900 italic leading-none mt-1">{session.currency || 'Rs.'}{session.price}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-black text-slate-900 text-lg leading-tight truncate italic">{session.dishName}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{session.vendorName}</p>
              </div>

              <div className="flex items-center justify-between text-[10px] font-black">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-slate-900 font-black"><CheckCircle2 size={12} className="text-green-500" /> {session.verificationCount}</div>
                  <div className="flex items-center gap-1 text-slate-900 font-black"><Star size={12} className="text-orange-400 fill-orange-400" /> 5.0</div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWhatsApp(session);
                  }}
                  className="bg-green-500 text-white px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-green-600 transition-colors shadow-lg shadow-green-100"
                >
                  <MessageSquare size={12} /> WhatsApp
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
