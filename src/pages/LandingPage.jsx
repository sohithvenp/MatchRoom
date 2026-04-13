import { Link } from 'react-router-dom';
import { Sparkles, Map, Heart, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-32">
      <div className="text-center max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full text-primary border border-primary/10 mb-8 animate-fade-in shadow-sm">
          <Zap size={16} fill="currentColor" />
          <span className="text-xs font-bold uppercase tracking-widest">Next-Gen Roommate Search</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-8 animate-fade-in text-mainText leading-[1.1]">
          The professional way to find <span className="text-primary italic">compatible</span> living.
        </h1>
        
        {/* Hero Subtitle */}
        <p className="text-xl text-mainText/40 max-w-2xl mx-auto mb-12 animate-fade-in animate-slide-up [animation-delay:200ms] leading-relaxed">
          MatchRoom uses behavioral economics and lifestyle vectoring to connect students with their ideal community. Experience precise housing allocation.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-32 animate-fade-in [animation-delay:400ms]">
          <Link to="/auth" className="btn btn-primary px-10 py-5 text-lg rounded-2xl group">
             Get Started <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/dashboard" className="btn btn-secondary px-10 py-5 text-lg rounded-2xl">
             Explore Properties
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in [animation-delay:600ms]">
        <div className="glass-panel p-10 hover:-translate-y-2 transition-all duration-500 group">
          <div className="bg-primary/5 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border border-primary/10 group-hover:bg-primary group-hover:text-white transition-colors duration-500">
            <Heart size={32} />
          </div>
          <h3 className="text-2xl mb-4 font-display font-bold text-mainText">Behavioral Vectoring</h3>
          <p className="text-mainText/40 leading-relaxed font-medium">We map your lifestyle preferences onto high-dimensional space to compute objective similarity scores.</p>
        </div>
        
        <div className="glass-panel p-10 hover:-translate-y-2 transition-all duration-500 group">
          <div className="bg-accent/5 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border border-accent/10 group-hover:bg-accent group-hover:text-white transition-colors duration-500">
            <Map size={32} />
          </div>
          <h3 className="text-2xl mb-4 font-display font-bold text-mainText">Commute Reliability</h3>
          <p className="text-mainText/40 leading-relaxed font-medium">Integration with campus transit data ensures your commute T(p) is optimized for academic success.</p>
        </div>
        
        <div className="glass-panel p-10 hover:-translate-y-2 transition-all duration-500 group">
          <div className="bg-secondary/5 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border border-secondary/10 group-hover:bg-secondary group-hover:text-white transition-colors duration-500">
            <ShieldCheck size={32} />
          </div>
          <h3 className="text-2xl mb-4 font-display font-bold text-mainText">Verified Community</h3>
          <p className="text-mainText/40 leading-relaxed font-medium">A professional-only student network focused on safety, reliability, and academic compatibility.</p>
        </div>
      </div>
    </div>
  );
}
