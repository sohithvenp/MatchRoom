import React from 'react';
import CompatibilityProgressBar from './CompatibilityProgressBar';
import { Sparkles } from 'lucide-react';

export default function CompatibilityScoreCard({ score }) {
  const getSubtext = () => {
    if (score >= 90) return "Exceptional Match";
    if (score >= 75) return "Great Candidate";
    if (score >= 50) return "Potential Fit";
    return "Low Initial Match";
  };

  return (
    <div className="glass-panel p-8 bg-mainText border-0 text-white relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-12 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles size={18} className="text-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Algorithmic Confidence</span>
        </div>

        <div className="flex items-end justify-between mb-8">
           <div className="text-6xl font-display font-bold text-white tracking-tighter">
             {score}<span className="text-2xl text-primary">%</span>
           </div>
           <div className="text-right pb-1">
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Status</p>
              <p className="text-lg font-bold text-primary leading-none">{getSubtext()}</p>
           </div>
        </div>

        <div className="space-y-4">
           <CompatibilityProgressBar score={score} />
           <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest text-center">
             Calculated across 8 unique lifestyle dimensions
           </p>
        </div>
      </div>
    </div>
  );
}
