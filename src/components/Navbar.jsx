import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, User, Compass, LogOut, ArrowRight, PlusCircle, Heart, MessageSquare } from 'lucide-react';
import { NotificationBell } from './Notifications';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function Navbar() {
  const location = useLocation();
  const isLoggedIn = localStorage.getItem('user');

  const handleLogout = async () => {
    try {
      if (auth.currentUser) await signOut(auth);
    } catch {
      // Ignore sign-out errors and clear local state anyway.
    }
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Matches', path: '/results', icon: <Users size={18} /> },
    { label: 'Shortlist', path: '/shortlist', icon: <Heart size={18} /> },
    { label: 'Messages', path: '/messages', icon: <MessageSquare size={18} /> },
    { label: 'Profile', path: '/profile', icon: <User size={18} /> },
    { label: 'Add Property', path: '/add-property', icon: <PlusCircle size={18} /> },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-6 z-50 max-w-6xl mx-auto px-6 pointer-events-none">
      <div className="glass-nav px-8 py-4 flex justify-between items-center pointer-events-auto">
        {/* Logo Section */}
        <div className="flex items-center gap-2.5 group cursor-default">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 transition-transform duration-300">
            <Compass size={24} />
          </div>
          <span className="text-2xl font-display font-bold text-mainText tracking-tight group-hover:text-primary transition-colors">
            MatchRoom
          </span>
        </div>
        
        {/* Navigation Items */}
        <div className="hidden md:flex gap-5 items-center">
          {isLoggedIn ? (
            <>
              {navItems.map((item) => (
                <Link 
                  key={item.path}
                  to={item.path} 
                  className={`flex items-center gap-1.5 text-sm font-semibold transition-all duration-300 relative group py-2 px-1 ${
                    isActive(item.path) ? 'text-primary' : 'text-mainText/40 hover:text-primary'
                  }`}
                >
                  {React.cloneElement(item.icon, { size: 16 })}
                  {item.label}
                  {isActive(item.path) && (
                    <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary rounded-full animate-fade-in" />
                  )}
                </Link>
              ))}
              <div className="h-5 w-px bg-gray-200 mx-1" />
              <NotificationBell />
              <button 
                onClick={handleLogout} 
                className="text-mainText/30 hover:text-red-500 transition-colors flex items-center gap-1.5 font-medium group ml-1"
              >
                <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" /> 
                <span className="text-sm">Logout</span>
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn btn-primary px-8 py-2.5 text-sm rounded-xl">
              Get Started
            </Link>
          )}
        </div>

        {/* Mobile Toggle (Simplified for this task) */}
        <div className="md:hidden flex items-center gap-4">
           {isLoggedIn ? (
             <>
               <NotificationBell />
               <Link to="/profile" className="p-2 bg-gray-50 rounded-lg text-mainText/40">
                 <User size={20} />
               </Link>
             </>
           ) : (
             <Link to="/auth" className="p-2 bg-primary text-white rounded-lg">
               <ArrowRight size={20} />
             </Link>
           )}
        </div>
      </div>
    </nav>
  );
}
