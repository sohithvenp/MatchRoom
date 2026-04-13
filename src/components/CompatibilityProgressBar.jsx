import React from 'react';

export default function CompatibilityProgressBar({ score }) {
  const getProgressColor = () => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] font-bold text-mainText/30 uppercase tracking-widest">Compatibility</span>
        <span className="text-[10px] font-bold text-mainText/60">{score}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getProgressColor()} transition-all duration-1000 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
