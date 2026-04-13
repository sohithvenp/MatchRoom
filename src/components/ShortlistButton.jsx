import React from 'react';
import { Heart } from 'lucide-react';

export default function ShortlistButton({ isShortlisted, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`p-3 rounded-2xl transition-all duration-300 shadow-lg ${
        isShortlisted 
          ? 'bg-primary text-white scale-110 active:scale-95' 
          : 'bg-white text-mainText hover:bg-primary hover:text-white active:scale-95'
      } ${className}`}
    >
      <Heart size={20} fill={isShortlisted ? "white" : "none"} />
    </button>
  );
}
