import { useEffect, useState } from 'react';
import { mockProperties } from '../utils/mockData';
import PropertyCard from '../components/PropertyCard';
import { Bookmark, Clock } from 'lucide-react';

export default function Shortlisted() {
  const [shortlistItems, setShortlistItems] = useState([]);

  useEffect(() => {
    // 1. Fetch shortlist IDs from local storage
    const stored = JSON.parse(localStorage.getItem('shortlisted') || '[]');
    
    // 2. Filter mockProperties based on IDs
    // (In reality, we would fetch these from the Firebase matches collection)
    const filteredProps = mockProperties
        .filter(p => stored.includes(p.id))
        // we'll mock the scores so the UI cards don't break
        .map(p => ({
            ...p,
            compatibilityScore: 85,
            commuteScore: 70,
            normalizedRent: 50,
            finalScore: 23.5 
        }));

    setShortlistItems(filteredProps);
  }, []);

  const handleRemove = (id) => {
    const updated = shortlistItems.filter(p => p.id !== id);
    setShortlistItems(updated);
    
    const stored = JSON.parse(localStorage.getItem('shortlisted') || '[]');
    localStorage.setItem('shortlisted', JSON.stringify(stored.filter(i => i !== id)));
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-fade-in">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 flex items-center gap-4">
            <Bookmark className="text-primary" size={40} fill="currentColor"/> 
            Saved Properties
        </h1>
        <p className="text-mainText/50 text-lg">Your manually shortlisted properties for final review.</p>
      </div>

      <div className="flex flex-col gap-8 flex-1">
        {shortlistItems.length === 0 ? (
          <div className="glass-panel p-16 text-center border-dashed border-2 border-primary/20">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <Bookmark size={32} className="text-primary/50 absolute m-auto inset-0"/>
              <div className="w-1 h-24 bg-red-400/50 transform rotate-45 absolute" />
            </div>
            <h3 className="text-2xl font-bold text-mainText mb-2">No Shortlist Items</h3>
            <p className="text-mainText/50 max-w-sm mx-auto">
              You haven't saved any matched properties yet. Go back to the dashboard to start evaluating your optimized matches.
            </p>
          </div>
        ) : (
          shortlistItems.map((property, idx) => (
             <PropertyCard 
               key={property.id} 
               property={property} 
               rank={idx + 1}
               onShortlist={handleRemove}
               isShortlisted={true}
             />
          ))
        )}
      </div>
    </div>
  );
}
