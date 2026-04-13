import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { calculateCompatibility } from '../utils/matchingLogic';
import { buildLifestyleVector, getDefaultConstraints, normalizeCampusId } from '../utils/userModel';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Sun, 
  Moon, 
  Sparkles, 
  Volume2, 
  Book, 
  Users, 
  UserCircle, 
  Thermometer, 
  Handshake, 
  Home
} from 'lucide-react';

const steps = [
  {
    id: 1,
    title: "Daily Routine",
    questions: [
      {
        id: "wakeUpTime",
        label: "Wake-up Time",
        options: [
          { label: "Early Bird", value: "early" },
          { label: "Normal", value: "normal" },
          { label: "Late Riser", value: "late" }
        ]
      },
      {
        id: "sleepTime",
        label: "Sleep Schedule",
        options: [
          { label: "Before 10pm", value: "before 10pm" },
          { label: "10pm - 12am", value: "10pm-12am" },
          { label: "After 12am", value: "after 12am" }
        ]
      }
    ]
  },
  {
    id: 2,
    title: "Study Preferences",
    questions: [
      {
        id: "studyTime",
        label: "When do you prefer to study?",
        options: [
          { label: "Morning", value: "morning" },
          { label: "Afternoon", value: "afternoon" },
          { label: "Night", value: "night" }
        ]
      },
      {
        id: "noiseTolerance",
        label: "Noise Tolerance",
        options: [
          { label: "Absolute Silence", value: "quiet" },
          { label: "Light Buzz", value: "moderate" },
          { label: "Music / Lively", value: "lively" }
        ]
      }
    ]
  },
  {
    id: 3,
    title: "Social Lifestyle",
    questions: [
      {
        id: "socialLevel",
        label: "Social Activity Level",
        options: [
          { label: "Introvert", value: "rarely invite friends" },
          { label: "Balanced", value: "sometimes" },
          { label: "Extrovert", value: "often" }
        ]
      },
      {
        id: "guestPreference",
        label: "Guest Preference",
        options: [
          { label: "No Overnight", value: "never" },
          { label: "Weekends Only", value: "weekends" },
          { label: "Frequent Guests", value: "often" }
        ]
      }
    ]
  },
  {
    id: 4,
    title: "Personal Habits",
    questions: [
      {
        id: "cleanliness",
        label: "Cleanliness Level",
        options: [
          { label: "Minimalist/Clean", value: "very clean" },
          { label: "Tidy enough", value: "moderate" },
          { label: "Relaxed", value: "messy" }
        ]
      },
      {
        id: "smoking",
        label: "Smoking Preference",
        options: [
          { label: "Non-smoker", value: "non-smoker" },
          { label: "Smoker", value: "smoker" },
          { label: "Ocassional", value: "smoker" }
        ]
      },
      {
        id: "drinking",
        label: "Drinking Preference",
        options: [
          { label: "Never", value: "never" },
          { label: "Social", value: "socially" },
          { label: "Frequent", value: "regularly" }
        ]
      },
      {
        id: "conflictStyle",
        label: "Conflict Resolution Style",
        options: [
          { label: "Direct Talk", value: "direct" },
          { label: "Written Note", value: "written" },
          { label: "Mediation", value: "mediation" }
        ]
      }
    ]
  },
  {
    id: 5,
    title: "Review & Comfort",
    questions: [
      {
        id: "personalSpace",
        label: "Personal Space Preference",
        options: [
          { label: "Very Private", value: "isolated" },
          { label: "Shared", value: "shared" },
          { label: "Open Door", value: "open" }
        ]
      },
      {
        id: "temperature",
        label: "Temperature Preference",
        options: [
          { label: "Cool", value: "cool" },
          { label: "Moderate", value: "moderate" },
          { label: "Warm", value: "warm" }
        ]
      }
    ]
  }
];

