import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Save, ArrowRight } from 'lucide-react';

export default function Questionnaire() {
  const navigate = useNavigate();

  const [preferences, setPreferences] = useState({
    sleep: 3,
    cleanliness: 3,
    social: 3,
    study: 3,
    noise: 3,
  });

  const [constraints, setConstraints] = useState({
    budget: 600,
    commuteThreshold: 30,
  });

  const handleSlider = (e) => setPreferences({ ...preferences, [e.target.name]: parseInt(e.target.value) });
  const handleConstraint = (e) => setConstraints({ ...constraints, [e.target.name]: parseInt(e.target.value) });

  const saveProfile = (e) => {
    e.preventDefault();
    const userProfile = {
      lifestyle: preferences,
      budget: constraints.budget,
      commuteThreshold: constraints.commuteThreshold
    };
    
    // In real app: save to Firestore users collection
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    navigate('/dashboard');
  };

  const renderSlider = (label, name, minLabel, maxLabel) => (
    <div className="mb-8">
      <div className="flex justify-between items-end mb-3">
        <label className="text-mainText/90 font-medium text-lg">{label}</label>
        <span className="text-primary font-bold text-xl">{preferences[name]}</span>
      </div>
      <input 
        type="range" 
        name={name} 
        min="1" max="5" 
        value={preferences[name]} 
        onChange={handleSlider} 
        className="w-full accent-primary h-2 bg-primary/10 rounded-lg appearance-none cursor-pointer"
      />
      <div className="flex justify-between text-xs text-mainText/40 mt-2 font-medium">
        <span>1 = {minLabel}</span>
        <span>5 = {maxLabel}</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      <div className="mb-10 text-center">
         <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 text-mainText">Lifestyle Questionnaire</h1>
         <p className="text-mainText/50 text-lg">Define your feature vector X_u to enable algorithmic compatibility matching.</p>
      </div>

      <form onSubmit={saveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-10">
        
        {/* Lifestyle Vector (Xu) */}
        <div className="glass-panel p-8 border-l-4 border-l-primary/60">
           <h2 className="text-2xl font-display font-semibold mb-8 flex items-center gap-3">
             <Settings className="text-primary" /> Feature Vector X_u
           </h2>
           {renderSlider("Sleep Schedule", "sleep", "Early Bird", "Night Owl")}
           {renderSlider("Cleanliness Standard", "cleanliness", "Lenient", "Very Strict")}
           {renderSlider("Social Lifestyle", "social", "Keep to myself", "Always host parties")}
           {renderSlider("Study Habits", "study", "Rarely home", "Intense focus at home")}
           {renderSlider("Noise Tolerance", "noise", "Absolute silence", "Loud music is fine")}
        </div>

        {/* Hard Constraints */}
        <div className="flex flex-col gap-6">
           <div className="glass-panel p-8 border-l-4 border-l-secondary/60 flex-1">
             <h2 className="text-2xl font-display font-semibold mb-8 flex items-center gap-3 text-mainText">
               <Save className="text-secondary" /> Optimization Constraints
             </h2>
             <p className="text-sm text-mainText/50 mb-8 border-b border-primary/10 pb-4">
               The engine uses Pareto efficiency to filter out properties that exceed these strict thresholds before ranking.
             </p>

             <div className="mb-8">
              <label className="block text-mainText/90 font-medium text-lg mb-3">Max Monthly Budget (£)</label>
               <div className="relative">
                <span className="absolute left-4 top-3 text-mainText/40 text-xl">£</span>
                 <input 
                   type="number" 
                   name="budget" 
                   value={constraints.budget} 
                   onChange={handleConstraint} 
                   className="input-field pl-10 text-xl"
                   required
                 />
               </div>
             </div>

             <div className="mb-6">
               <label className="block text-mainText/90 font-medium text-lg mb-3">Max Commute Time (mins)</label>
               <div className="relative">
                 <input 
                   type="number" 
                   name="commuteThreshold" 
                   value={constraints.commuteThreshold} 
                   onChange={handleConstraint} 
                   className="input-field pr-16 text-xl"
                   required
                 />
                 <span className="absolute right-4 top-3 text-mainText/40 font-medium">mins</span>
               </div>
             </div>
           </div>

           <button type="submit" className="btn btn-primary w-full py-5 text-xl font-bold rounded-2xl shadow-primary/40">
             Generate Housing Matches <ArrowRight strokeWidth={3} className="ml-2" />
           </button>
        </div>

      </form>
    </div>
  );
}
