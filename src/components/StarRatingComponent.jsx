import React, { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRatingComponent({ rating, setRating, readOnly = false }) {
  const [hoverRating, setHoverRating] = useState(0);

  const getStarLabel = (val) => {
    switch (val) {
      case 1: return "Very poor match";
      case 2: return "Poor match";
      case 3: return "Moderate match";
      case 4: return "Good match";
      case 5: return "Excellent match";
      default: return "";
    }
  };

  const currentDisplay = hoverRating || rating;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => setRating(star)}
            onMouseEnter={() => !readOnly && setHoverRating(star)}
            onMouseLeave={() => !readOnly && setHoverRating(0)}
            className={`transition-all duration-300 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
          >
            <Star 
              size={36} 
              className={`transition-colors duration-300 ${star <= currentDisplay ? 'fill-yellow-400 text-yellow-500' : 'fill-transparent text-gray-200'}`} 
            />
          </button>
        ))}
      </div>
      
      <div className="h-6">
        {currentDisplay > 0 && (
          <span className="text-sm font-bold text-mainText/40 uppercase tracking-widest animate-fade-in">
            {getStarLabel(currentDisplay)}
          </span>
        )}
      </div>
    </div>
  );
}
