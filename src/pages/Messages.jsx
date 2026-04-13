import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Send, 
  User, 
  Search, 
  ArrowLeft,
  Clock,
  Home
} from 'lucide-react';
import { auth, db } from '../firebase';
import { 
  listenToUserChats, 
  listenToMessages, 
  sendMessage,
  getUserBasicInfo,
  markChatNotificationsAsRead
} from '../services/chatService';

export default function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const activeChatId = queryParams.get('chat');
  
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [participantInfo, setParticipantInfo] = useState({});
  const scrollRef = useRef(null);

  // 1. Listen to user's chats
  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/auth');
      return;
    }

    const unsub = listenToUserChats(auth.currentUser.uid, async (data) => {
      setChats(data);
      setLoading(false);

      // Resolve participant names
      data.forEach(async (chat) => {
        const otherId = chat.participants.find(p => p !== auth.currentUser.uid);
        if (otherId && !participantInfo[otherId]) {
          const info = await getUserBasicInfo(otherId);
          if (info) {
             setParticipantInfo(prev => ({ ...prev, [otherId]: info.name || info.fullName || 'User' }));
          }
        }
      });
    });

    return () => unsub();
  }, [navigate]);

  // 2. Listen to messages when a chat is selected
  useEffect(() => {
    if (!activeChatId) return;

    const unsub = listenToMessages(activeChatId, (data) => {
      setMessages(data);
    });

    if (auth.currentUser) {
      markChatNotificationsAsRead(auth.currentUser.uid, activeChatId);
    }

    return () => unsub();
  }, [activeChatId]);

  // 3. Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || !activeChatId) return;

    setNewMessage('');
    try {
      await sendMessage(activeChatId, auth.currentUser.uid, trimmed);
    } catch (err) {
      console.error('Failed to send message:', err);
      setNewMessage(trimmed);
    }
  };

  const activeChat = chats.find(c => c.id === activeChatId);

  if (loading) return <div className="h-screen flex items-center justify-center">Loading Communications...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 h-[calc(100vh-100px)]">
      <div className="glass-panel overflow-hidden h-full flex flex-col md:flex-row border-2 border-primary/5 shadow-2xl">
        
        {/* Sidebar: Chat List */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-gray-100 flex flex-col bg-gray-50/30 ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
           <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-display font-bold text-mainText flex items-center gap-3">
                 <MessageSquare className="text-primary" /> Conversations
              </h2>
           </div>
           
           <div className="flex-1 overflow-y-auto">
              {chats.length === 0 ? (
                <div className="p-10 text-center opacity-40 italic">No messages yet.</div>
              ) : (
                chats.map(chat => (
                  <div 
                    key={chat.id}
                    onClick={() => navigate(`/messages?chat=${chat.id}`)}
                    className={`p-6 cursor-pointer border-b border-gray-50 transition-all ${activeChatId === chat.id ? 'bg-white shadow-lg z-10 scale-[1.02] border-l-4 border-l-primary' : 'hover:bg-white/50'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                       <div className="flex flex-col">
                          <span className="font-bold text-mainText capitalize leading-tight">
                             {chat.propertyName || "Inquiry Conversation"}
                          </span>
                          <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">
                             {participantInfo[chat.participants.find(p => p !== auth.currentUser.uid)] || "Loading..."}
                          </span>
                       </div>
                       {chat.lastTimestamp && (
                         <span className="text-[10px] text-mainText/30 font-bold uppercase">
                            {new Date(chat.lastTimestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                       )}
                    </div>
                    <p className="text-sm text-mainText/40 truncate font-medium">
                       {chat.lastMessage}
                    </p>
                  </div>
                ))
              )}
           </div>
        </div>

        {/* Main: Message View */}
        <div className={`flex-1 flex flex-col bg-white ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
           {activeChatId ? (
             <>
               {/* Chat Header */}
               <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <button onClick={() => navigate('/messages')} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft size={20} />
                     </button>
                     <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Home size={20} />
                     </div>
                     <div>
                        <h3 className="font-bold text-mainText">{activeChat?.propertyName || "Conversation"}</h3>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                           Chatting with {participantInfo[activeChat?.participants.find(p => p !== auth.currentUser.uid)] || "..."}
                        </p>
                     </div>
                  </div>
               </div>

               {/* Messages Scroller */}
               <div 
                 ref={scrollRef}
                 className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/20"
               >
                  {messages.map((m) => {
                    const isOwn = m.senderId === auth.currentUser.uid;
                    return (
                      <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-5 py-3 rounded-2xl text-sm font-medium shadow-sm ${
                          isOwn 
                            ? 'bg-primary text-white rounded-tr-none' 
                            : 'bg-white border border-gray-100 text-mainText/70 rounded-tl-none'
                        }`}>
                          {m.text}
                          <div className={`text-[9px] mt-1.5 opacity-50 text-right ${isOwn ? 'text-white' : 'text-mainText/40'}`}>
                             {m.timestamp && new Date(m.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
               </div>

               {/* Input Area */}
               <form onSubmit={handleSend} className="p-6 border-t border-gray-100">
                  <div className="flex gap-4">
                     <input 
                       type="text"
                       value={newMessage}
                       onChange={(e) => setNewMessage(e.target.value)}
                       placeholder="Type your inquiry here..."
                       className="flex-1 bg-gray-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 outline-none transition-all font-medium"
                     />
                     <button 
                       type="submit"
                       className="bg-primary text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all active:scale-95"
                     >
                        <Send size={20} />
                     </button>
                  </div>
               </form>
             </>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-30">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                   <MessageSquare size={48} />
                </div>
                <h3 className="text-2xl font-display font-bold mb-2">Select a Conversation</h3>
                <p className="max-w-xs font-medium">Inquire about properties to start chatting with landlords and potential flatmates.</p>
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
