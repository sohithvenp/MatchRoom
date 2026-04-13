import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, UserPlus, LogIn, ArrowRight } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDefaultConstraints } from '../utils/userModel';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (auth.app.options.apiKey === 'dummy-api-key') {
        localStorage.setItem('user', 'demo-user-123');
        navigate(isLogin ? '/dashboard' : '/questionnaire');
        return;
      }

      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem('user', userCredential.user.uid);
        navigate('/dashboard');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: email,
          createdAt: serverTimestamp(),
          role: 'student',
          profileComplete: false,
          basicProfileComplete: false,
          preferredCampusId: 'c1',
          constraints: getDefaultConstraints(),
          countryCode: 'GB'
        });
        localStorage.setItem('user', userCredential.user.uid);
        navigate('/profile');
      }
    } catch (err) {
      setError(err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' ? "Invalid credentials." : "Auth failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center pt-24 pb-32 animate-fade-in px-6">
      <div className="glass-panel w-full max-w-md p-10 md:p-12">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-display font-bold text-mainText mb-3">
            {isLogin ? "Welcome Back" : "Join Community"}
          </h2>
          <p className="text-mainText/40 font-medium">
            {isLogin ? "Access your high-fidelity matches" : "Start your professional matching journey"}
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 text-red-500 rounded-2xl text-sm font-semibold border border-red-100 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-mainText/30 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-mainText/20" size={18} />
              <input 
                type="email" 
                required
                className="input-field pl-12" 
                placeholder="university-id@student.ac.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-mainText/30 uppercase tracking-widest ml-1">Secure Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-mainText/20" size={18} />
              <input 
                type="password" 
                required
                className="input-field pl-12" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full mt-6 py-4 rounded-2xl text-lg group"
            disabled={loading}
          >
            {loading ? "Verifying..." : isLogin ? "Login Securely" : "Create Profile"}
            {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-gray-100 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:text-primary-hover transition-colors text-sm font-bold tracking-tight"
          >
            {isLogin ? "New to MatchRoom? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
