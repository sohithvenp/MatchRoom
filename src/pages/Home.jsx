import { Link } from 'react-router-dom';
import { Sparkles, Map, Heart } from 'lucide-react';

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-20 text-center">
      <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight mb-6 animate-fade-in text-mainText">
        Find Your <span className="text-primary">Perfect Match.</span>
      </h1>
      <p className="text-lg md:text-xl text-mainText/50 max-w-2xl mx-auto mb-12 animate-fade-in [animation-delay:200ms]">
        A Multi-Objective Compatibility and Commute Optimisation Model. Experience housing allocation powered by advanced recommendation algorithms.
      </p>

      <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20 animate-fade-in [animation-delay:400ms]">
        <Link to="/questionnaire">
          <button className="btn btn-primary px-10 py-4 text-lg">
             Take Questionnaire
          </button>
        </Link>
        <Link to="/shortlisted">
          <button className="btn btn-secondary px-10 py-4 text-lg">
             View Shortlisted
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in [animation-delay:600ms]">
        <div className="glass-panel p-10 text-left hover:-translate-y-2 transition-transform duration-300">
          <div className="bg-primary/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-primary/30">
            <Heart size={32} className="text-primary" />
          </div>
          <h3 className="text-2xl mb-4 font-display font-semibold text-mainText">Compatibility Scoring</h3>
          <p className="text-mainText/50 leading-relaxed">We use vector matching to analyze your lifestyle preferences against structured housing attributes.</p>
        </div>
        
        <div className="glass-panel p-10 text-left hover:-translate-y-2 transition-transform duration-300">
          <div className="bg-secondary/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-secondary/30">
            <Map size={32} className="text-secondary" />
          </div>
          <h3 className="text-2xl mb-4 font-display font-semibold text-mainText">Commute Optimization</h3>
          <p className="text-mainText/50 leading-relaxed">Automatically constraints properties based on your maximum viable commute threshold to Coventry or Warwick.</p>
        </div>
        
        <div className="glass-panel p-10 text-left hover:-translate-y-2 transition-transform duration-300">
          <div className="bg-accent/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-accent/30">
            <Sparkles size={32} className="text-accent" />
          </div>
          <h3 className="text-2xl mb-4 font-display font-semibold text-mainText">Pareto Efficiency</h3>
          <p className="text-mainText/50 leading-relaxed">Our engine calculates the best trade-offs between compatibility, commute time, and rental affordability.</p>
        </div>
      </div>
    </div>
  );
}
