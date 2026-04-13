import React from 'react';
import { CheckCircle2, XCircle, Clock, Zap, Home, Sofa, Users } from 'lucide-react';
import CompatibilityProgressBar from './CompatibilityProgressBar';

export default function ComparisonIndicator({ type, value, label }) {
  const renderIndicator = () => {
    switch (type) {
      case 'price':
        return (
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-mainText">£{value}</span>
            <span className="text-xs text-mainText/40">/mo</span>
          </div>
        );
      case 'score':
        return <CompatibilityProgressBar score={value} />;
      case 'boolean':
        return value ? (
          <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs uppercase tracking-widest">
            <CheckCircle2 size={16} /> Yes
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs uppercase tracking-widest">
            <XCircle size={16} /> No
          </div>
        );
      case 'time':
        return (
          <div className="flex items-center gap-2 text-mainText font-bold">
            <Clock size={16} className="text-primary" />
            {value} mins
          </div>
        );
      case 'text':
        return <span className="text-sm font-bold text-mainText capitalize">{value}</span>;
      default:
        return <span className="text-sm font-medium text-mainText/60">{value}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-[10px] uppercase font-bold text-mainText/20 tracking-widest">{label}</span>}
      {renderIndicator()}
    </div>
  );
}
