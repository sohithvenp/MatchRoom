import React from 'react';
import MatchIndicatorBadge from './MatchIndicatorBadge';
import { Info } from 'lucide-react';

export default function CompatibilityFactorItem({ factor, userValue, targetValue, studentValue, propertyValue, matchLevel, score, explanation }) {
  const val1 = userValue || studentValue;
  const val2 = targetValue || propertyValue;
  const derivedScore =
    Number.isFinite(score) && score >= 0
      ? score
      : matchLevel?.includes('Strong')
        ? 10
        : matchLevel?.includes('Partial')
          ? 6
          : matchLevel?.includes('Conflict')
            ? 2
            : 4;

  return (
    <div className="group border-b border-gray-100 last:border-0 py-4 transition-all hover:bg-gray-50/50 px-4 rounded-2xl">
      <div className="space-y-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-mainText text-sm truncate">{factor}</h4>
            <div className="relative group/tooltip">
              <Info size={14} className="text-mainText/20 hover:text-primary cursor-help transition-colors" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-mainText text-white text-[10px] rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 shadow-xl">
                Comparison: {val1} vs {val2}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-mainText"></div>
              </div>
            </div>
          </div>
          <p className="text-xs text-mainText/50 font-medium">
            {explanation}
          </p>
        </div>
        
        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-col items-start gap-1 text-left">
             <MatchIndicatorBadge type={matchLevel} />
             <span className="text-[10px] font-bold text-mainText/30 uppercase tracking-widest">+{derivedScore} pts</span>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-gray-100 flex items-center justify-center relative overflow-hidden">
            <div
              className={`absolute bottom-0 left-0 w-full transition-all duration-1000 ${
                matchLevel.includes('Conflict') ? 'bg-red-500/20' :
                matchLevel.includes('Strong') ? 'bg-green-500/20' : 'bg-primary/20'
              }`}
              style={{ height: `${Math.max(5, (derivedScore / 20) * 100)}%` }}
            />
            <span className="relative z-10 text-[10px] font-black text-mainText/60">
              {derivedScore}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
