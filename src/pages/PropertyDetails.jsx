import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockProperties, mockUserPreferences } from '../utils/mockData';
import { resolveUserTargetCampus } from '../utils/campusContext';
import { calculatePropertyCompatibility, calculateCompatibilityBreakdown } from '../utils/propertyMatching';
import { getCommuteData } from '../services/commuteService';
import CommuteInfo from '../components/CommuteInfo';
import CompatibilityScoreCard from '../components/CompatibilityScoreCard';
import CompatibilityBreakdown from '../components/CompatibilityBreakdown';
import CompatibilityTagMatcher from '../components/CompatibilityTagMatcher';
import CompatibilityFeedbackCard from '../components/CompatibilityFeedbackCard';
import CompatibilityBadge from '../components/CompatibilityBadge';
import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useExperiment } from '../utils/ExperimentContext';
import { normalizePropertyCurrency } from '../utils/currency';
import { ensureOptimizationFields } from '../utils/propertyModel';
import { 
  ArrowLeft, 
  MapPin, 
  Users, 
  ShieldCheck, 
  Zap,
  CheckCircle2,
  XCircle,
  Calendar,
  Home,
  Waves,
  Coffee,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { startChat } from '../services/chatService';
import { getShortlist, toggleShortlist, recordPropertyView } from '../services/shortlistService';
import ShortlistButton from '../components/ShortlistButton';

export default function PropertyDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPrefs, setUserPrefs] = useState(mockUserPreferences);

  const [isShortlisted, setIsShortlisted] = useState(false);
  const { recordView } = useExperiment?.() || {};

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Property from DB Primarily
      let foundProperty = null;
      try {
        const snap = await getDoc(doc(db, 'properties', id));
        if (snap.exists()) {
           foundProperty = ensureOptimizationFields(normalizePropertyCurrency({ id: snap.id, ...snap.data() }));
        }
      } catch (e) {
        console.warn("Could not fetch property from DB", e);
      }
      
      // Fallback to mock if not found in DB (for existing mock links)
      if (!foundProperty) {
        foundProperty = ensureOptimizationFields(normalizePropertyCurrency(mockProperties.find(p => p.id === id)));
      }

      // 2. Fetch User Prefs
      let currentUserPrefs = mockUserPreferences;
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
      setUserPrefs(currentUserPrefs);

      if (foundProperty) {
        // ... (compatibility and commute calculations)
        const compatibility = calculatePropertyCompatibility(currentUserPrefs, foundProperty);
        const breakdown = calculateCompatibilityBreakdown(currentUserPrefs, foundProperty);
        
        const targetCampus = await resolveUserTargetCampus();
        const commute = await getCommuteData(
          { lat: foundProperty.lat, lng: foundProperty.lng },
          { lat: targetCampus.lat, lng: targetCampus.lng }
        );

        const propertyObj = { 
          ...foundProperty, 
          compatibility, 
          breakdown,
          commute: commute ? { ...commute, campusName: targetCampus.name } : null 
        };
        setProperty(propertyObj);

        // Fetch shortlist status
        const shortlist = await getShortlist();
        setIsShortlisted(shortlist.includes(id));

        // Record metrics for research
        recordView?.();
        recordPropertyView?.(propertyObj);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [id, recordView]);

  const handleShortlist = async () => {
    const updated = await toggleShortlist(id);
    setIsShortlisted(updated.includes(id));
  };

  const handleContactOwner = async () => {
    if (!auth.currentUser) {
      navigate('/auth');
      return;
    }

    const ownerId = property.ownerId || 'mock_landlord_1';

    if (ownerId === auth.currentUser.uid) {
      window.alert('This is your listing. You cannot message yourself.');
      return;
    }

    try {
      const chatId = await startChat(auth.currentUser.uid, ownerId, property);
      navigate(`/messages?chat=${encodeURIComponent(chatId)}`);
    } catch (e) {
      console.error('Error starting chat:', e);
      const denied =
        e?.code === 'permission-denied' ||
        (typeof e?.message === 'string' && e.message.toLowerCase().includes('permission'));
      window.alert(
        denied
          ? 'Could not open messages: Firestore denied access. Confirm you are signed in and rules are deployed for this Firebase project.'
          : 'Could not start a conversation. Please try again.'
      );
    }
  };

  const handleBackToListings = () => {
    navigate('/dashboard');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Analysis...</div>;
  if (!property) return <div className="min-h-screen flex flex-col items-center justify-center gap-4">
    <h2 className="text-2xl font-bold">Property Not Found</h2>
    <button onClick={() => navigate('/dashboard')} className="btn btn-primary">Back to Dashboard</button>
  </div>;

  const sharedSpaces = Array.isArray(property.sharedSpaces) ? property.sharedSpaces : [];
  const compatibilityScore = property.compatibility?.score ?? 0;
  const safeLocation = property.location || property.address || 'Coventry, UK';
  const displayPrice = property.price ?? property.rent ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in">
      <button
        type="button"
        onClick={handleBackToListings}
        className="flex items-center gap-2 text-mainText/40 hover:text-primary transition-colors mb-8 font-bold text-sm uppercase tracking-widest cursor-pointer relative z-20"
      >
        <ArrowLeft size={16} /> Back to Listings
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Image & Basic Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative rounded-3xl overflow-hidden aspect-video shadow-2xl">
            <img src={property.imageUrl} alt={property.propertyName} className="w-full h-full object-cover" />
            <div className="absolute top-6 left-6">
              <CompatibilityBadge score={compatibilityScore} />
            </div>
          </div>

          <div className="glass-panel p-10">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <h1 className="text-4xl font-display font-bold text-mainText mb-2">{property.propertyName}</h1>
                  <div className="flex items-center gap-2 text-mainText/40">
                    <MapPin size={18} />
                    <span className="font-medium">{safeLocation}</span>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-sm font-bold text-mainText/30 uppercase tracking-widest mb-1">Monthly</p>
                  <p className="text-4xl font-display font-bold text-primary">£{displayPrice}</p>
               </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-8">
               {property.ownerId === auth.currentUser?.uid ? (
                 <div className="flex items-center gap-2 px-8 py-4 bg-primary/10 text-primary rounded-2xl font-bold border border-primary/20">
                    <Home size={18} /> You are the owner of this listing
                 </div>
               ) : (
                 <button
                   type="button"
                   onClick={handleContactOwner}
                   className="btn btn-primary px-8 py-4 rounded-2xl flex items-center gap-2 shadow-xl shadow-primary/20 group relative z-20 cursor-pointer"
                 >
                   <MessageSquare size={18} className="group-hover:rotate-12 transition-transform" /> Message Landlord
                 </button>
               )}
               <ShortlistButton 
                 isShortlisted={isShortlisted} 
                 onClick={handleShortlist} 
                 className="h-[56px] w-[56px]"
               />
               <div className="flex items-center gap-2 px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100 text-mainText/60 font-medium">
                  <Sparkles size={18} className="text-primary" />
                  98% Response Rate
               </div>
            </div>

            <p className="text-mainText/60 text-lg leading-relaxed mb-8">
               Modern student living in the heart of {safeLocation}. This property is specifically optimized for students who value 
               {property.environmentType === 'quiet' ? ' peaceful study sessions and a calm atmosphere' : ' a vibrant social life and meeting new people'}.
            </p>

            <div className="mb-10">
               <CompatibilityTagMatcher propertyTags={property.lifestyleTags} studentPrefs={userPrefs} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
               <div className="p-4 bg-gray-50 rounded-2xl flex flex-col items-center text-center">
                  <Zap size={20} className="text-primary mb-2" />
                  <span className="text-[10px] uppercase font-bold text-mainText/30 tracking-widest">Environment</span>
                  <span className="text-sm font-bold capitalize">{property.environmentType}</span>
               </div>
               <div className="p-4 bg-gray-50 rounded-2xl flex flex-col items-center text-center">
                  <ShieldCheck size={20} className="text-primary mb-2" />
                  <span className="text-[10px] uppercase font-bold text-mainText/30 tracking-widest">Smoking</span>
                  <span className="text-sm font-bold capitalize">{property.smokingPolicy}</span>
               </div>
               <div className="p-4 bg-gray-50 rounded-2xl flex flex-col items-center text-center">
                  <Calendar size={20} className="text-primary mb-2" />
                  <span className="text-[10px] uppercase font-bold text-mainText/30 tracking-widest">Guest Policy</span>
                  <span className="text-sm font-bold capitalize">{property.guestPolicy}</span>
               </div>
               <div className="p-4 bg-gray-50 rounded-2xl flex flex-col items-center text-center">
                  <Waves size={20} className="text-primary mb-2" />
                  <span className="text-[10px] uppercase font-bold text-mainText/30 tracking-widest">Cleaning</span>
                  <span className="text-sm font-bold capitalize">{property.cleaningExpectation}</span>
               </div>
            </div>
          </div>

          <div className="glass-panel p-10">
            <h3 className="text-xl font-bold mb-6">Shared Spaces & Amenities</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {sharedSpaces.length > 0 ? (
                sharedSpaces.map((space) => (
                  <div key={space} className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl font-medium text-mainText/70">
                     <Home size={18} className="text-primary/40" />
                     {space}
                  </div>
                ))
              ) : (
                <div className="col-span-full p-4 border border-dashed border-gray-200 rounded-xl text-sm text-mainText/50">
                  Shared spaces are not listed for this property yet.
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel p-10">
            <h3 className="text-xl font-bold mb-8">Travel Infrastructure</h3>
            <div className="bg-gray-50/50 p-8 rounded-3xl border border-gray-100">
               <CommuteInfo commute={property.commute} campusName={property.commute?.campusName} layout="extensive" />
               <div className="mt-8 pt-8 border-t border-gray-100 flex items-center gap-4 text-sm text-mainText/40">
                  <div className={`px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-widest ${property.commute?.rating.bg} ${property.commute?.rating.color}`}>
                     {property.commute?.rating.label} commute
                  </div>
                  <p>Based on proximity to {property.commute?.campusName || 'campus'}.</p>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Compatibility Analysis */}
        <div className="space-y-8">
           <CompatibilityScoreCard score={compatibilityScore} />
           <CompatibilityBreakdown breakdown={property.breakdown} />

           <div className="glass-panel p-8">
              <h3 className="text-lg font-bold mb-4">House Rules</h3>
              <div className="space-y-3">
                 <div className="flex items-start gap-3 text-sm text-mainText/60">
                    <Zap size={16} className="text-primary shrink-0 mt-0.5" />
                    <p>Quiet hours strictly enforced from {property.quietHours === 'late night' ? '11 PM - 7 AM' : '10 PM - 8 AM'}.</p>
                 </div>
                 <div className="flex items-start gap-3 text-sm text-mainText/60">
                    <Zap size={16} className="text-primary shrink-0 mt-0.5" />
                    <p>Cleaning rotation based on {property.cleaningExpectation} standards.</p>
                 </div>
                 <div className="flex items-start gap-3 text-sm text-mainText/60">
                    <Zap size={16} className="text-primary shrink-0 mt-0.5" />
                    <p>Guest visits: {property.guestPolicy === 'restricted' ? 'Prior notice required for overnight stays.' : 'Open and flexible for study groups.'}</p>
                 </div>
               </div>
            </div>

            <CompatibilityFeedbackCard 
              propertyId={property.id} 
              propertyName={property.propertyName} 
              predictedScore={compatibilityScore} 
              moveInDate={new Date()} // Mocking active stay
            />
         </div>
      </div>
    </div>
  );
}
