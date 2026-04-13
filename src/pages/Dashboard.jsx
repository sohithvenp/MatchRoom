import { useEffect, useState } from 'react';
import { mockProperties } from '../utils/mockData';
import { rankPropertiesEngine } from '../utils/scoreCalculator';
import PropertyCard from '../components/PropertyCard';
import { Filter, Star, Search, Sparkles, BellRing, Settings2 } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import NotificationSettingsPanel from '../components/NotificationSettingsPanel';
import { normalizePropertyCurrency } from '../utils/currency';

export default function Dashboard() {
  const [rankedList, setRankedList] = useState([]);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [shortlist, setShortlist] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const fetchProperties = async () => {
      const constStr = localStorage.getItem('userProfile');
      let targetUser = constStr ? JSON.parse(constStr) : {
        lifestyle: { sleep: 3, cleanliness: 3, social: 3, study: 3, noise: 3 },
        budget: 800,
        commuteThreshold: 45
      };
      setUserProfile(targetUser);

      let allProperties = [...mockProperties].map(normalizePropertyCurrency);
      try {
        if (auth.app.options.apiKey === 'dummy-api-key') {
           const local = JSON.parse(localStorage.getItem('localProperties') || '[]');
           allProperties = [...allProperties, ...local.map(normalizePropertyCurrency)];
        } else {
           const snap = await getDocs(collection(db, 'properties'));
           const dbProps = snap.docs.map(doc => normalizePropertyCurrency({ id: doc.id, ...doc.data() }));
           allProperties = [...allProperties, ...dbProps];
        }
      } catch (err) {
        console.warn("Could not fetch properties from DB", err);
      }

      setTotalFiltered(allProperties.length);
      const results = rankPropertiesEngine(allProperties, targetUser, true);
      setRankedList(results);

      const stored = JSON.parse(localStorage.getItem('shortlisted') || '[]');
      setShortlist(stored);
    };

    fetchProperties();
  }, []);

  const handleShortlist = (id) => {
    let updated = shortlist.includes(id) ? shortlist.filter(i => i !== id) : [...shortlist, id];
    setShortlist(updated);
    localStorage.setItem('shortlisted', JSON.stringify(updated));
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
         <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-secondary" size={20} />
              <span className="text-sm font-bold text-secondary uppercase tracking-[0.2em]">Algorithmic Ranking</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 text-mainText leading-tight">
              Curated for your lifestyle.
            </h1>
            <p className="text-mainText/40 text-lg font-medium">
              We've filtered {totalFiltered} properties to find the best matches that meet your constraints and maximize your compatibility.
            </p>
         </div>
         <div className="flex gap-4 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
             <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mainText/30" />
             <input type="text" placeholder="Search areas..." className="input-field pl-12 py-3 text-sm" />
           </div>
           <button 
             onClick={() => setShowSettings(!showSettings)}
             className={`btn px-5 py-3 rounded-2xl ${showSettings ? 'btn-primary' : 'btn-secondary'}`}
           >
             <BellRing size={18} />
           </button>
           <button className="btn btn-secondary px-5 py-3 rounded-2xl">
             <Filter size={18} />
           </button>
         </div>
      </div>

      {showSettings && (
        <div className="mb-12 animate-slide-up">
           <NotificationSettingsPanel />
        </div>
      )}

      <div className="grid grid-cols-1 gap-10">
        {rankedList.length === 0 ? (
          <div className="glass-panel p-20 text-center border-dashed border-2 border-gray-100 bg-transparent">
            <Search className="mx-auto text-mainText/10 mb-6" size={64} />
            <h3 className="text-2xl font-bold text-mainText/40 mb-2">No Properties Found</h3>
            <p className="text-mainText/30 max-w-sm mx-auto">
              Your budget or commute limits are very tight. Try adjusting them in your profile to see more results.
            </p>
          </div>
        ) : (
          rankedList.map((property, idx) => (
             <PropertyCard 
               key={property.id} 
               property={property} 
               rank={idx + 1}
               onShortlist={handleShortlist}
               isShortlisted={shortlist.includes(property.id)}
             />
          ))
        )}
      </div>

      {shortlist.length > 0 && (
         <div className="fixed bottom-10 right-10 glass-panel px-6 py-4 flex items-center gap-4 z-50 shadow-2xl shadow-primary/20 animate-slide-up bg-white">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
               {shortlist.length}
            </div>
            <div>
               <p className="font-bold text-mainText">Shortlisted</p>
               <p className="text-xs text-mainText/40 font-medium tracking-wide font-display">READY TO COMPARE</p>
            </div>
         </div>
      )}
    </div>
  );
}
