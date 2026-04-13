import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockProperties, mockUserPreferences } from '../utils/mockData';
import { resolveUserTargetCampus } from '../utils/campusContext';
import { calculatePropertyCompatibility } from '../utils/propertyMatching';
import { getCommuteData, saveCommuteToFirebase } from '../services/commuteService';
import { getShortlist, toggleShortlist } from '../services/shortlistService';
import PropertyCard from '../components/PropertyCard';
import { Heart, Scale, Trash2, ArrowRight, Layers } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { normalizePropertyCurrency } from '../utils/currency';

export default function ShortlistPage() {
  const navigate = useNavigate();
  const [shortlistedItems, setShortlistedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [sortBy, setSortBy] = useState('score');

  const sortedItems = [...shortlistedItems].sort((a, b) => {
    if (sortBy === 'score') return (b.compatibility?.score || 0) - (a.compatibility?.score || 0);
    if (sortBy === 'price') return a.price - b.price;
    return 0;
  });

  useEffect(() => {
    const fetchShortlistData = async () => {
      setLoading(true);
      const storedIds = await getShortlist();
      
      if (storedIds.length === 0) {
        setShortlistedItems([]);
        setLoading(false);
        return;
      }

      // 1. Fetch User Prefs and enforce profile
      let currentUserPrefs = mockUserPreferences;
      try {
        if (auth.app?.options?.apiKey === 'dummy-api-key') {
          const localProfile = JSON.parse(localStorage.getItem('userProfileData') || '{}');
          if (!localProfile.basicProfileComplete) {
            navigate('/profile');
            return;
          }
          const localUser = localStorage.getItem('userLifestyle');
          if (localUser) {
            const parsed = JSON.parse(localUser);
            if (parsed.lifestyle) currentUserPrefs = { ...currentUserPrefs, ...parsed.lifestyle };
          }
        } else if (auth.currentUser) {
          const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (!data.basicProfileComplete) {
              navigate('/profile');
              return;
            }
            const firePrefs = data.lifestylePreferences || data.lifestyle || {};
            currentUserPrefs = { ...currentUserPrefs, ...firePrefs };
          } else {
            navigate('/profile');
            return;
          }
        } else {
           navigate('/auth');
           return;
        }
      } catch (e) {}

      // 2. Fetch all properties to find the shortlisted ones
      let allProperties = [];
      try {
        const snap = await getDocs(collection(db, 'properties'));
        const dbProps = snap.docs.map(doc => normalizePropertyCurrency({ id: doc.id, ...doc.data() }));
        
        if (dbProps.length > 0) {
           allProperties = dbProps;
        } else {
           allProperties = [...mockProperties].map(normalizePropertyCurrency);
        }
      } catch (err) {
        allProperties = [...mockProperties].map(normalizePropertyCurrency);
      }

      const filtered = allProperties.filter(p => storedIds.includes(p.id));

      // 3. Process with scores and commute
      const targetCampus = await resolveUserTargetCampus();

      const processed = await Promise.all(filtered.map(async (property) => {
        const compatibility = calculatePropertyCompatibility(currentUserPrefs, property);
        const commute = await getCommuteData(
          { lat: property.lat, lng: property.lng },
          { lat: targetCampus.lat, lng: targetCampus.lng }
        );

        // SYNC TO FIREBASE
        if (auth.currentUser && commute) {
          saveCommuteToFirebase(
            auth.currentUser.uid,
            property.id,
            commute,
            { lat: property.lat, lng: property.lng },
            { lat: targetCampus.lat, lng: targetCampus.lng }
          );
        }

        return { 
          ...property, 
          compatibility, 
          commute: commute ? { ...commute, campusName: targetCampus.name } : null 
        };
      }));

      setShortlistedItems(processed);
      // Auto-prime compare with first two shortlisted properties for faster UX.
      if (processed.length >= 2) {
        setSelectedForCompare((prev) => (prev.length >= 2 ? prev : processed.slice(0, 2).map((p) => p.id)));
      } else {
        setSelectedForCompare([]);
      }
      setLoading(false);
    };

    fetchShortlistData();
  }, []);

  const handleRemove = async (id) => {
    const updated = await toggleShortlist(id);
    setShortlistedItems(shortlistedItems.filter(p => !updated.includes(id) ? p.id !== id : true));
    setSelectedForCompare(selectedForCompare.filter(i => updated.includes(id) ? true : i !== id));
  };

  const toggleSelectForCompare = (id) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter(i => i !== id));
    } else {
      if (selectedForCompare.length < 4) {
        setSelectedForCompare([...selectedForCompare, id]);
      } else {
        alert("You can compare up to 4 properties side-by-side.");
      }
    }
  };

  const startComparison = () => {
    const fallbackIds = shortlistedItems.slice(0, 4).map((p) => p.id);
    const idsToCompare = selectedForCompare.length >= 2 ? selectedForCompare : fallbackIds;

    if (idsToCompare.length < 2) {
      alert('Select at least 2 properties to compare.');
      return;
    }

    navigate('/compare', { state: { propertyIds: idsToCompare } });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const showCompareDock = selectedForCompare.length > 0;

  return (
    <div
      className={`max-w-6xl mx-auto px-6 py-12 animate-fade-in relative min-h-screen ${showCompareDock ? 'pb-44 md:pb-48' : ''}`}
    >
      <header className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Heart size={20} fill="currentColor" />
          </div>
          <span className="text-sm font-bold text-mainText/30 uppercase tracking-[0.2em]">Saved Assets</span>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-mainText mb-4 tracking-tight">My Shortlist</h1>
            <div className="flex items-center gap-4">
               <span className="text-xs font-bold text-mainText/30 uppercase tracking-widest">Sort By:</span>
               <button 
                 onClick={() => setSortBy('score')}
                 className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${sortBy === 'score' ? 'bg-primary text-white' : 'bg-gray-100 text-mainText/30'}`}
               >
                 Top Match
               </button>
               <button 
                 onClick={() => setSortBy('price')}
                 className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${sortBy === 'price' ? 'bg-primary text-white' : 'bg-gray-100 text-mainText/30'}`}
               >
                 Price
               </button>
            </div>
          </div>
          
          {shortlistedItems.length >= 2 && (
            <div className="glass-panel p-4 flex items-center gap-6 border-primary/20 bg-primary/5">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Comparison Ready</span>
                <span className="text-sm font-bold text-mainText">{selectedForCompare.length} properties selected</span>
              </div>
              <button 
                onClick={startComparison}
                disabled={selectedForCompare.length < 2}
                className={`btn btn-primary px-8 py-3 flex items-center gap-2 shadow-xl shadow-primary/20 ${selectedForCompare.length < 2 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
               >
                Compare Now <Scale size={18} />
              </button>
            </div>
          )}
        </div>
      </header>

      {shortlistedItems.length === 0 ? (
        <div className="glass-panel py-32 text-center border-dashed border-2 border-primary/10 bg-transparent flex flex-col items-center">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8">
            <Layers className="text-mainText/10" size={48} />
          </div>
          <h3 className="text-2xl font-bold text-mainText/40 mb-4 font-display">Your shortlist is empty</h3>
          <p className="text-mainText/30 max-w-sm mb-10 font-medium leading-relaxed">
            As you browse properties, click the heart icon to save them here for comparison.
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary px-10">
            Start Browsing Listings
          </button>
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-12 ${showCompareDock ? 'mb-4' : ''}`}>
          {sortedItems.map((property) => (
            <div key={property.id} className="flex items-center gap-6 group">
              {/* Selection UI */}
              <div className="flex flex-col items-center gap-3 shrink-0 py-4 animate-fade-in">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    id={`compare-${property.id}`}
                    checked={selectedForCompare.includes(property.id)}
                    onChange={() => toggleSelectForCompare(property.id)}
                    className="w-10 h-10 rounded-2xl border-2 border-gray-100 text-primary focus:ring-primary/20 cursor-pointer shadow-sm appearance-none bg-white checked:bg-primary checked:border-primary transition-all duration-300 relative after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-white after:font-bold after:opacity-0 checked:after:opacity-100 hover:border-primary/30 hover:shadow-md"
                  />
                  {selectedForCompare.includes(property.id) && (
                    <div className="absolute -inset-2 bg-primary/10 rounded-3xl -z-10 animate-pulse" />
                  )}
                </div>
                <label 
                  htmlFor={`compare-${property.id}`} 
                  className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors cursor-pointer ${selectedForCompare.includes(property.id) ? 'text-primary' : 'text-mainText/30'}`}
                >
                  {selectedForCompare.includes(property.id) ? 'Selected' : 'Compare'}
                </label>
              </div>

              {/* Card Container */}
              <div className="flex-1 relative">
                <div className={`absolute -inset-1 rounded-[2.5rem] transition-all duration-500 opacity-0 bg-gradient-to-r from-primary to-secondary blur group-hover:opacity-20 ${selectedForCompare.includes(property.id) ? 'opacity-30' : ''}`} />
                <div className="relative">
                  <PropertyCard 
                    property={property} 
                    onShortlist={() => handleRemove(property.id)}
                    isShortlisted={true}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Selection dock: same max-width as page so it aligns with cards; padding clears View Details */}
      {showCompareDock && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 bg-gradient-to-t from-background via-background/90 to-transparent">
          <div className="pointer-events-auto w-full max-w-6xl animate-slide-up">
            <div className="glass-panel px-4 py-4 sm:px-6 sm:py-5 bg-mainText text-white border border-white/10 shadow-2xl flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex -space-x-3 shrink-0">
                  {selectedForCompare.map((id) => {
                    const p = shortlistedItems.find((item) => item.id === id);
                    return p ? (
                      <img
                        key={id}
                        src={p.imageUrl}
                        alt=""
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-4 border-mainText object-cover shadow-lg hover:z-10 hover:scale-105 transition-transform"
                        title={p.propertyName}
                      />
                    ) : null;
                  })}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm tracking-wide truncate">
                    {selectedForCompare.length} / 4 Selected
                  </p>
                  <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">
                    Property Battle Royale
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 sm:ml-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedForCompare([])}
                  className="p-3 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Clear selection"
                >
                  <Trash2 size={20} />
                </button>
                <button
                  type="button"
                  disabled={selectedForCompare.length < 2}
                  onClick={startComparison}
                  className="bg-primary text-white px-5 sm:px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:grayscale disabled:pointer-events-none text-sm sm:text-base whitespace-nowrap"
                >
                  Compare Options <ArrowRight size={18} className="shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
