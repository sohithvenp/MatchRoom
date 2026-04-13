import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Home, PlusCircle, CheckCircle2, AlertCircle, Camera, Upload, X } from 'lucide-react';
import LifestyleTagSelector from '../components/LifestyleTagSelector';
import { uploadImageFile } from '../services/storageService';
import { toUkAddress } from '../utils/propertyModel';

const UK_BOUNDS = {
  minLat: 49.8,
  maxLat: 60.9,
  minLng: -8.6,
  maxLng: 1.8
};

export default function AddProperty() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    propertyName: '',
    rent: '',
    leaseLength: '12 months',
    customLease: '',
    furnishing: 'Furnished',
    propertyType: 'Apartment',
    bedrooms: '',
    bathrooms: '',
    address: '',
    lat: '',
    lng: '',
    environmentType: 'quiet',
    smokingPolicy: 'not allowed',
    guestPolicy: 'flexible',
    studyEnvironment: 'study-friendly',
    cleaningExpectation: 'moderate',
    quietHours: 'late night',
    lifestyleTags: [],
    availabilityDate: '',
    imageUrl: ''
  });

  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size should be less than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.propertyName || !formData.rent || !formData.address || !formData.availabilityDate) {
      setError('Please fill out all required fields.');
      setLoading(false);
      return;
    }

    const newProperty = {
      ...formData,
      rent: Number(formData.rent),
      price: Number(formData.rent),
      currency: 'GBP',
      countryCode: 'GB',
      bedrooms: Number(formData.bedrooms),
      bathrooms: Number(formData.bathrooms),
      lat: Number(formData.lat) || 52.4068, // Default to Coventry center if empty
      lng: Number(formData.lng) || -1.5197,
      address: toUkAddress(formData.address),
      location: toUkAddress(formData.address),
      leaseLength: formData.leaseLength === 'Custom' ? formData.customLease : formData.leaseLength,
      sharedSpaces: ['Kitchen', 'Study Area'],
      tags: [formData.propertyType, formData.furnishing],
      lifestyleTags: formData.lifestyleTags,
      imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=600',
      ownerId: 'mock_landlord_1',
      createdAt: new Date().toISOString()
    };
    
    // Clean up temp field
    delete newProperty.customLease;

    // --- ALGORITHMIC MAPPING ---
    // Map qualitative fields to 1-5 numeric vector for the matching engine
    newProperty.lifestyle = {
      sleep: formData.quietHours === 'late night' ? 2 : formData.quietHours === 'evening' ? 4 : 3,
      cleanliness: formData.cleaningExpectation === 'strict' ? 5 : formData.cleaningExpectation === 'moderate' ? 3 : 1,
      social: formData.environmentType === 'social' ? 5 : 1,
      study: formData.studyEnvironment === 'study-friendly' ? 5 : 3,
      noise: formData.environmentType === 'social' ? 4 : 2
    };
    newProperty.lifestyleVector = [
      newProperty.lifestyle.sleep,
      newProperty.lifestyle.cleanliness,
      newProperty.lifestyle.social,
      newProperty.lifestyle.study,
      newProperty.lifestyle.noise
    ];

    // Placeholder commute time (Real calculation happens on details page via Distance Matrix)
    newProperty.commuteTime = 15; 
    // ---------------------------

    try {
      const isDemo = auth.app.options.apiKey === 'dummy-api-key';
      const currentUser = auth.currentUser;

      if (!isDemo && !currentUser) {
        throw new Error('Please sign in before listing a property.');
      }
      if (!isDemo && currentUser) {
        // Force-refresh token before Storage writes to avoid stale-session auth errors.
        await currentUser.getIdToken(true);
        newProperty.ownerId = currentUser.uid;
      }

      const latInUk = newProperty.lat >= UK_BOUNDS.minLat && newProperty.lat <= UK_BOUNDS.maxLat;
      const lngInUk = newProperty.lng >= UK_BOUNDS.minLng && newProperty.lng <= UK_BOUNDS.maxLng;
      if (!latInUk || !lngInUk) {
        throw new Error('Location must be inside UK coordinates.');
      }

      const selectedFile = fileInputRef.current?.files?.[0] || null;
      if (selectedFile && currentUser) {
        newProperty.imageUrl = await uploadImageFile(selectedFile, 'property-images', currentUser.uid);
      } else if (selectedFile && !isDemo) {
        throw new Error('Image upload requires an authenticated session.');
      }

      if (isDemo) {
        const existing = JSON.parse(localStorage.getItem('localProperties') || '[]');
        newProperty.id = 'local_' + Date.now();
        localStorage.setItem('localProperties', JSON.stringify([...existing, newProperty]));
      } else {
        await addDoc(collection(db, "properties"), newProperty);
      }
      
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error('Error adding property:', err);
      const errorCode = err?.code || '';
      const errorMessage = (err?.message || '').toLowerCase();
      if (errorCode.includes('storage/unauthorized')) {
        setError('Upload denied by Firebase Storage rules. Sign in again and deploy the latest storage rules.');
      } else if (errorCode.includes('storage/unauthenticated')) {
        setError('Your login session expired. Please sign in again and retry.');
      } else if (errorMessage.includes('app check')) {
        setError('Firebase App Check is blocking uploads. Add App Check to the web app or disable Storage App Check enforcement.');
      } else {
        setError(err?.message || 'Failed to add property. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-12 animate-fade-in text-center flex flex-col items-center justify-center min-h-[60vh]">
        <CheckCircle2 size={80} className="text-primary mb-6 animate-slide-up" />
        <h2 className="text-3xl font-display font-bold text-mainText mb-4">Property Listed Successfully!</h2>
        <p className="text-mainText/50 text-lg">Your structured listing is now live and computable by our matching engine.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 animate-fade-in">
      <div className="mb-10 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <Home size={32} />
          </div>
        </div>
        <h1 className="text-4xl font-display font-bold mb-2 text-mainText tracking-tight">Structured Listing Form</h1>
        <p className="text-mainText/50 font-medium">Standardize your property data for our algorithmic matching engine.</p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-500 rounded-2xl text-sm font-semibold border border-red-100 flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 animate-slide-up">
        <div className="glass-panel p-8">
          <h2 className="text-xl font-bold mb-6 border-b border-primary/10 pb-4">Core Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Property Name</label>
              <input 
                type="text" 
                name="propertyName"
                value={formData.propertyName}
                onChange={handleChange}
                placeholder="e.g. Greenwood Apartments"
                className="input-field"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-4">Property Photo</label>
              
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full md:w-64 aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group
                    ${formData.imageUrl ? 'border-primary/20 bg-gray-50' : 'border-gray-200 hover:border-primary/40 hover:bg-primary/5'}
                  `}
                >
                  {formData.imageUrl ? (
                    <>
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <Camera className="text-white" size={24} />
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="text-mainText/20 mb-2 group-hover:text-primary/40 transition-colors" size={32} />
                      <p className="text-xs font-bold text-mainText/30 uppercase tracking-widest group-hover:text-primary/40 transition-colors">Upload Image</p>
                    </>
                  )}
                </div>

                <div className="flex-1 space-y-4">
                  <p className="text-sm text-mainText/40 font-medium leading-relaxed">
                    Upload a high-quality property photo. This is the first thing students see when browsing results.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-mainText/60 hover:bg-gray-50 transition-colors"
                    >
                      {formData.imageUrl ? 'Change Photo' : 'Select File'}
                    </button>
                    {formData.imageUrl && (
                      <button 
                        type="button"
                        onClick={removeImage}
                        className="px-4 py-2 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-500 hover:bg-red-100 transition-colors flex items-center gap-2"
                      >
                        <X size={14} /> Remove
                      </button>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <p className="text-[10px] text-mainText/20 font-bold uppercase tracking-wider">Max size: 2MB. Format: JPG, PNG</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Location / Address</label>
              <input 
                type="text" 
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="e.g. 123 University Drive"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Monthly Rent (£)</label>
              <input 
                type="number" 
                name="rent"
                value={formData.rent}
                onChange={handleChange}
                placeholder="0"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Property Type</label>
              <select name="propertyType" value={formData.propertyType} onChange={handleChange} className="input-field">
                <option value="Apartment">Apartment</option>
                <option value="House">House</option>
                <option value="Studio">Studio</option>
                <option value="Shared Room">Shared Room</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Furnishing Status</label>
              <select name="furnishing" value={formData.furnishing} onChange={handleChange} className="input-field">
                <option value="Furnished">Furnished</option>
                <option value="Semi-Furnished">Semi-Furnished</option>
                <option value="Unfurnished">Unfurnished</option>
              </select>
            </div>

            <div className="flex gap-4">
               <div className="flex-1">
                 <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Bedrooms</label>
                 <input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleChange} className="input-field" min="0" required />
               </div>
               <div className="flex-1">
                 <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Bathrooms</label>
                 <input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleChange} className="input-field" min="0" step="0.5" required />
               </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Latitude</label>
                <input type="number" name="lat" value={formData.lat} onChange={handleChange} placeholder="52.40" step="any" className="input-field" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Longitude</label>
                <input type="number" name="lng" value={formData.lng} onChange={handleChange} placeholder="-1.51" step="any" className="input-field" />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Lease Length</label>
                <select name="leaseLength" value={formData.leaseLength} onChange={handleChange} className="input-field">
                  <option value="6 months">6 Months</option>
                  <option value="12 months">12 Months</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Availability Date</label>
                <input type="date" name="availabilityDate" value={formData.availabilityDate} onChange={handleChange} className="input-field" required />
              </div>
            </div>
            
            {formData.leaseLength === 'Custom' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Custom Duration</label>
                <input type="text" name="customLease" value={formData.customLease} onChange={handleChange} placeholder="e.g. 9 months" className="input-field" required />
              </div>
            )}
            
          </div>
        </div>

        <div className="glass-panel p-8">
          <h2 className="text-xl font-bold mb-6 border-b border-primary/10 pb-4">Lifestyle & Policy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Environment Type</label>
              <select name="environmentType" value={formData.environmentType} onChange={handleChange} className="input-field">
                <option value="quiet">Quiet</option>
                <option value="social">Social</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Smoking Policy</label>
              <select name="smokingPolicy" value={formData.smokingPolicy} onChange={handleChange} className="input-field">
                <option value="not allowed">Not Allowed</option>
                <option value="allowed">Allowed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Guest Policy</label>
              <select name="guestPolicy" value={formData.guestPolicy} onChange={handleChange} className="input-field">
                <option value="flexible">Flexible</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Study Environment</label>
              <select name="studyEnvironment" value={formData.studyEnvironment} onChange={handleChange} className="input-field">
                <option value="study-friendly">Study-Friendly</option>
                <option value="normal">Normal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Cleaning Expectation</label>
              <select name="cleaningExpectation" value={formData.cleaningExpectation} onChange={handleChange} className="input-field">
                <option value="strict">Strict</option>
                <option value="moderate">Moderate</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-mainText/40 uppercase tracking-widest mb-2">Quiet Hours</label>
              <select name="quietHours" value={formData.quietHours} onChange={handleChange} className="input-field">
                <option value="late night">Late Night (11pm+)</option>
                <option value="evening">Evening (9pm+)</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
        </div>

        <div className="glass-panel p-8">
          <h2 className="text-xl font-bold mb-6 border-b border-primary/10 pb-4">Lifestyle Environment</h2>
          <LifestyleTagSelector 
            selectedTags={formData.lifestyleTags} 
            onChange={(tags) => setFormData({ ...formData, lifestyleTags: tags })} 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="btn btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
        >
          {loading ? 'Submitting...' : <><PlusCircle size={20} /> Publish Structured Listing</>}
        </button>
      </form>
    </div>
  );
}
