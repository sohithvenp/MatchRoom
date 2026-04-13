import React from 'react';

export default function MatchIndicatorBadge({ type }) {
  const styles = {
    'Strong Match': 'bg-green-100 text-green-700 border-green-200',
    'Good Match': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Partial Match': 'bg-amber-100 text-amber-700 border-amber-200',
    'Compatible': 'bg-blue-100 text-blue-700 border-blue-200',
    'Conflict': 'bg-red-100 text-red-700 border-red-200',
    'Neutral': 'bg-gray-100 text-gray-600 border-gray-200'
  };

  const badgeType = type || 'Neutral';
  const styleClass = styles[badgeType] || styles['Neutral'];

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styleClass}`}>
      {badgeType}
    </span>
  );
}
