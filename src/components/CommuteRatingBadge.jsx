import React from 'react';

export default function CommuteRatingBadge({ rating }) {
  if (!rating) return null;
  
  return (
    <div className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${rating.bg} ${rating.color} border border-current/10`}>
      {rating.label} Commute
    </div>
  );
}
