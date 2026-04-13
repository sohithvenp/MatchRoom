import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { uploadImageFile } from '../services/storageService';
import { mockCampuses } from '../utils/mockData';
import { getDefaultConstraints, normalizeCampusId, sanitizeConstraints } from '../utils/userModel';
import StarRatingComponent from '../components/StarRatingComponent';
import { 
  User, 
  Camera, 
  Trash2, 
  Save, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Settings,
  History,
  Calendar,
  Building,
  Download,
  Star
} from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [profile, setProfile] = useState({
    fullName: '',
    studyYear: 'First Year',
    course: '',
    about: '',
    photoURL: null,
    basicProfileComplete: false,
    preferredCampusId: 'c1',
    constraints: getDefaultConstraints()
  });
  const [activeTab, setActiveTab] = useState('profile');
  const [feedbackList, setFeedbackList] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const uid = auth.currentUser?.uid || localStorage.getItem('user');
      
      if (!uid) {
        navigate('/auth');
        return;
      }

      try {
        if (auth.app.options.apiKey === 'dummy-api-key') {
          const localProfile = JSON.parse(localStorage.getItem('userProfileData') || '{}');
          if (localProfile.fullName) {
            setProfile(prev => ({
              ...prev,
              ...localProfile,
              preferredCampusId: normalizeCampusId(localProfile.preferredCampusId),
              constraints: sanitizeConstraints(localProfile.constraints || JSON.parse(localStorage.getItem('userConstraints') || 'null') || getDefaultConstraints())
            }));
          }
        } else {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfile(prev => ({
              ...prev,
              fullName: data.name || data.fullName || '',
              studyYear: data.studyYear || 'First Year',
              course: data.course || '',
              about: data.about || data.preferences || '',
              photoURL: data.photoURL || null,
              basicProfileComplete: data.basicProfileComplete || false,
              preferredCampusId: normalizeCampusId(data.preferredCampusId),
              constraints: sanitizeConstraints(data.constraints || getDefaultConstraints())
            }));
            if (Array.isArray(data.lifestyleVector)) {
              localStorage.setItem('userVector', JSON.stringify(data.lifestyleVector));
            }
            if (data.constraints) {
              localStorage.setItem('userConstraints', JSON.stringify(sanitizeConstraints(data.constraints)));
            }
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  useEffect(() => {
    const fetchFeedback = async () => {
      const uid = auth.currentUser?.uid || localStorage.getItem('user');
      if (!uid || activeTab !== 'history') return;

      setLoadingFeedback(true);
      try {
        if (auth.app.options.apiKey === 'dummy-api-key') {
          // Check local storage for all keys starting with feedback_
          const items = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('feedback_')) {
              items.push(JSON.parse(localStorage.getItem(key)));
            }
          }
          setFeedbackList(items.sort((a,b) => new Date(b.submissionDate) - new Date(a.submissionDate)));
        } else {
          const q = query(
            collection(db, "compatibilityFeedback"),
            where("userId", "==", uid)
          );
          const snap = await getDocs(q);
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          rows.sort((a, b) => {
            const aTime = a.submissionDate?.seconds
              ? a.submissionDate.seconds * 1000
              : new Date(a.submissionDate || 0).getTime();
            const bTime = b.submissionDate?.seconds
              ? b.submissionDate.seconds * 1000
              : new Date(b.submissionDate || 0).getTime();
            return bTime - aTime;
          });
          setFeedbackList(rows);
        }
      } catch (err) {
        console.error("Error fetching feedback:", err);
      } finally {
        setLoadingFeedback(false);
      }
    };

    fetchFeedback();
  }, [activeTab]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError('Photo size should be less than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, photoURL: reader.result }));
        setSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setProfile(prev => ({ ...prev, photoURL: null }));
    setSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const uid = auth.currentUser?.uid || localStorage.getItem('user');

    try {
      let resolvedPhotoUrl = profile.photoURL;
      const selectedFile = fileInputRef.current?.files?.[0] || null;
      const isDemo = auth.app.options.apiKey === 'dummy-api-key';

      if (selectedFile && !isDemo && !auth.currentUser) {
        throw new Error('Please sign in again before uploading a profile photo.');
      }

      if (selectedFile && auth.currentUser) {
        resolvedPhotoUrl = await uploadImageFile(selectedFile, 'profile-photos', uid);
      }

      const resolvedConstraints = sanitizeConstraints(profile.constraints);
      const updatedProfile = {
        ...profile,
        photoURL: resolvedPhotoUrl,
        preferredCampusId: normalizeCampusId(profile.preferredCampusId),
        constraints: resolvedConstraints,
        basicProfileComplete: true,
        updatedAt: new Date().toISOString()
      };

      if (auth.app.options.apiKey === 'dummy-api-key') {
        localStorage.setItem('userProfileData', JSON.stringify(updatedProfile));
        // Also update the general 'user' name if needed
        const userBasic = JSON.parse(localStorage.getItem('userLifestyle') || '{}');
        localStorage.setItem('userLifestyle', JSON.stringify({ ...userBasic, name: profile.fullName, preferredCampusId: updatedProfile.preferredCampusId }));
        localStorage.setItem('userConstraints', JSON.stringify(resolvedConstraints));
      } else {
        await setDoc(doc(db, "users", uid), {
          name: profile.fullName,
          fullName: profile.fullName,
          studyYear: profile.studyYear,
          course: profile.course,
          about: profile.about,
          photoURL: resolvedPhotoUrl,
          preferredCampusId: updatedProfile.preferredCampusId,
          constraints: resolvedConstraints,
          basicProfileComplete: true,
          updatedAt: new Date()
        }, { merge: true });
        localStorage.setItem('userConstraints', JSON.stringify(resolvedConstraints));
      }
      
      setProfile(updatedProfile);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (feedbackList.length === 0) return;

    const exportData = feedbackList.map(item => ({
      PropertyName: item.propertyName,
      PropertyID: item.propertyId,
      UserID: item.userId || auth.currentUser?.uid,
      PredictedCompatibility: item.predictedCompatibilityScore,
      ActualSatisfaction: item.satisfactionRating,
      Date: item.submissionDate?.seconds 
        ? new Date(item.submissionDate.seconds * 1000).toISOString() 
        : new Date(item.submissionDate).toISOString(),
      Comment: item.feedbackComment || ''
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `research_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-mainText/40 font-medium">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-fade-in">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h1 className="text-4xl font-display font-bold text-mainText mb-2">My Account</h1>
           <p className="text-mainText/40 text-lg">Manage your identity and view your living experience history.</p>
        </div>
        
        <div className="flex bg-gray-100 p-1.5 rounded-2xl">
           <button 
             type="button"
             onClick={() => setActiveTab('profile')}
             className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'profile' ? 'bg-white text-primary shadow-sm' : 'text-mainText/40 hover:text-mainText/60'}`}
           >
             <Settings size={16} /> Profile
           </button>
           <button 
             type="button"
             onClick={() => setActiveTab('history')}
             className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-primary shadow-sm' : 'text-mainText/40 hover:text-mainText/60'}`}
           >
             <History size={16} /> Feedback
           </button>
        </div>
      </div>

      {activeTab === 'profile' && (
        <>
          <form onSubmit={handleSave} className="space-y-8">
            {/* Photo Upload Section */}
            <div className="glass-panel p-8 flex flex-col items-center md:flex-row gap-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-3xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-primary/20 transition-all group-hover:border-primary/50">
                  {profile.photoURL ? (
                    <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-mainText/20" />
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 p-2.5 bg-primary text-white rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"
                >
                  <Camera size={18} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-bold text-mainText mb-2">Profile Photo</h3>
                <p className="text-sm text-mainText/40 mb-4 max-w-xs">Upload a clear photo to help potential roommates recognize you.</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold uppercase tracking-widest text-primary hover:text-primary-dark transition-colors"
                  >
                    Change Photo
                  </button>
                  {profile.photoURL && (
                    <button 
                      type="button"
                      onClick={removePhoto}
                      className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Info Section */}
            <div className="glass-panel p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-mainText/30 uppercase tracking-widest ml-1">
                    <User size={14} /> Full Name
                  </label>
                  <input 
                    type="text" 
                    name="fullName"
                    value={profile.fullName}
                    onChange={handleInputChange}
                    placeholder="e.g. Oliver Smith"
                    className="input-field py-4"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-mainText/30 uppercase tracking-widest ml-1">
                    <GraduationCap size={14} /> Year of Study
                  </label>
                  <select 
                    name="studyYear"
                    value={profile.studyYear}
                    onChange={handleInputChange}
                    className="input-field py-4 appearance-none"
                  >
                    <option>First Year</option>
                    <option>Second Year</option>
                    <option>Third Year</option>
                    <option>Final Year</option>
                    <option>Postgraduate</option>
                    <option>PhD Student</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-mainText/30 uppercase tracking-widest ml-1">
                  <BookOpen size={14} /> Course Level & Name
                </label>
                <input 
                  type="text" 
                  name="course"
                  value={profile.course}
                  onChange={handleInputChange}
                  placeholder="e.g. BSc Computer Science"
                  className="input-field py-4"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-mainText/30 uppercase tracking-widest ml-1">
                  <FileText size={14} /> Preferences & About Me
                </label>
                <textarea 
                  name="about"
                  value={profile.about}
                  onChange={handleInputChange}
                  placeholder="Tell us a bit about what you're looking for in a home and roommates..."
                  className="input-field py-4 min-h-[120px] resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-mainText/30 uppercase tracking-widest ml-1">
                    <Building size={14} /> Reference University
                  </label>
                  <select
                    name="preferredCampusId"
                    value={profile.preferredCampusId}
                    onChange={(e) => setProfile((prev) => ({ ...prev, preferredCampusId: e.target.value }))}
                    className="input-field py-4 appearance-none"
                  >
                    {mockCampuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-mainText/30 uppercase tracking-widest ml-1">
                    <Download size={14} /> Max Monthly Budget (GBP)
                  </label>
                  <input
                    type="number"
                    value={profile.constraints.maxBudget}
                    onChange={(e) => setProfile((prev) => ({ ...prev, constraints: { ...prev.constraints, maxBudget: Number(e.target.value || 0) } }))}
                    className="input-field py-4"
                    min="200"
                    max="4000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-mainText/30 uppercase tracking-widest ml-1">
                    <Calendar size={14} /> Max Commute (minutes)
                  </label>
                  <input
                    type="number"
                    value={profile.constraints.maxCommute}
                    onChange={(e) => setProfile((prev) => ({ ...prev, constraints: { ...prev.constraints, maxCommute: Number(e.target.value || 0) } }))}
                    className="input-field py-4"
                    min="5"
                    max="120"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-mainText/30 uppercase tracking-widest ml-1">
                    <Star size={14} /> Minimum Compatibility (%)
                  </label>
                  <input
                    type="number"
                    value={profile.constraints.minCompatibility}
                    onChange={(e) => setProfile((prev) => ({ ...prev, constraints: { ...prev.constraints, minCompatibility: Number(e.target.value || 0) } }))}
                    className="input-field py-4"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-500 animate-shake">
                <AlertCircle size={20} />
                <p className="text-sm font-semibold">{error}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-4">
              <button 
                type="submit" 
                disabled={saving}
                className="btn btn-primary w-full sm:w-auto px-10 py-4 text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
              >
                {saving ? (
                  <>Saving...</>
                ) : saved ? (
                  <>
                    <CheckCircle2 size={20} /> Changes Saved
                  </>
                ) : (
                  <>
                    <Save size={20} /> Save Profile Information
                  </>
                )}
              </button>

              {profile.basicProfileComplete && (
                <button 
                  type="button"
                  onClick={() => navigate('/questionnaire')}
                  className="btn btn-secondary w-full sm:w-auto px-10 py-4 text-lg flex items-center justify-center gap-3 group border-primary/10"
                >
                  Continue to Questionnaire <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </form>

          {!profile.basicProfileComplete && (
            <div className="mt-8 p-6 bg-primary/5 border border-primary/10 rounded-3xl flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary mt-1">
                <AlertCircle size={18} />
              </div>
              <div>
                <h4 className="font-bold text-mainText mb-1">Step 1: Bio & Details</h4>
                <p className="text-sm text-mainText/50 leading-relaxed font-medium">
                  The lifestyle questionnaire and compatibility matching will unlock once you've saved your basic profile details above.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div className="space-y-8 animate-fade-in text-mainText">
            <div className="glass-panel p-8 bg-primary/5 border-primary/10 flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                     <MessageSquare size={24} />
                  </div>
                  <div>
                     <h3 className="text-xl font-bold">Feedback History</h3>
                     <p className="text-sm font-medium text-mainText/40">Your reviews on properties you've matched with.</p>
                  </div>
               </div>
               {feedbackList.length > 0 && (
                 <button 
                   type="button"
                   onClick={handleExportCSV}
                   className="btn btn-secondary px-6 py-3 rounded-xl flex items-center gap-2 text-xs"
                 >
                   <Download size={16} /> Export Research Data (CSV)
                 </button>
               )}
            </div>

           {loadingFeedback ? (
              <div className="flex flex-col items-center py-20">
                 <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                 <p className="text-sm font-bold text-mainText/30 uppercase tracking-widest">Retrieving history...</p>
              </div>
           ) : feedbackList.length === 0 ? (
              <div className="glass-panel p-16 text-center border-dashed border-2">
                 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <History size={32} className="text-mainText/10" />
                 </div>
                 <h4 className="text-lg font-bold text-mainText/40 mb-2">No feedback submitted yet</h4>
                 <p className="text-sm text-mainText/30 max-w-xs mx-auto mb-8">Once you move into a property, you can provide feedback on the accuracy of our prediction.</p>
                 <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-primary px-8">Browse Properties</button>
              </div>
           ) : (
              <div className="space-y-6">
                 {feedbackList.map((item, idx) => (
                    <div key={idx} className="glass-panel p-8 hover:shadow-xl transition-all border-gray-100 group">
                       <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
                          <div className="flex items-start gap-5">
                             <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-gray-100 group-hover:border-primary/20 transition-colors">
                                <Building size={24} className="text-mainText/20" />
                             </div>
                             <div>
                                <h4 className="text-xl font-bold group-hover:text-primary transition-colors">{item.propertyName}</h4>
                                <div className="flex items-center gap-3 mt-1">
                                   <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-mainText/30">
                                      <Calendar size={12} />
                                      {item.submissionDate?.seconds ? new Date(item.submissionDate.seconds * 1000).toLocaleDateString() : new Date(item.submissionDate).toLocaleDateString()}
                                   </div>
                                   <div className="w-1 h-1 bg-gray-200 rounded-full" />
                                   <div className="text-[10px] font-black uppercase tracking-widest text-primary">
                                      Predicted: {item.predictedCompatibilityScore}%
                                   </div>
                                </div>
                             </div>
                          </div>
                          <div className="shrink-0 flex items-center justify-end">
                             <StarRatingComponent rating={item.satisfactionRating} readOnly={true} />
                          </div>
                       </div>
                       
                       {item.feedbackComment && (
                          <div className="p-6 bg-gray-50/50 rounded-2xl border border-gray-100 relative quote-style">
                             <p className="text-mainText/70 font-medium leading-relaxed italic">
                                "{item.feedbackComment}"
                             </p>
                          </div>
                       )}
                    </div>
                 ))}
              </div>
           )}
        </div>
      )}
    </div>
  );
}
