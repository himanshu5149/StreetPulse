import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { VendorSession } from '../types';
import { MapPin, Clock, Navigation, Search, X, Navigation2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

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
}

const CustomMarker = ({ session, ...props }: { session: VendorSession, key?: string }) => {
  const icon = L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="relative w-12 h-12 flex items-center justify-center group cursor-pointer">
        <div class="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-20"></div>
        <div class="relative w-12 h-12 bg-orange-600 border-4 border-white rounded-full shadow-lg flex items-center justify-center text-white overflow-hidden transform transition-transform group-hover:scale-110">
          ${session.photoUrl ? `<img src="${session.photoUrl}" class="w-full h-full object-cover" />` : '<span class="text-xs font-bold italic text-[8px]">FLARE.</span>'}
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });

  return (
    <Marker position={[session.location.lat, session.location.lng]} icon={icon}>
      <Popup className="food-popup" closeButton={false}>
        <div className="w-72 -m-px overflow-hidden rounded-3xl bg-white shadow-2xl font-sans border border-slate-100">
          {session.photoUrl && (
            <img src={session.photoUrl} alt={session.dishName} className="w-full h-40 object-cover" />
          )}
          <div className="p-6">
            <div className="mb-4">
               <div className="px-3 py-1 bg-orange-500 text-white text-[10px] font-black uppercase rounded-full tracking-wider inline-block mb-2">Active Now</div>
               <h3 className="text-xl font-black text-slate-900 leading-tight">{session.dishName}</h3>
               <p className="text-sm text-slate-400 font-bold italic">{session.vendorName}</p>
            </div>
            
            <p className="text-sm text-slate-600 mb-6 italic leading-relaxed font-medium">"{session.description}"</p>
            
            <div className="flex items-center gap-4 text-[11px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-50 pt-5">
              <div className="flex items-center gap-2 text-orange-600">
                <Clock size={14} strokeWidth={2.5} />
                <span>-{formatDistanceToNow(new Date(session.closesAt))}</span>
              </div>
              <div className="bg-slate-900 text-white px-3 py-1 rounded-lg text-lg font-black ml-auto italic">
                ${session.price}
              </div>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

// Component to handle auto-zooming to show all markers
function ChangeView({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [100, 100] });
    }
  }, [bounds, map]);
  return null;
}

export default function MapDiscovery({ sessions }: MapDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationName, setLocationName] = useState('Detecting...');

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => 
      s.dishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [sessions, searchQuery]);

  useEffect(() => {
    if (sessions.length > 0) {
      const { lat, lng } = sessions[0].location;
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`)
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
        .catch(() => setLocationName('Active Zone'));
    }
  }, [sessions]);

  const defaultCenter: L.LatLngExpression = sessions.length > 0 
    ? [sessions[0].location.lat, sessions[0].location.lng] 
    : [40.7128, -74.0060];

  const bounds = L.latLngBounds(filteredSessions.length > 0 
    ? filteredSessions.map(s => [s.location.lat, s.location.lng] as L.LatLngExpression)
    : sessions.map(s => [s.location.lat, s.location.lng] as L.LatLngExpression)
  );

  return (
    <div className="h-full w-full relative">
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        className="h-full w-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filteredSessions.map(session => (
          <CustomMarker key={session.id} session={session} />
        ))}
        {filteredSessions.length > 0 && <ChangeView bounds={bounds} />}
        <ZoomControl position="bottomright" />
      </MapContainer>

      {/* Floating Header Controls */}
      <div className="absolute top-8 inset-x-8 z-[400] flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-none">
        {/* Location Display */}
        <div className="flex items-center gap-4 bg-white/90 backdrop-blur-md p-2 pl-2 pr-6 rounded-2xl border border-white shadow-xl shadow-slate-200/50 pointer-events-auto">
           <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
             <Navigation2 size={20} className="rotate-45" />
           </div>
           <div>
             <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Live Zone</p>
             <p className="text-sm font-black text-slate-900 leading-none italic">{locationName}</p>
           </div>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-96 relative pointer-events-auto">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={18} />
          </div>
          <input 
            type="text"
            placeholder="Search cravings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/90 backdrop-blur-md border border-white rounded-2xl pl-12 pr-12 py-4 shadow-xl shadow-slate-200/50 text-slate-900 font-bold italic placeholder:text-slate-300 focus:ring-2 focus:ring-orange-600 outline-none transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Floating Stats */}
      <div className="absolute top-8 right-8 z-[400] hidden lg:block">
        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full border border-white shadow-xl shadow-slate-200/50">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">{filteredSessions.length} Relevant Signals</p>
        </div>
      </div>
      
      {/* Discovery Cards (Horizontal Scroll at Bottom) */}
      <div className="absolute bottom-10 inset-x-0 z-[400] px-8 flex gap-6 overflow-x-auto pb-6 hide-scrollbar snap-x">
        {filteredSessions.length === 0 && searchQuery && (
           <div className="mx-auto bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-white shadow-xl flex flex-col items-center">
             <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">No Signals Found for "{searchQuery}"</p>
           </div>
        )}
        {filteredSessions.map(session => (
          <motion.div 
            key={session.id}
            whileHover={{ y: -6, scale: 1.02 }}
            className="snap-center shrink-0 w-[280px] bg-white rounded-3xl p-5 shadow-2xl shadow-slate-300/50 flex flex-col gap-4 cursor-pointer border border-slate-50"
          >
            <div className="flex justify-between items-start">
               <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border-2 border-orange-100 shadow-inner">
                  {session.photoUrl ? <img src={session.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300 font-black italic text-[8px]">NO IMG</div>}
               </div>
               <div className="text-right">
                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Live Now</span>
                  <p className="text-lg font-black text-slate-900 italic leading-none mt-1">${session.price}</p>
               </div>
            </div>
            <div>
               <h4 className="font-black text-slate-900 text-lg leading-tight truncate italic">{session.dishName}</h4>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{session.vendorName}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: '75%' }}
                  className="h-full bg-orange-600 rounded-full" 
                />
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase">Closes Soon</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

