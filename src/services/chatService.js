import { 
  db 
} from '../firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';

/**
 * Starts or retrieves an existing chat between two users
 */
export async function startChat(currentUserId, otherUserId, propertyData = null) {
  const chatId = [currentUserId, otherUserId].sort().join('_');
  const chatRef = doc(db, 'chats', chatId);

  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      participants: [currentUserId, otherUserId],
      lastMessage: propertyData ? `Inquiry about ${propertyData.propertyName}` : 'New conversation started',
      lastTimestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      propertyId: propertyData?.id || null,
      propertyName: propertyData?.propertyName || null,
    });
  }

  return chatId;
}

/**
 * Sends a message in a specific chat
 */
export async function sendMessage(chatId, senderId, text) {
  if (!text.trim()) return;

  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) {
    throw new Error('Chat not found');
  }
  const chatData = chatSnap.data();
  
  // 1. Add message to subcollection or root collection
  // Recommendation: messages in a top-level collection with chatId for better querying
  const messageRef = collection(db, 'messages');
  await addDoc(messageRef, {
    chatId: chatId,
    senderId: senderId,
    participants: chatData.participants || [],
    text: text,
    timestamp: serverTimestamp()
  });

  // 2. Update chat metadata (best-effort — message already saved; avoid failing the whole send)
  try {
    await updateDoc(chatRef, {
      lastMessage: text,
      lastTimestamp: serverTimestamp(),
      lastSenderId: senderId
    });
  } catch (e) {
    console.warn('Could not update chat preview metadata:', e);
  }

  // 3. Notify recipients (landlord/seeker on opposite side)
  const recipients = (chatData.participants || []).filter((id) => id !== senderId);
  if (recipients.length === 0) return;

  const senderInfo = await getUserBasicInfo(senderId);
  const senderName = senderInfo?.name || senderInfo?.fullName || 'A user';
  const preview = text.length > 90 ? `${text.slice(0, 90)}...` : text;

  // Optional: do not fail the whole send if notification writes are denied (e.g. landlord placeholder uid).
  await Promise.all(
    recipients.map(async (recipientId) => {
      try {
        const notifRef = doc(collection(db, `users/${recipientId}/notifications`));
        await setDoc(notifRef, {
          type: 'message',
          title: `New message from ${senderName}`,
          message: preview,
          propertyId: chatData.propertyId || null,
          propertyName: chatData.propertyName || 'Conversation',
          chatId,
          senderId,
          recipientId,
          read: false,
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Could not create message notification for', recipientId, e);
      }
    })
  );
}

/**
 * Listens to messages for a specific chat
 */
export function listenToMessages(chatId, callback) {
  // Removing orderBy here to avoid requiring a composite index.
  // We will sort client-side instead.
  const q = query(
    collection(db, 'messages'),
    where('chatId', '==', chatId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side sort: Chronological order
      const sortedMessages = messages.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeA - timeB;
      });

      callback(sortedMessages);
    },
    (error) => {
      console.error('Failed to listen to chat messages:', error);
      callback([]);
    }
  );
}

export function listenToUserChats(userId, callback) {
  // Removing orderBy here to avoid requiring a composite index in Firestore.
  // We will sort client-side instead.
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Client-side sort: Latest messages first
    const sortedChats = chats.sort((a, b) => {
      const timeA = a.lastTimestamp?.toMillis() || 0;
      const timeB = b.lastTimestamp?.toMillis() || 0;
      return timeB - timeA;
    });
    
    callback(sortedChats);
  });
}

/**
 * Fetches basic info for a specific user
 */
export async function getUserBasicInfo(userId) {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      return userSnap.data();
    }
  } catch (e) {
    console.warn("Could not fetch user info", e);
  }
  return null;
}

/**
 * Marks all message notifications linked to a chat as read
 * for the currently logged in user when they open the chat thread.
 */
export async function markChatNotificationsAsRead(userId, chatId) {
  if (!userId || !chatId) return;
  try {
    const q = query(
      collection(db, `users/${userId}/notifications`),
      where('chatId', '==', chatId)
    );
    const snap = await getDocs(q);
    const unreadDocs = snap.docs.filter((d) => !d.data().read);
    if (unreadDocs.length === 0) return;

    const batch = writeBatch(db);
    unreadDocs.forEach((d) => {
      batch.set(d.ref, { read: true }, { merge: true });
    });
    await batch.commit();
  } catch (e) {
    console.warn('Could not mark message notifications as read:', e);
  }
}
