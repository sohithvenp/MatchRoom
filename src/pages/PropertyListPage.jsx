import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockProperties, mockUserPreferences } from '../utils/mockData';
import { resolveUserTargetCampus } from '../utils/campusContext';
import { calculatePropertyCompatibility, savePropertyMatchesToFirebase } from '../utils/propertyMatching';
import { getCommuteData, saveCommuteToFirebase } from '../services/commuteService';
import { getShortlist, toggleShortlist } from '../services/shortlistService';
import PropertyCard from '../components/PropertyCard';
import { Filter, Star, Search, Sparkles, SlidersHorizontal } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { useExperiment } from '../utils/ExperimentContext';
import { exportToCSV, prepareResearchDataset } from '../services/exportService';
import { normalizePropertyCurrency } from '../utils/currency';
import { Download } from 'lucide-react';
import { ensureOptimizationFields } from '../utils/propertyModel';

export default function PropertyListPage() {
  const navigate = useNavigate();
  const [rankedList, setRankedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPrefs, setUserPrefs] = useState(mockUserPreferences);
  const [searchTerm, setSearchTerm] = useState('');
  const [shortlistIds, setShortlistIds] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    maxRent: 2000,
    minCompatibility: 0,
    environment: 'all',
    shortlistedOnly: false
  });

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      
      // 1. Fetch User Prefs and check profile completion
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
             // User document does not exist, force setup
             navigate('/profile');
             return;
          }
        } else {
             // Not authenticated
             navigate('/auth');
             return;
        }
        setUserPrefs(currentUserPrefs);
      } catch (e) {
        console.warn("Using mock user preferences", e);
      }

      // 2. Fetch Properties
      let allProperties = [];
      try {
        const snap = await getDocs(collection(db, 'properties'));
        const dbProps = snap.docs.map(doc => ensureOptimizationFields(normalizePropertyCurrency({ id: doc.id, ...doc.data() })));
        
        if (dbProps.length > 0) {
          allProperties = dbProps;
        } else {
          // Fallback to mock data if DB is empty
          allProperties = [...mockProperties].map((item) => ensureOptimizationFields(normalizePropertyCurrency(item)));
        }
      } catch (err) {
        console.warn("Could not fetch properties from DB, using mock", err);
        allProperties = [...mockProperties].map((item) => ensureOptimizationFields(normalizePropertyCurrency(item)));
      }

      // 3. Get Target Campus (user's reference university)
      const targetCampus = await resolveUserTargetCampus();

      // 4. Calculate Compatibility & Commute
      const evaluated = await Promise.all(allProperties.map(async (property) => {
        const compatibility = calculatePropertyCompatibility(currentUserPrefs, property);
        
        // Calculate Commute
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

      // Sort by highest compatibility score first
      const sorted = evaluated.sort((a, b) => {
        const scoreA = a.compatibility?.score ?? 0;
        const scoreB = b.compatibility?.score ?? 0;
        return scoreB - scoreA;
      });
      setRankedList(sorted);
      setLoading(false);

      // Add to Firebase directly!
      if (auth.currentUser) {
         savePropertyMatchesToFirebase(auth.currentUser.uid, sorted);
      }

      // Initial shortlist load
      const sIds = await getShortlist();
      setShortlistIds(sIds);
    };

    fetchAllData();
  }, []);

  const filteredList = rankedList.filter(p => {
    const nameMatch = p.propertyName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    const locationMatch = p.location?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    const searchMatch = nameMatch || locationMatch;

    const rent = Number(p.rent ?? p.price ?? 0);
    const compatibility = Number(p.compatibility?.score ?? 0);
    const rentMatch = rent <= filters.maxRent;
    const compatibilityMatch = compatibility >= filters.minCompatibility;
    const environmentMatch = filters.environment === 'all' || p.environmentType === filters.environment;
    const shortlistMatch = !filters.shortlistedOnly || shortlistIds.includes(p.id);

    return searchMatch && rentMatch && compatibilityMatch && environmentMatch && shortlistMatch;
  });

  const { recordShortlist } = useExperiment?.() || {};

  const handleShortlist = async (id) => {
    const updated = await toggleShortlist(id);
    setShortlistIds(updated);
    if (updated.includes(id)) recordShortlist?.();
  };

  const isShortlisted = (id) => {
    return shortlistIds.includes(id);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="font-display font-bold text-mainText animate-pulse text-xl">Running Compatibility Matrix...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
         <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-secondary" size={20} />
              <span className="text-sm font-bold text-secondary uppercase tracking-[0.2em]">Smart Matching Engine</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 text-mainText leading-tight tracking-tight">
              Best student matches.
            </h1>
            <p className="text-mainText/40 text-lg font-medium">
              We've analyzed {rankedList.length} properties against your lifestyle preferences to find your perfect home.
            </p>
         </div>
         <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mainText/30" />
              <input 
                type="text" 
                placeholder="Search by property or area..." 
                className="input-field pl-12 py-4 text-sm shadow-sm" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => {
                const dataset = prepareResearchDataset(rankedList, userPrefs);
                exportToCSV(dataset, `matchroom_research_data_${new Date().toISOString().split('T')[0]}.csv`);
              }}
              className="btn bg-white border border-gray-100 px-5 py-3 rounded-2xl shadow-sm text-mainText/60 hover:text-primary transition-all flex items-center gap-2"
              title="Export research data to CSV"
            >
              <Download size={18} />
              <span className="hidden lg:inline text-xs font-bold uppercase tracking-widest">Export CSV</span>
            </button>
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`btn px-5 py-3 rounded-2xl shadow-sm ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
              title="Toggle filters"
            >
              <SlidersHorizontal size={18} />
            </button>
         </div>
      </div>

      {showFilters && (
        <div className="glass-panel p-6 mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-mainText/40">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-mainText/30 mb-2">Max Rent (£)</label>
              <input
                type="number"
                min="100"
                max="5000"
                value={filters.maxRent}
                onChange={(e) => setFilters((prev) => ({ ...prev, maxRent: Number(e.target.value || 0) }))}
                className="input-field py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-mainText/30 mb-2">Min Compatibility (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={filters.minCompatibility}
                onChange={(e) => setFilters((prev) => ({ ...prev, minCompatibility: Number(e.target.value || 0) }))}
                className="input-field py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-mainText/30 mb-2">Environment</label>
              <select
                value={filters.environment}
                onChange={(e) => setFilters((prev) => ({ ...prev, environment: e.target.value }))}
                className="input-field py-3 text-sm"
              >
                <option value="all">All</option>
                <option value="quiet">Quiet</option>
                <option value="social">Social</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 text-sm font-medium text-mainText/60">
                <input
                  type="checkbox"
                  checked={filters.shortlistedOnly}
                  onChange={(e) => setFilters((prev) => ({ ...prev, shortlistedOnly: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                Shortlisted only
              </label>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setFilters({ maxRent: 2000, minCompatibility: 0, environment: 'all', shortlistedOnly: false })}
              className="btn btn-secondary px-4 py-2 text-xs"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-12">
        {filteredList.length === 0 ? (
          <div className="glass-panel p-24 text-center border-dashed border-2 border-primary/10 bg-transparent">
            <Search className="mx-auto text-primary/10 mb-6" size={80} />
            <h3 className="text-2xl font-bold text-mainText/40 mb-2 font-display">No Matches Found</h3>
            <p className="text-mainText/30 max-w-sm mx-auto font-medium">
              Try adjusting your search terms or broaden your lifestyle preferences in your profile.
            </p>
          </div>
        ) : (
          filteredList.map((property) => (
             <PropertyCard 
               key={property.id} 
               property={property} 
               onShortlist={handleShortlist}
               isShortlisted={isShortlisted(property.id)}
             />
          ))
        )}
      </div>

      {/* Floating Insights Panel */}
      <div className="mt-20 glass-panel p-10 bg-mainText text-white border-0 overflow-hidden relative group">
         <div className="absolute top-0 right-0 p-12 bg-primary/10 rounded-full -mr-12 -mt-12 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="max-w-xl">
               <h3 className="text-3xl font-display font-bold mb-4">How we calculate compatibility?</h3>
               <p className="text-white/60 text-lg">
                 Our neural-engine compares 12 lifestyle parameters including noise tolerance, guest policies, and study schedules 
                 to ensure you don't just find a house, but a community that fits you.
               </p>
            </div>
            <button className="btn bg-white text-mainText px-10 py-5 font-bold hover:bg-primary hover:text-white transition-all transform hover:-translate-y-1">
               Refine My Profile
            </button>
         </div>
      </div>
    </div>
  );
}
