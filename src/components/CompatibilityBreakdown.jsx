import React, { useState } from 'react';
import CompatibilityFactorItem from './CompatibilityFactorItem';
import { ChevronDown, ChevronUp, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function CompatibilityBreakdown({ breakdown }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const factors = Array.isArray(breakdown?.factors) ? breakdown.factors : [];
  const score = Number.isFinite(breakdown?.score) ? breakdown.score : 0;

  const strongestFactors = factors.filter(f => f.matchLevel === 'Strong Match').slice(0, 2);
  const conflicts = factors.filter(f => f.matchLevel === 'Conflict');
  const summaryCount = (strongestFactors.length > 0 ? 1 : 0) + (conflicts.length > 0 ? 1 : 0);

  return (
    <div className="glass-panel overflow-hidden border-primary/20">
      <div className="p-8 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <ShieldCheck size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-mainText">Compatibility Breakdown</h3>
              <p className="text-xs font-bold text-mainText/30 uppercase tracking-widest">Transparency Report</p>
            </div>
          </div>
          <div className="text-right shrink-0">
             <div className="text-3xl font-display font-bold text-primary">{score}%</div>
             <p className="text-[10px] font-black text-mainText/20 uppercase tracking-[0.2em]">Overall Confidence</p>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 gap-4 mb-6 ${
            summaryCount > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1 md:max-w-sm'
          }`}
        >
           {strongestFactors.length > 0 && (
             <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100/50 flex items-start gap-3">
                <Zap size={18} className="text-green-500 shrink-0 mt-0.5" />
                <div>
                   <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Strongest Link</p>
                   <p className="text-xs font-bold text-mainText/70">{strongestFactors[0].factor}</p>
                </div>
             </div>
           )}
           {conflicts.length > 0 && (
             <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100/50 flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                   <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Potential Friction</p>
                   <p className="text-xs font-bold text-mainText/70">{conflicts[0].factor}</p>
                </div>
             </div>
           )}
        </div>

        <div className="space-y-1">
           {factors.slice(0, 3).map((factor) => (
             <CompatibilityFactorItem key={factor.factor} {...factor} />
           ))}
        </div>

        {factors.length > 3 && (
          <>
            {isExpanded && (
              <div className="space-y-2 animate-fade-in mt-2">
                {factors.slice(3).map((factor) => (
                  <CompatibilityFactorItem key={factor.factor} {...factor} />
                ))}
              </div>
            )}
            
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full mt-8 py-4 border-2 border-primary/10 rounded-2xl text-xs font-bold text-primary flex items-center justify-center gap-2 hover:bg-primary/5 transition-all"
            >
              {isExpanded ? (
                <><ChevronUp size={16} /> Hide Detailed Factors</>
              ) : (
                <><ChevronDown size={16} /> View All {factors.length} Compatibility Factors</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
