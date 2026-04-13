import { useEffect, useState } from 'react';
import { mockProperties } from '../utils/mockData';
import { rankProperties } from '../utils/optimization';
import { PoundSterling, Clock, CheckCircle, Star, Heart } from 'lucide-react';
import { useExperiment } from '../utils/ExperimentContext';
import { getShortlist, toggleShortlist } from '../services/shortlistService';
import DecisionConfidenceModal from '../components/DecisionConfidenceModal';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { normalizePropertyCurrency } from '../utils/currency';
import { ensureOptimizationFields } from '../utils/propertyModel';
import { getDefaultConstraints } from '../utils/userModel';

export default function Matches() {
  const [rankedList, setRankedList] = useState([]);
  const [weights, setWeights] = useState({ alpha: 2.0, beta: 1.5, gamma: 1.0 });
  const [shortlisted, setShortlisted] = useState([]);
  const { startTask, endTask, recordShortlist, recordView } = useExperiment();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Start measuring for Optimized condition
    startTask('optimized');

    const fetchAllData = async () => {
      // 1. Fetch user vector & constraints
      const vectorStr = localStorage.getItem('userVector');
      const constStr = localStorage.getItem('userConstraints');

      const vector = vectorStr ? JSON.parse(vectorStr) : [3, 3, 3, 3, 3];
      const constraints = constStr ? JSON.parse(constStr) : getDefaultConstraints();

      const targetUser = { vector, constraints, weights };

      // 2. Fetch properties from DB
      let allProperties = [];
      try {
        const snap = await getDocs(collection(db, 'properties'));
        const dbProps = snap.docs.map(doc => ensureOptimizationFields(normalizePropertyCurrency({ id: doc.id, ...doc.data() })));
        allProperties = dbProps.length > 0 ? dbProps : [...mockProperties].map((item) => ensureOptimizationFields(normalizePropertyCurrency(item)));
      } catch (err) {
        allProperties = [...mockProperties].map((item) => ensureOptimizationFields(normalizePropertyCurrency(item)));
      }

      // 3. Run Engine (Apply Pareto constraints & score)
      const results = rankProperties(allProperties, targetUser);
      setRankedList(results);

      // 4. Sync Unified Objective Function to Firebase
      if (auth.currentUser) {
        import('../utils/optimization').then(m => m.saveOptimizationToFirebase(auth.currentUser.uid, results, targetUser));
      }

      // 5. Fetch shortlist
      const sIds = await getShortlist();
      setShortlisted(sIds);
    };

    fetchAllData();
  }, [weights]);

  const handleShortlist = async (id) => {
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

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-fade-in">
      
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
         <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 flex items-center gap-4 text-mainText">
               <CheckCircle className="text-primary" size={40} />
               Optimized Matches
            </h1>
            <p className="text-mainText/50 text-lg">Ranked precisely by your personalized Unified Objective Function F(u,p).</p>
         </div>
      </div>

      <div className="flex flex-col gap-8">
        {rankedList.length === 0 ? (
          <div className="glass-panel p-20 text-center border-dashed border-2 border-primary/20">
            <h3 className="text-2xl font-bold text-mainText/30 mb-4">No optimal matches found</h3>
            <p className="text-mainText/50 max-w-md mx-auto">
              Your hard constraints are too strict for the current market. Try increasing your maximum budget or commute threshold.
            </p>
          </div>
        ) : (
          rankedList.map((property, idx) => {
            const isTop = idx === 0;
            return (
              <div
                key={property.id}
                className={`glass-panel overflow-hidden flex flex-col md:flex-row relative transition-all duration-300 transform hover:scale-[1.01] ${isTop ? 'ring-2 ring-primary shadow-2xl shadow-primary/10' : ''}`}
                onClick={() => {
                  recordView();
                  navigate(`/property/${property.id}`);
                }}
              >
                
                {/* Image Section */}
                <div className="w-full md:w-1/3 h-56 md:h-auto relative">
                  {isTop && (
                    <div className="absolute top-4 left-4 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full z-10 shadow-lg flex items-center gap-1">
                      <Star size={12} fill="white" /> #1 BEST FIT
                    </div>
                  )}
                  <img src={property.imageUrl} alt="Property" className="w-full h-full object-cover" />
                </div>
                
                {/* Details Section */}
                <div className="flex-1 p-8 flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-display font-semibold text-mainText mb-6">{property.address || property.propertyName}</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8 border-b border-primary/5 pb-8">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2.5 rounded-xl">
                          <PoundSterling size={22} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-mainText/30 uppercase tracking-wider">Monthly Rent</p>
                          <p className="text-xl font-bold text-mainText">£{property.rent || property.price}<span className="text-sm font-medium text-mainText/40">/mo</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-secondary/10 p-2.5 rounded-xl">
                          <Clock size={22} className="text-secondary" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-mainText/30 uppercase tracking-wider">Commute Time</p>
                          <p className="text-xl font-bold text-mainText">{property.commuteTime} mins <span className="text-sm font-medium text-mainText/40">to Campus</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-auto">
                      {(property.tags || []).map(tag => (
                        <span key={tag} className="bg-primary/5 text-primary/70 border border-primary/10 px-3 py-1 rounded-lg text-xs font-medium">{tag}</span>
                      ))}
                      <span className="bg-secondary/5 text-secondary/70 border border-secondary/10 px-3 py-1 rounded-lg text-xs font-medium">{property.furnishing}</span>
                    </div>
                  </div>
                </div>

                {/* Score Section */}
                <div className="w-full md:w-56 bg-primary/5 p-8 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-primary/10">
                   <p className="text-xs font-bold uppercase tracking-widest text-mainText/30 mb-6 text-center">Compatibility</p>
                   
                   <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-display font-bold border-4 shadow-xl mb-4 ${property.compatibilityScore >= 70 ? 'border-primary text-primary shadow-primary/20' : property.compatibilityScore >= 40 ? 'border-secondary text-secondary shadow-secondary/20' : 'border-red-400 text-red-400 shadow-red-400/20'}`}>
                     {property.compatibilityScore.toFixed(0)}%
                   </div>

                   <div className="text-center mb-6">
                     <p className="text-[10px] uppercase font-bold text-mainText/30 tracking-tight mb-1">Objective Score F</p>
                     <p className="text-lg font-display font-bold text-primary">{property.objectiveScore.toFixed(1)}</p>
                   </div>

                   <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShortlist(property.id);
                      }}
                      className={`p-4 rounded-2xl border transition-all ${shortlisted.includes(property.id) ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white border-gray-100 text-mainText/20 hover:text-primary'}`}
                    >
                      <Heart size={20} fill={shortlisted.includes(property.id) ? "white" : "none"} />
                    </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      <div className="mt-16 flex justify-center pb-12">
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
        taskType="optimized"
      />

    </div>
  );
}
