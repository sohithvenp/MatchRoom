import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { calculateCompatibility, getDetailedBreakdown } from '../utils/matchingLogic';
import { User, Heart, Sparkles, TrendingUp, ChevronRight, X } from 'lucide-react';
import CompatibilityBreakdown from '../components/CompatibilityBreakdown';

export default function MatchResults() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchMatches = async () => {
      let uid = auth.currentUser?.uid || localStorage.getItem('user');

      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        let allUsers = [];

        // 🚨 PROACTIVE DEMO MODE CHECK
        if (auth.app.options.apiKey === 'dummy-api-key') {
          console.warn("MatchRoom: Demo Mode - Using Mock Roommates");
          // Generate actual mock data for demo
          const localLifestyle = JSON.parse(localStorage.getItem('userLifestyle') || '{}');
          allUsers = [
            { id: uid, name: localLifestyle.name || "You", lifestyle: localLifestyle?.lifestyle, profileComplete: true },
            { id: '2', name: 'Oliver H.', lifestyle: { wakeUpTime: 'early', sleepTime: 'before 10pm', cleanliness: 'very clean', noiseTolerance: 'quiet', studyTime: 'morning', socialLevel: 'rarely invite friends', guestPreference: 'never', conflictStyle: 'direct', personalSpace: 'isolated', temperature: 'cool' }, profileComplete: true },
            { id: '3', name: 'Amelia K.', lifestyle: { wakeUpTime: 'normal', sleepTime: '10pm-12am', cleanliness: 'moderate', noiseTolerance: 'moderate', studyTime: 'afternoon', socialLevel: 'sometimes', guestPreference: 'weekends', conflictStyle: 'direct', personalSpace: 'shared', temperature: 'moderate' }, profileComplete: true },
            { id: '4', name: 'Marcus L.', lifestyle: { wakeUpTime: 'late', sleepTime: 'after 12am', cleanliness: 'messy', noiseTolerance: 'lively', studyTime: 'night', socialLevel: 'often', guestPreference: 'often', conflictStyle: 'mediation', personalSpace: 'open', temperature: 'warm' }, profileComplete: true },
          ];
        } else {
          // Real Firebase Mode
          const usersRef = collection(db, "users");
          const allUsersSnapshot = await getDocs(usersRef);
          allUsers = allUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        const currentUserData = allUsers.find(u => u.id === uid);

        if (currentUserData && currentUserData.lifestyle) {
          const scoredMatches = allUsers
            .filter(u => u.id !== uid && u.lifestyle && u.profileComplete)
            .map(other => ({
              ...other,
              compatibilityScore: calculateCompatibility(currentUserData, other)
            }))
            .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

          setMatches(scoredMatches);
          setCurrentUser(currentUserData);
        }
      } catch (error) {
        console.error("Error fetching matches:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-mainText/40 font-medium tracking-wide">AI Recommendation Engine Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-6 py-12 animate-fade-in">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <TrendingUp size={20} />
          </div>
          <span className="text-sm font-bold text-primary uppercase tracking-widest">Compatibility Report</span>
        </div>
        <h1 className="text-4xl font-display font-bold text-mainText mb-4">Your Top Matches</h1>
        <p className="text-mainText/40 text-lg leading-relaxed">
          We analyzed your lifestyle vector and found {matches.length} students who share your habits and values.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="glass-panel p-20 text-center">
          <Sparkles className="mx-auto text-primary/20 mb-6" size={64} />
          <h3 className="text-2xl font-bold text-mainText/60 mb-2">Finding your community...</h3>
          <p className="text-mainText/40 max-w-sm mx-auto">
            Try adjusting your profile or check back later as more students join MatchRoom.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {matches.map((match, idx) => (
            <div 
              key={match.id} 
              className="glass-panel p-6 flex items-center gap-6 group hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 animate-slide-up"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Profile Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center text-mainText/20 transition-colors group-hover:bg-primary/5 group-hover:text-primary">
                  <User size={40} />
                </div>
                {idx === 0 && (
                  <div className="absolute -top-2 -left-2 bg-secondary text-white p-1.5 rounded-lg shadow-lg rotate-[-12deg]">
                    <Heart size={16} fill="white" />
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-display font-bold text-mainText">{match.name}</h3>
                  <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded uppercase tracking-wider">
                    {match.compatibilityScore >= 90 ? 'Ideal Match' : 'High Compatibility'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-medium text-mainText/40 capitalize">
                    {match.lifestyle.cleanliness} • {match.lifestyle.noiseTolerance} Environment
                  </span>
                </div>
              </div>

              {/* Score Badge */}
              <div className="flex flex-col items-center justify-center px-5 py-3 bg-gray-50 rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                <span className="text-2xl font-display font-bold">
                  {match.compatibilityScore}%
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-40 group-hover:opacity-60">Match</span>
              </div>

              {/* Action */}
              <button 
                onClick={() => setSelectedMatch(match)}
                className="p-3 bg-white border border-gray-100 rounded-xl text-mainText/30 hover:text-primary hover:border-primary/20 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Breakdown Modal */}
      {selectedMatch && currentUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-mainText/40 backdrop-blur-sm" onClick={() => setSelectedMatch(null)}></div>
          <div className="bg-white w-full max-w-3xl rounded-[32px] overflow-hidden relative shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedMatch(null)}
              className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full text-mainText/20 hover:text-mainText transition-colors z-10"
            >
              <X size={20} />
            </button>
            
            <div className="p-6 md:p-10">
               <div className="mb-8 flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                     <User size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-mainText">Match with {selectedMatch.name}</h2>
                    <p className="text-sm font-medium text-mainText/40 italic">Vector alignment analysis completed.</p>
                  </div>
               </div>
               
               <CompatibilityBreakdown 
                 breakdown={getDetailedBreakdown(currentUser, selectedMatch)} 
               />
               
               <div className="mt-8 flex justify-center">
                  <button 
                    onClick={() => setSelectedMatch(null)}
                    className="btn btn-primary px-10 py-4 rounded-2xl"
                  >
                    Close Report
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
