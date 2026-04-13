import React from 'react';
import { Footprints, Bike, Bus, Car } from 'lucide-react';

export default function CommuteInfo({ commute, campusName, layout = 'compact' }) {
  if (!commute) return null;

  const { distance, modes } = commute;

  if (layout === 'compact') {
    return (
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-mainText/30 uppercase tracking-widest">Commute to {campusName}</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-mainText/70 font-semibold text-sm">
            <Bus size={14} className="text-primary" />
            {modes.transit} mins
          </div>
          <div className="text-mainText/30 text-xs font-medium">
            {distance} km distance
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-mainText/40 uppercase tracking-[0.2em]">Travel Time to {campusName}</h4>
        <div className="flex items-center gap-3">
          <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${commute.source === 'Google Maps API' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-mainText/30'}`}>
            {commute.source === 'Google Maps API' ? 'Live Routing' : 'Estimated'}
          </div>
          <div className="text-xs font-bold text-primary">{distance} km</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-gray-100 rounded-2xl flex flex-col items-center gap-2 shadow-sm">
          <Footprints size={20} className="text-mainText/40" />
          <span className="text-[10px] uppercase font-bold text-mainText/20">Walking</span>
          <span className="text-sm font-bold text-mainText">{modes.walking}m</span>
        </div>
        <div className="p-4 bg-white border border-gray-100 rounded-2xl flex flex-col items-center gap-2 shadow-sm">
          <Bike size={20} className="text-mainText/40" />
          <span className="text-[10px] uppercase font-bold text-mainText/20">Cycling</span>
          <span className="text-sm font-bold text-mainText">{modes.cycling}m</span>
        </div>
        <div className="p-4 bg-white border border-gray-100 rounded-2xl flex flex-col items-center gap-2 shadow-sm border-primary/20 bg-primary/5">
          <Bus size={20} className="text-primary" />
          <span className="text-[10px] uppercase font-bold text-primary/40">Public Transport</span>
          <span className="text-sm font-bold text-primary">{modes.transit}m</span>
        </div>
        <div className="p-4 bg-white border border-gray-100 rounded-2xl flex flex-col items-center gap-2 shadow-sm">
          <Car size={20} className="text-mainText/40" />
          <span className="text-[10px] uppercase font-bold text-mainText/20">Driving</span>
          <span className="text-sm font-bold text-mainText">{modes.driving}m</span>
        </div>
      </div>
    </div>
  );
}
