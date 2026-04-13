import React from 'react';

export default function CompatibilityBadge({ score }) {
  const getBadgeColor = () => {
    if (score >= 90) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 70) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (score >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  return (
    <div className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getBadgeColor()} flex items-center gap-1.5 uppercase tracking-wider`}>
      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
      Match: {score}%
    </div>
  );
}
