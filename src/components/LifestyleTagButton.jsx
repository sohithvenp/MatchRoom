import React, { useState } from 'react';
import { Info } from 'lucide-react';

export default function LifestyleTagButton({ 
  tag, 
  selected, 
  onClick, 
  readOnly = false,
  highlightMatch = false 
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  let baseClasses = "relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border-2 select-none ";
  
  if (readOnly) {
    if (highlightMatch) {
      baseClasses += "border-green-500 bg-green-50 text-green-700 shadow-sm ";
    } else {
      baseClasses += "border-gray-100 bg-white text-mainText/60 ";
    }
  } else {
    if (selected) {
      baseClasses += "border-primary bg-primary text-white shadow-md transform scale-[1.02] ";
    } else {
      baseClasses += "border-gray-100 bg-white text-mainText/60 hover:border-primary/30 hover:bg-primary/5 cursor-pointer ";
    }
  }

  return (
    <div 
      className="relative inline-block group"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div 
        className={baseClasses}
        onClick={!readOnly ? () => onClick(tag.id) : undefined}
      >
        <span>{tag.label}</span>
        
        {!readOnly && (
          <Info size={14} className={`${selected ? "text-white/80" : "text-mainText/30"}`} />
        )}
      </div>

      {showTooltip && (
        <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-gray-900 text-white text-xs rounded-xl shadow-xl animate-fade-in pointer-events-none">
          <p className="font-bold mb-1 text-sm">{tag.label}</p>
          <p className="text-gray-300 leading-relaxed">{tag.description}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}
