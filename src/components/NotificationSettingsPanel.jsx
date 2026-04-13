import React, { useState, useEffect } from 'react';
import { Settings, Save, BellRing, Mail, AppWindow, Smartphone } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function NotificationSettingsPanel() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    compatibilityThreshold: 80,
    notificationPreferences: {
      inApp: true,
      email: true,
      push: false
    }
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.compatibilityThreshold) {
            setSettings(prev => ({ ...prev, compatibilityThreshold: data.compatibilityThreshold }));
          }
          if (data.notificationPreferences) {
            setSettings(prev => ({ ...prev, notificationPreferences: { ...prev.notificationPreferences, ...data.notificationPreferences } }));
          }
        }
      } else {
        const localUser = localStorage.getItem('userSettings');
        if (localUser) setSettings(JSON.parse(localUser));
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    try {
      if (auth.currentUser && auth.app.options.apiKey !== 'dummy-api-key') {
        await setDoc(doc(db, "users", auth.currentUser.uid), {
          compatibilityThreshold: settings.compatibilityThreshold,
          notificationPreferences: settings.notificationPreferences
        }, { merge: true });
      } else {
        localStorage.setItem('userSettings', JSON.stringify(settings));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error saving notification settings", err);
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = (key) => {
    setSettings(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [key]: !prev.notificationPreferences[key]
      }
    }));
  };

  return (
    <div className="glass-panel p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl text-primary">
          <Settings size={22} />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-mainText">Property Alerts</h2>
          <p className="text-sm font-medium text-mainText/40">Set your compatibility threshold for automatic notifications.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8 relative z-10">
        <div>
           <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-4">
             Minimum Compatibility Score
           </label>
           <div className="flex items-center gap-4">
             <div className="relative flex-1">
               <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-display font-bold text-lg">
                 {settings.compatibilityThreshold}%
               </span>
               <select 
                  value={settings.compatibilityThreshold}
                  onChange={(e) => setSettings({...settings, compatibilityThreshold: Number(e.target.value)})}
                  className="input-field pl-16 py-4 font-bold appearance-none bg-gray-50/50"
               >
                 <option value={70}>70% - Any viable match</option>
                 <option value={80}>80% - Strong matches only</option>
                 <option value={90}>90% - Near-perfect matches (Strict)</option>
               </select>
               <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-mainText/30">
                 ▼
               </div>
             </div>
           </div>
        </div>

        <div>
           <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-4">
             Notification Type
           </label>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div 
               onClick={() => togglePreference('inApp')}
               className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${settings.notificationPreferences.inApp ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 bg-white text-mainText/50 hover:border-primary/20 hover:bg-gray-50'}`}
             >
               <AppWindow size={20} />
               <span className="font-bold flex-1">In-App Alerts</span>
               <div className={`w-5 h-5 rounded flex items-center justify-center ${settings.notificationPreferences.inApp ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                 {settings.notificationPreferences.inApp && '✓'}
               </div>
             </div>
             
             <div 
               onClick={() => togglePreference('email')}
               className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${settings.notificationPreferences.email ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 bg-white text-mainText/50 hover:border-primary/20 hover:bg-gray-50'}`}
             >
               <Mail size={20} />
               <span className="font-bold flex-1">Email Alerts</span>
               <div className={`w-5 h-5 rounded flex items-center justify-center ${settings.notificationPreferences.email ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                 {settings.notificationPreferences.email && '✓'}
               </div>
             </div>

             <div 
               onClick={() => togglePreference('push')}
               className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${settings.notificationPreferences.push ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 bg-white text-mainText/50 hover:border-primary/20 hover:bg-gray-50'}`}
             >
               <Smartphone size={20} />
               <span className="font-bold flex-1">Push Notifications</span>
               <div className={`w-5 h-5 rounded flex items-center justify-center ${settings.notificationPreferences.push ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                 {settings.notificationPreferences.push && '✓'}
               </div>
             </div>
           </div>
        </div>

        <button 
           type="submit" 
           disabled={loading}
           className="btn btn-primary w-full sm:w-auto px-8"
        >
           {loading ? 'Saving...' : (
               <span className="flex items-center gap-2">
                 <Save size={18} /> {saved ? 'Settings Saved!' : 'Save Preferences'}
               </span>
           )}
        </button>
      </form>
    </div>
  );
}
