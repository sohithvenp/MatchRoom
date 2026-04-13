import React from 'react';
import LifestyleTagButton from './LifestyleTagButton';
import { LIFESTYLE_TAGS, getStudentIdealTags } from '../utils/lifestyleTags';
import { CheckCircle2 } from 'lucide-react';

export default function CompatibilityTagMatcher({ propertyTags = [], studentPrefs }) {
  if (!propertyTags || propertyTags.length === 0) return null;

  const idealTags = getStudentIdealTags(studentPrefs);
  
  // Get full tag objects for the ones this property has
  const propertyTagObjects = propertyTags.map(id => LIFESTYLE_TAGS.find(t => t.id === id)).filter(Boolean);

  const matchedTags = propertyTagObjects.filter(tag => idealTags.includes(tag.id));
  const otherTags = propertyTagObjects.filter(tag => !idealTags.includes(tag.id));

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-mainText/40 uppercase tracking-widest mb-3">Lifestyle Environment</h4>
      
      {matchedTags.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-green-600 uppercase tracking-wider mb-2">
            <CheckCircle2 size={14} /> Preference Matches
          </div>
          <div className="flex flex-wrap gap-2">
            {matchedTags.map(tag => (
              <LifestyleTagButton
                key={tag.id}
                tag={tag}
                readOnly={true}
                highlightMatch={true}
              />
            ))}
          </div>
        </div>
      )}

      {otherTags.length > 0 && (
        <div className="space-y-2">
          {matchedTags.length > 0 && (
            <div className="text-xs font-bold text-mainText/30 uppercase tracking-wider mb-2">
              Other Property Tags
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {otherTags.map(tag => (
              <LifestyleTagButton
                key={tag.id}
                tag={tag}
                readOnly={true}
                highlightMatch={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
