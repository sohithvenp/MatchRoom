import { useEffect, useMemo, useState } from 'react';
import { mockProperties } from '../utils/mockData';
import { baselineRank } from '../utils/optimization';
import { Database, Filter, CheckCircle, Heart, Search } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { normalizePropertyCurrency } from '../utils/currency';
import { useExperiment } from '../utils/ExperimentContext';
import DecisionConfidenceModal from '../components/DecisionConfidenceModal';
import { useNavigate } from 'react-router-dom';
import { getDefaultConstraints } from '../utils/userModel';
import { ensureOptimizationFields } from '../utils/propertyModel';
import { getShortlist, toggleShortlist } from '../services/shortlistService';

const defaultFilterState = (maxBudget) => ({
  maxRent: maxBudget || 2000,
  minRent: 0,
  search: '',
  furnishing: 'all',
});

export default function Baseline() {
  const [baseList, setBaseList] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(() => defaultFilterState(getDefaultConstraints().maxBudget));
  const { startTask, endTask, recordShortlist } = useExperiment();
  const [showModal, setShowModal] = useState(false);
  const [shortlisted, setShortlisted] = useState([]);
  const navigate = useNavigate();

  const displayedList = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return baseList.filter((p) => {
      const rent = Number(p.rent ?? p.price ?? 0);
      if (rent > filters.maxRent || rent < filters.minRent) return false;
      if (q) {
        const blob = `${p.address || ''} ${p.propertyName || ''} ${p.location || ''}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (filters.furnishing !== 'all') {
        const f = (p.furnishing || '').toLowerCase();
        if (filters.furnishing === 'furnished') {
          if (!(f.includes('furnish') && !f.includes('unfurnish') && !f.includes('semi'))) return false;
        }
        if (filters.furnishing === 'semi' && !f.includes('semi')) return false;
        if (filters.furnishing === 'unfurnished' && !f.includes('unfurnish')) return false;
      }
      return true;
    });
  }, [baseList, filters]);

  useEffect(() => {
    // Start measuring time for Baseline task
    startTask('baseline');

    const fetchAllData = async () => {
      // 1. Fetch user constraints
      const constStr = localStorage.getItem('userConstraints');
      const constraints = constStr ? JSON.parse(constStr) : getDefaultConstraints();

      // 2. Fetch properties from DB
      let allProperties = [];
      try {
        const snap = await getDocs(collection(db, 'properties'));
        const dbProps = snap.docs.map(doc => ensureOptimizationFields(normalizePropertyCurrency({ id: doc.id, ...doc.data() })));
        allProperties = dbProps.length > 0 ? dbProps : [...mockProperties].map((item) => ensureOptimizationFields(normalizePropertyCurrency(item)));
      } catch (err) {
        allProperties = [...mockProperties].map((item) => ensureOptimizationFields(normalizePropertyCurrency(item)));
      }

      // 3. Run Baseline Engine (Price Ascending)
      const results = baselineRank(allProperties, constraints);
      setBaseList(results);
      setFilters((prev) => ({
        ...prev,
        maxRent: Math.min(prev.maxRent, constraints.maxBudget || prev.maxRent),
      }));

      // 4. Sync Baseline Sorting Output to Firebase
      if (auth.currentUser) {
          import('../utils/optimization').then(m => m.saveBaselineToFirebase(auth.currentUser.uid, results, constraints));
      }

      const currentShortlist = await getShortlist();
      setShortlisted(currentShortlist);
    };

    fetchAllData();
  }, []);

  const handleShortlist = async (e, id) => {
    e.stopPropagation();
    const isAdding = !shortlisted.includes(id);
    const updated = await toggleShortlist(id);
    setShortlisted(updated);
    if (isAdding) recordShortlist();
  };

  const handleTaskComplete = (feedback) => {
    endTask(feedback);
    setShowModal(false);
    navigate('/dashboard');
  };

  const resetFilters = () => {
    const constStr = localStorage.getItem('userConstraints');
    const constraints = constStr ? JSON.parse(constStr) : getDefaultConstraints();
    setFilters(defaultFilterState(constraints.maxBudget));
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
          <h2 className="text-3xl font-display font-bold mb-2 flex items-center gap-3 text-mainText">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Database size={28} />
            </span>
            Generic Listing View (SpareRoom)
          </h2>
          <p className="text-mainText/55 text-base font-medium leading-relaxed max-w-xl">
            Baseline experiment: listings sorted by <strong className="text-mainText">price (low → high)</strong>, like typical flatshare sites.
            Compatibility ranking is off; use filters below like a basic SpareRoom search.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className={`btn px-6 py-3 text-sm rounded-2xl shadow-sm flex items-center gap-2 transition-all ${
            showFilters ? 'btn-primary shadow-primary/25' : 'btn-secondary border border-gray-200 bg-white hover:border-primary/30'
          }`}
        >
          <Filter size={18} /> {showFilters ? 'Close filters' : 'Basic filters'}
        </button>
      </div>

      {showFilters && (
        <div className="glass-panel p-6 md:p-8 mb-8 border border-primary/10 shadow-lg bg-white/80">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-primary" />
              <span className="text-sm font-bold text-mainText uppercase tracking-widest">Filter listings</span>
            </div>
            <button type="button" onClick={resetFilters} className="text-xs font-bold text-primary uppercase tracking-widest hover:underline">
              Reset
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-mainText/40 uppercase tracking-widest">Min rent (£/mo)</label>
              <input
                type="number"
                min={0}
                className="input-field py-3 text-sm"
                value={filters.minRent || ''}
                onChange={(e) => setFilters((f) => ({ ...f, minRent: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-mainText/40 uppercase tracking-widest">Max rent (£/mo)</label>
              <input
                type="number"
                min={0}
                className="input-field py-3 text-sm"
                value={filters.maxRent || ''}
                onChange={(e) => setFilters((f) => ({ ...f, maxRent: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <label className="text-[10px] font-bold text-mainText/40 uppercase tracking-widest">Furnishing</label>
              <select
                className="input-field py-3 text-sm appearance-none cursor-pointer"
                value={filters.furnishing}
                onChange={(e) => setFilters((f) => ({ ...f, furnishing: e.target.value }))}
              >
                <option value="all">Any</option>
                <option value="furnished">Furnished</option>
                <option value="semi">Semi-furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-2">
              <label className="text-[10px] font-bold text-mainText/40 uppercase tracking-widest">Search area or title</label>
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-mainText/30" />
                <input
                  type="text"
                  placeholder="e.g. Coventry, Earlsdon…"
                  className="input-field pl-11 py-3 text-sm w-full"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-mainText/45 mt-4">
            Showing <strong className="text-mainText">{displayedList.length}</strong> of {baseList.length} listings (still ordered by price).
          </p>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {baseList.length === 0 ? (
          <div className="glass-panel p-16 text-center border-dashed border-2 border-primary/15 bg-white/60">
            <h3 className="text-xl font-bold text-mainText mb-2">No results found</h3>
            <p className="text-mainText/50">Your budget constraint may be too low for available listings.</p>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="glass-panel p-16 text-center border-dashed border-2 border-amber-200/80 bg-amber-50/40">
            <h3 className="text-xl font-bold text-mainText mb-2">No listings match your filters</h3>
            <p className="text-mainText/50 mb-6">Try widening rent range or clearing search.</p>
            <button type="button" onClick={resetFilters} className="btn btn-primary px-8">
              Reset filters
            </button>
          </div>
        ) : (
          displayedList.map((property) => {
            return (
              <div
                key={property.id}
                className="glass-panel flex flex-col sm:flex-row items-stretch p-4 gap-5 bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/15 transition-all sm:min-h-[8.5rem] group cursor-pointer"
                onClick={() => navigate(`/property/${property.id}`)}
              >
                <div className="w-full sm:w-44 h-44 sm:h-auto sm:min-h-[7rem] flex-shrink-0 rounded-xl overflow-hidden ring-1 ring-black/[0.06] shadow-inner">
                  <img
                    src={property.imageUrl}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="flex-1 text-center sm:text-left flex flex-col justify-center min-w-0">
                  <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start mb-2 gap-2">
                    <h3 className="text-lg font-semibold text-mainText truncate max-w-full">
                      {property.address || property.propertyName}
                    </h3>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xl font-display font-bold text-primary">
                        £{property.rent} <span className="text-xs font-semibold text-mainText/45">/mo</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleShortlist(e, property.id)}
                        className={`p-2.5 rounded-xl border transition-all ${
                          shortlisted.includes(property.id)
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-gray-50 border-gray-200 text-mainText/35 hover:text-primary hover:border-primary/25'
                        }`}
                      >
                        <Heart size={18} fill={shortlisted.includes(property.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-mainText/50 mb-2 font-medium uppercase tracking-tight">
                    {property.furnishing} • {property.billsIncluded ? 'Bills included' : 'No bills included'}
                  </p>

                  <p className="text-xs text-mainText/45">
                    Open listing for full details and landlord contact.{' '}
                    <span className="text-mainText/35">(No compatibility score in baseline.)</span>
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-16 flex justify-center">
        <button 
           onClick={() => setShowModal(true)}
           className="btn btn-primary px-12 py-5 text-xl rounded-2xl shadow-2xl shadow-primary/20 flex items-center gap-3 animate-bounce"
        >
          <CheckCircle size={24} /> Complete Selection Task
        </button>
      </div>

      <DecisionConfidenceModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onSubmit={handleTaskComplete}
        taskType="baseline"
      />

    </div>
  );
}
