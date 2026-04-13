import React from 'react';
import LifestyleTagButton from './LifestyleTagButton';
import { LIFESTYLE_TAGS } from '../utils/lifestyleTags';

export default function LifestyleTagSelector({ selectedTags = [], onChange }) {
  const toggleTag = (tagId) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter(id => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {LIFESTYLE_TAGS.map(tag => (
          <LifestyleTagButton
            key={tag.id}
            tag={tag}
            selected={selectedTags.includes(tag.id)}
            onClick={toggleTag}
          />
        ))}
      </div>
      <p className="text-xs text-mainText/40 italic flex items-center gap-1">
        Select all that apply to accurately represent your property's environment.
      </p>
    </div>
  );
}
