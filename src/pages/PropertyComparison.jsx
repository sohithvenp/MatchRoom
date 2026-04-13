import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { mockProperties, mockUserPreferences } from '../utils/mockData';
import { resolveUserTargetCampus } from '../utils/campusContext';
import { calculatePropertyCompatibility } from '../utils/propertyMatching';
import { getCommuteData } from '../services/commuteService';
import ComparisonTable from '../components/ComparisonTable';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Scale, Sparkles, TrendingUp } from 'lucide-react';
import { normalizePropertyCurrency } from '../utils/currency';
import { exportToCSV } from '../services/exportService';

export default function PropertyComparisonPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [comparisonItems, setComparisonItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const propertyIds = location.state?.propertyIds || [];

  useEffect(() => {
    if (propertyIds.length < 2) {
      navigate('/shortlist');
      return;
    }

    const fetchComparisonData = async () => {
      setLoading(true);
      
      // 1. Fetch User Prefs
      let currentUserPrefs = mockUserPreferences;
      try {
        const localUser = localStorage.getItem('userLifestyle');
        if (localUser) {
          const parsed = JSON.parse(localUser);
          if (parsed.lifestyle) currentUserPrefs = { ...currentUserPrefs, ...parsed.lifestyle };
        } else if (auth.currentUser) {
          const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            const firePrefs = data.lifestylePreferences || data.lifestyle || {};
            currentUserPrefs = { ...currentUserPrefs, ...firePrefs };
          }
        }
      } catch (e) {}

      // 2. Fetch all properties
      let allProperties = [...mockProperties].map(normalizePropertyCurrency);
      try {
        const snap = await getDocs(collection(db, 'properties'));
        const dbProps = snap.docs.map(doc => normalizePropertyCurrency({ id: doc.id, ...doc.data() }));
        allProperties = [...allProperties, ...dbProps.filter(dbp => !mockProperties.find(mp => mp.id === dbp.id))];
      } catch (err) {}

      const filtered = allProperties.filter(p => propertyIds.includes(p.id));

      // 3. Process with scores and commute
      const targetCampus = await resolveUserTargetCampus();

      const processed = await Promise.all(filtered.map(async (property) => {
        const compatibility = calculatePropertyCompatibility(currentUserPrefs, property);
        const commute = await getCommuteData(
          { lat: property.lat, lng: property.lng },
          { lat: targetCampus.lat, lng: targetCampus.lng }
        );
        return { 
          ...property, 
          compatibility, 
          commute: commute ? { ...commute, campusName: targetCampus.name } : null 
        };
      }));

      setComparisonItems(processed);
      setLoading(false);
    };

    fetchComparisonData();
  }, [propertyIds, navigate]);

  const handleRemove = (id) => {
    if (comparisonItems.length <= 2) {
      navigate('/shortlist');
      return;
    }
    setComparisonItems(comparisonItems.filter(p => p.id !== id));
  };

  const handleDownloadReport = () => {
    if (comparisonItems.length === 0) return;
    const rows = comparisonItems.map((item) => ({
      PropertyID: item.id,
      PropertyName: item.propertyName,
      Location: item.location || item.address || '',
      Rent_GBP: item.price ?? item.rent ?? '',
      CompatibilityPercent: item.compatibility?.score ?? '',
      CommuteDistanceKm: item.commute?.distance ?? '',
      CommuteTransitMins: item.commute?.modes?.transit ?? '',
      CommuteWalkMins: item.commute?.modes?.walking ?? '',
      ReferenceCampus: item.commute?.campusName ?? '',
      ExportedAt: new Date().toISOString(),
    }));
    const date = new Date().toISOString().slice(0, 10);
    exportToCSV(rows, `matchroom-comparison-report-${date}.csv`);
  };

  const handleClearAll = () => {
    navigate('/shortlist');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Best Value Logic (just an example)
  const bestValue = [...comparisonItems].sort((a,b) => {
    // Simple heuristic: compatibility score / price
    const scoreA = (a.compatibility?.score || 0) / (a.price || 1);
    const scoreB = (b.compatibility?.score || 0) / (b.price || 1);
    return scoreB - scoreA;
  })[0];

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12 animate-fade-in relative min-h-screen">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-mainText/40 hover:text-primary transition-colors mb-8 font-bold text-sm uppercase tracking-widest"
      >
        <ArrowLeft size={16} /> Back to Shortlist
      </button>

      <header className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Scale size={20} />
          </div>
          <span className="text-sm font-bold text-mainText/30 uppercase tracking-[0.2em]">Decision Matrix</span>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-mainText mb-4 tracking-tight">Side-by-Side Comparison</h1>
            <p className="text-mainText/40 font-medium max-w-2xl">
              We've mapped your selected properties across 10 key performance indicators to identify the best lifestyle fit for your budget.
            </p>
          </div>
          
          <div className="glass-panel p-6 bg-secondary/5 border-secondary/20 flex items-center gap-6">
             <div className="w-14 h-14 bg-secondary/20 rounded-full flex items-center justify-center text-secondary">
                <Sparkles size={28} />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-secondary tracking-widest">Recommended Value</p>
                <p className="font-bold text-mainText">{bestValue?.propertyName}</p>
             </div>
          </div>
        </div>
      </header>

      <div className="space-y-12">
        <ComparisonTable properties={comparisonItems} onRemove={handleRemove} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="glass-panel p-10 bg-mainText text-white border-0">
              <div className="flex items-center gap-4 mb-8">
                 <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                    <TrendingUp size={24} />
                 </div>
                 <h3 className="text-2xl font-display font-bold">Investment Insights</h3>
              </div>
              <p className="text-white/60 text-lg mb-10 leading-relaxed">
                 Comparing these options, <span className="text-white font-bold">{bestValue?.propertyName}</span> offers the highest 
                 compatibility-to-price ratio. It matches your noise and study preferences while staying within a competitive price bracket for {bestValue?.location}.
              </p>
              <div className="flex gap-4">
                 <button
                   type="button"
                   onClick={handleDownloadReport}
                   className="flex-1 btn btn-primary py-5 text-sm shadow-xl shadow-primary/20 cursor-pointer"
                 >
                   Download Report
                 </button>
                 <button
                   type="button"
                   onClick={handleClearAll}
                   className="flex-1 btn border-white/10 hover:bg-white/5 py-5 text-sm cursor-pointer"
                 >
                   Clear All
                 </button>
              </div>
           </div>

           <div className="glass-panel p-10 flex flex-col justify-center">
              <h4 className="text-sm font-bold text-mainText/40 uppercase tracking-[0.2em] mb-10 text-center">Final Decision Helper</h4>
              <div className="space-y-6">
                 {comparisonItems.map(item => (
                   <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm transition-transform hover:scale-[1.02]">
                      <div className="flex items-center gap-4">
                         <img src={item.imageUrl} className="w-12 h-12 rounded-xl object-cover" />
                         <div>
                            <p className="font-bold text-mainText truncate w-40">{item.propertyName}</p>
                            <p className="text-[10px] font-bold text-mainText/30 uppercase tracking-widest">{item.compatibility?.score}% Match</p>
                         </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/property/${item.id}`)}
                        className="btn btn-primary px-6 py-3 text-[10px] font-bold uppercase tracking-widest shrink-0"
                      >
                        Select this Home
                      </button>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