export default function LifestyleQuestionnaire() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showScoreScreen, setShowScoreScreen] = useState(false);
  const [topScore, setTopScore] = useState(0);
  const [userId, setUserId] = useState(null);
  const [name, setName] = useState('');
  const [lifestyle, setLifestyle] = useState({
    wakeUpTime: 'normal',
    sleepTime: '10pm-12am',
    studyTime: 'afternoon',
    noiseTolerance: 'moderate',
    socialLevel: 'sometimes',
    guestPreference: 'weekends',
    cleanliness: 'moderate',
    smoking: 'non-smoker',
    drinking: 'socially',
    conflictStyle: 'direct',
    personalSpace: 'shared',
    temperature: 'moderate'
  });

  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
        const fetchUserData = async () => {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              if (data.lifestyle) setLifestyle(prev => ({ ...prev, ...data.lifestyle }));
              if (data.name) setName(data.name);
              
              // 🚨 ENFORCE PROFILE COMPLETION
              if (!data.basicProfileComplete) {
                navigate('/profile');
              }
            } else {
              // No user doc found, go to profile
              navigate('/profile');
            }
          } catch (e) {
             console.warn("Could not fetch user data, permissions might still be syncing.", e);
          }
        };
        fetchUserData();
      } else {
        const localUser = localStorage.getItem('user');
        if (localUser) {
          setUserId(localUser);
          
          // 🚨 ENFORCE PROFILE COMPLETION (Local Mode)
          const localProfile = JSON.parse(localStorage.getItem('userProfileData') || '{}');
          if (!localProfile.basicProfileComplete) {
            navigate('/profile');
          }
        } else {
          navigate('/auth');
        }
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleOptionSelect = (questionId, value) => {
    setLifestyle(prev => ({ ...prev, [questionId]: value }));
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setError('');

    const findTopMatchScore = async (userLifestyle) => {
      let allUsers = [];
      if (auth.app.options.apiKey === 'dummy-api-key') {
        allUsers = [
          { id: '2', lifestyle: { wakeUpTime: 'early', sleepTime: 'before 10pm', cleanliness: 'very clean', noiseTolerance: 'quiet', studyTime: 'morning', socialLevel: 'rarely invite friends', guestPreference: 'never', conflictStyle: 'direct', personalSpace: 'isolated', temperature: 'cool' } },
          { id: '3', lifestyle: { wakeUpTime: 'normal', sleepTime: '10pm-12am', cleanliness: 'moderate', noiseTolerance: 'moderate', studyTime: 'afternoon', socialLevel: 'sometimes', guestPreference: 'weekends', conflictStyle: 'direct', personalSpace: 'shared', temperature: 'moderate' } },
          { id: '4', lifestyle: { wakeUpTime: 'late', sleepTime: 'after 12am', cleanliness: 'messy', noiseTolerance: 'lively', studyTime: 'night', socialLevel: 'often', guestPreference: 'often', conflictStyle: 'mediation', personalSpace: 'open', temperature: 'warm' } },
        ];
      } else {
        const usersRef = collection(db, "users");
        const snap = await getDocs(usersRef);
        allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== userId && u.profileComplete && u.lifestyle);
      }
      
      let maxScore = 0;
      const currentUserTemp = { lifestyle: userLifestyle };
      allUsers.forEach(u => {
        const score = calculateCompatibility(currentUserTemp, u);
        if (score > maxScore) maxScore = score;
      });
      return maxScore || 80;
    };

    try {
      // 🚨 PROACTIVE DEMO MODE CHECK
      if (auth.app.options.apiKey === 'dummy-api-key') {
        const vector = buildLifestyleVector(lifestyle);
        const savedConstraints = JSON.parse(localStorage.getItem('userConstraints') || 'null') || getDefaultConstraints();
        localStorage.setItem('userVector', JSON.stringify(vector));
        localStorage.setItem('userConstraints', JSON.stringify(savedConstraints));
        console.warn("MatchRoom: Demo Mode - Saving to LocalStorage");
        localStorage.setItem('userLifestyle', JSON.stringify({ 
          name: name || "Demo Student", 
          lifestyle,
          lifestyleVector: vector,
          preferredCampusId: normalizeCampusId('c1'),
          profileComplete: true 
        }));
        
        const maxScore = await findTopMatchScore(lifestyle);
        setTopScore(maxScore);
        
        setTimeout(() => {
          setLoading(false);
          setShowScoreScreen(true);
        }, 1500);
        return;
      }

      // Real Firebase Mode
      const userRef = doc(db, "users", userId);
      const vector = buildLifestyleVector(lifestyle);
      const userDoc = await getDoc(userRef);
      const existing = userDoc.exists() ? userDoc.data() : {};
      const constraints = existing.constraints || getDefaultConstraints();
      // We use setDoc with merge: true so it creates the document if it doesn't exist
      await setDoc(userRef, {
        name: name || "Student",
        lifestyle: lifestyle,
        lifestyleVector: vector,
        preferredCampusId: normalizeCampusId(existing.preferredCampusId),
        constraints,
        profileComplete: true,
        updatedAt: new Date()
      }, { merge: true });
      localStorage.setItem('userVector', JSON.stringify(vector));
      localStorage.setItem('userConstraints', JSON.stringify(constraints));
      
      const maxScore = await findTopMatchScore(lifestyle);
      setTopScore(maxScore);

      setLoading(false);
      setShowScoreScreen(true);
    } catch (err) {
      console.error("Error saving lifestyle data:", err);
      // Fallback local storage, but SHOW the error to the user
      localStorage.setItem('userLifestyle', JSON.stringify({ name: name || "Student", lifestyle }));
      setError('Database save failed. Using local profile temporarily. (' + err.message + ')');
      setLoading(false); // Stop loading so they can see the error
    }
  };

  const progress = (currentStep / steps.length) * 100;
  const currentStepData = steps.find(s => s.id === currentStep);

  const getIcon = (id) => {
    switch (id) {
      case 'wakeUpTime': return <Sun size={20} />;
      case 'sleepTime': return <Moon size={20} />;
      case 'studyTime': return <Book size={20} />;
      case 'noiseTolerance': return <Volume2 size={20} />;
      case 'socialLevel': return <Users size={20} />;
      case 'guestPreference': return <UserCircle size={20} />;
      case 'cleanliness': return <Sparkles size={20} />;
      case 'conflictStyle': return <Handshake size={20} />;
      case 'personalSpace': return <Home size={20} />;
      case 'temperature': return <Thermometer size={20} />;
      default: return <Sparkles size={20} />;
    }
  };

  if (showScoreScreen) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-12 animate-fade-in text-center flex flex-col items-center justify-center min-h-[60vh]">
        <div className="mb-10 animate-slide-up">
           <p className="text-sm font-bold text-primary uppercase tracking-widest mb-6">Analysis Complete</p>
           <div className="relative w-40 h-40 mx-auto bg-white border border-primary/20 shadow-2xl shadow-primary/10 rounded-full flex flex-col items-center justify-center mb-8">
              <span className="text-5xl font-display font-bold text-primary">{topScore}%</span>
              <span className="text-[10px] uppercase font-bold text-mainText/40 tracking-wider mt-1">Top Match</span>
              <div className="absolute inset-0 border-4 border-t-primary border-r-secondary border-b-transparent border-l-transparent rounded-full animate-spin opacity-20" style={{ animationDuration: '3s' }}></div>
           </div>
           <h2 className="text-3xl font-display font-bold text-mainText mb-4">Compatibility Mapped!</h2>
           <p className="text-mainText/50 text-lg max-w-md mx-auto">
              We've processed your lifestyle vector. Your highest compatibility score with potential roommates is highly promising.
           </p>
        </div>
        <button 
           onClick={() => navigate('/results')}
           className="btn btn-primary px-10 py-4 text-lg animate-fade-in shadow-xl shadow-primary/30"
           style={{ animationDelay: '500ms' }}
        >
           View Matches Page <ArrowRight size={20} className="ml-2" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-6 py-12 animate-fade-in">
      {/* Header Section */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-display font-bold mb-2 tracking-tight">Match Profile</h1>
        <p className="text-mainText/40 font-medium">Step {currentStep} of {steps.length} — {currentStepData.title}</p>
      </div>

      {/* Progress Bar Container */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full mb-12 overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-700 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-500 rounded-2xl text-sm font-semibold border border-red-100 animate-fade-in flex flex-col gap-2">
           <p>⚠️ {error}</p>
           <p className="text-xs font-normal opacity-80">
             Your network request was blocked by the database. Did you publish the test rules?
           </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
        {/* Intro Step (Name) - only on step 1 */}
        {currentStep === 1 && (
          <div className="glass-panel p-8 mb-4">
            <label className="block text-sm font-bold text-mainText/30 uppercase tracking-widest mb-4">Display Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How should potential roommates call you?"
              className="input-field text-lg"
              required
            />
          </div>
        )}

        {/* Dynamic Questions for Current Step */}
        {currentStepData.questions.map((q) => (
          <div key={q.id} className="glass-panel p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-primary/5 rounded-xl text-primary">
                {getIcon(q.id)}
              </div>
              <h3 className="text-xl font-display font-semibold">{q.label}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {q.options.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleOptionSelect(q.id, option.value)}
                  className={`option-card ${lifestyle[q.id] === option.value ? 'option-card-selected' : ''}`}
                >
                  {option.label}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-10">
          {currentStep > 1 && (
            <button 
              type="button" 
              onClick={prevStep}
              className="btn btn-secondary flex-1 px-8 py-4"
            >
              <ArrowLeft size={18} /> Previous Step
            </button>
          )}
          
          {currentStep < steps.length ? (
            <button 
              type="button" 
              onClick={nextStep}
              className="btn btn-primary flex-1 px-8 py-4"
            >
              Next Step <ArrowRight size={18} />
            </button>
          ) : (
            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary flex-1 px-8 py-4 bg-accent hover:border-accent hover:text-white"
            >
              {loading ? "Matching Algorithm Running..." : (
                <span className="flex items-center gap-2">
                  Complete Profile <CheckCircle2 size={20} />
                </span>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
