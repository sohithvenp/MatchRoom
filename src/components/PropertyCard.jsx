import { MapPin, Clock, Heart, Star, ChevronRight, CheckCircle2 } from 'lucide-react';
import CompatibilityBadge from './CompatibilityBadge';
import CompatibilityProgressBar from './CompatibilityProgressBar';
import { useNavigate } from 'react-router-dom';
import CommuteRatingBadge from './CommuteRatingBadge';
import CommuteInfo from './CommuteInfo';
import ShortlistButton from './ShortlistButton';
import { LIFESTYLE_TAGS } from '../utils/lifestyleTags';
import LifestyleTagButton from './LifestyleTagButton';

export default function PropertyCard({ property, onShortlist, isShortlisted }) {
  const navigate = useNavigate();
  const { score, matchReasons } = property.compatibility || { score: 0, matchReasons: [] };
  const isTopMatch = score >= 90;
  const campusName = property.commute?.campusName || "Campus";

  const lifestyleTagObjects = (property.lifestyleTags || [])
    .map(id => LIFESTYLE_TAGS.find(t => t.id === id))
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className={`glass-panel overflow-hidden flex flex-col lg:flex-row transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 group ${isTopMatch ? 'ring-2 ring-primary/20' : ''}`}>
      
      {/* Visual Section */}
      <div className="w-full lg:w-[380px] h-64 lg:h-auto relative overflow-hidden">
        <img 
          src={property.imageUrl} 
          alt={property.propertyName} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
        
        {/* Badges */}
        <div className="absolute top-6 left-6 flex flex-col gap-2">
          {isTopMatch && (
            <div className="bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-1.5 uppercase tracking-widest backdrop-blur-md">
              <Star size={12} fill="white" /> Top Match
            </div>
          )}
          <CompatibilityBadge score={score} />
          {property.commute && <CommuteRatingBadge rating={property.commute.rating} />}
        </div>

        <div className="absolute bottom-6 right-6">
          <ShortlistButton 
            isShortlisted={isShortlisted} 
            onClick={() => onShortlist(property.id)} 
          />
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-8 md:p-10 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
             <MapPin size={14} className="text-primary" />
             <span className="text-xs font-bold text-mainText/30 uppercase tracking-[0.2em]">{property.location}</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-display font-bold text-mainText mb-6 group-hover:text-primary transition-colors cursor-pointer" onClick={() => navigate(`/property/${property.id}`)}>
            {property.propertyName}
          </h3>
          
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-mainText/30 uppercase tracking-widest">Monthly Rent</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-display font-bold text-mainText">£{property.price}</span>
                <span className="text-sm font-medium text-mainText/40">/mo</span>
              </div>
            </div>
            <div className="space-y-4">
              <CommuteInfo commute={property.commute} campusName={campusName} layout="compact" />
            </div>
          </div>

          {lifestyleTagObjects.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-bold text-mainText/30 uppercase tracking-widest mb-3">Lifestyle Tags</p>
              <div className="flex flex-wrap gap-2">
                {lifestyleTagObjects.map(tag => (
                  <LifestyleTagButton key={tag.id} tag={tag} readOnly={true} />
                ))}
                {property.lifestyleTags?.length > 3 && (
                  <span className="text-xs font-bold text-mainText/40 flex items-center px-2 py-1 bg-gray-50 rounded-full border border-gray-100">+{property.lifestyleTags.length - 3}</span>
                )}
              </div>
            </div>
          )}

          <div className="mb-0 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <p className="text-[10px] font-bold text-mainText/30 uppercase tracking-widest mb-3">Key Match Reasons</p>
            <div className="space-y-2">
              {matchReasons.map((reason, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-mainText/70 font-medium">
                  <CheckCircle2 size={14} className="text-green-500" />
                  {reason}
                </div>
              ))}
              {matchReasons.length === 0 && (
                <div className="text-xs text-mainText/40 italic">Minimal matching preferences identified.</div>
              )}
            </div>
          </div>

          <button 
            onClick={() => navigate(`/property/${property.id}`)}
            className="mt-6 btn btn-primary w-full md:w-auto px-8 py-3.5 rounded-xl text-xs gap-2 group-hover:bg-primary group-hover:text-white transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20"
          >
            View Details <ChevronRight size={14} />
          </button>
        </div>
      </div>


    </div>
  );
}
