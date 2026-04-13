import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, ChevronRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, writeBatch } from 'firebase/firestore';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Demo mode: Local mock data if auth isn't setup
    if (!auth.currentUser || auth.app.options.apiKey === 'dummy-api-key') {
       const initialMocks = [
          {
             id: 'n1',
             title: 'New Compatible Property Found',
             propertyName: 'Greenwood Apartments',
             propertyId: 'p1',
             compatibilityScore: 85,
             message: 'A new listing matches your 80% threshold!',
             read: false,
             createdAt: new Date()
          },
          {
             id: 'n2',
             title: 'Top Match Alert',
             propertyName: 'The Tower Residences',
             propertyId: 'p4',
             compatibilityScore: 92,
             message: 'Near-perfect match added to the platform.',
             read: true,
             createdAt: new Date(Date.now() - 86400000)
          }
       ];
       setNotifications(initialMocks);
       setUnreadCount(initialMocks.filter(n => !n.read).length);
       return;
    }

    // Real Firebase listener
    if (auth.currentUser) {
       const q = query(
          collection(db, `users/${auth.currentUser.uid}/notifications`),
          orderBy('createdAt', 'desc')
       );
       const unsubscribe = onSnapshot(q, (snapshot) => {
          const notifs = [];
          let unread = 0;
          snapshot.forEach((doc) => {
             const data = doc.data();
             notifs.push({ id: doc.id, ...data });
             if (!data.read) unread++;
          });
          setNotifications(notifs);
          setUnreadCount(unread);
       });
       return () => unsubscribe();
    }
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
     if (auth.currentUser && auth.app.options.apiKey !== 'dummy-api-key') {
        const batch = writeBatch(db);
        notifications.filter(n => !n.read).forEach(n => {
           const ref = doc(db, `users/${auth.currentUser.uid}/notifications`, n.id);
           batch.set(ref, { read: true }, { merge: true });
        });
        await batch.commit();
     } else {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
     }
  };

  const markAsRead = async (id) => {
     if (auth.currentUser && auth.app.options.apiKey !== 'dummy-api-key') {
        const ref = doc(db, `users/${auth.currentUser.uid}/notifications`, id);
        await setDoc(ref, { read: true }, { merge: true });
     } else {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
     }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
         onClick={() => setIsOpen(!isOpen)}
         className={`relative p-2.5 rounded-xl transition-all duration-300 ${isOpen ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-50 text-mainText/40 hover:text-primary hover:bg-primary/10'}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full translate-x-1/4 -translate-y-1/4" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-[120%] right-0 w-80 sm:w-96 bg-white/90 backdrop-blur-3xl shadow-2xl rounded-3xl border border-gray-100 overflow-hidden animate-slide-up origin-top-right z-50">
           <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white/50">
              <h3 className="font-display font-bold text-lg text-mainText">Notifications</h3>
              {unreadCount > 0 && (
                 <button onClick={markAllAsRead} className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors">
                    <Check size={14} /> Mark all read
                 </button>
              )}
           </div>
           
           <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                 <div className="p-8 text-center text-mainText/40">
                    <Bell className="mx-auto mb-3 opacity-20" size={32} />
                    <p className="font-medium">No new notifications</p>
                 </div>
              ) : (
                 <div className="flex flex-col">
                    {notifications.map(notification => (
                       <NotificationCard 
                          key={notification.id} 
                          notification={notification} 
                          onRead={() => markAsRead(notification.id)} 
                       />
                    ))}
                 </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}

function NotificationCard({ notification, onRead }) {
   const navigate = useNavigate();
   const isHighMatch = notification.compatibilityScore >= 90;

   const handleClick = () => {
      onRead();
      if (notification.type === 'message' && notification.chatId) {
        navigate(`/messages?chat=${notification.chatId}`);
        return;
      }
      if (notification.propertyId) navigate(`/property/${notification.propertyId}`);
   };

   return (
      <div 
         onClick={handleClick}
         className={`p-5 flex items-start gap-4 cursor-pointer transition-colors border-b last:border-0 border-gray-50 hover:bg-gray-50/80 ${!notification.read ? 'bg-primary/5' : ''}`}
      >
         <div className={`mt-1 flex-shrink-0 p-2 rounded-xl text-white ${isHighMatch ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-secondary'}`}>
            <CheckCircle2 size={18} />
         </div>
         <div className="flex-1 w-full">
            <h4 className={`text-sm font-bold ${!notification.read ? 'text-mainText' : 'text-mainText/70'} mb-1`}>
               {notification.title}
            </h4>
            <p className="text-xs text-mainText/50 mb-3 leading-relaxed">
               {notification.message}
            </p>
            <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between group">
               <div>
                  <p className="text-xs font-bold text-mainText truncate max-w-[140px] sm:max-w-[200px]">{notification.propertyName}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${isHighMatch ? 'text-primary' : 'text-secondary'}`}>
                     {notification.type === 'message' ? 'Message Alert' : `${notification.compatibilityScore}% Match`}
                  </p>
               </div>
               <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-mainText/30 group-hover:bg-primary group-hover:text-white transition-colors">
                  <ChevronRight size={14} />
               </div>
            </div>
         </div>
      </div>
   );
}
