import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { CheckCircle2, MessageSquareText } from 'lucide-react';
import StarRatingComponent from './StarRatingComponent';

export default function CompatibilityFeedbackCard({ propertyId, propertyName, predictedScore, moveInDate }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // 1. Check if they have been living there for 2 weeks (Simulated threshold check)
    // Normally moveInDate would be pulled from a lease document. For this demo, let's assume it's passed or true.
    const isMockMoveInEligible = true;

    // 2. Check if feedback already exists to prevent duplicates
    const checkExistingFeedback = async () => {
       if (auth.currentUser && auth.app.options.apiKey !== 'dummy-api-key') {
           const q = query(
               collection(db, 'compatibilityFeedback'), 
               where('userId', '==', auth.currentUser.uid),
               where('propertyId', '==', propertyId)
           );
           const snap = await getDocs(q);
           if (!snap.empty) {
               setSubmitted(true);
           } else {
               setShouldShow(isMockMoveInEligible);
           }
       } else {
           // Local test override
           const stored = localStorage.getItem(`feedback_${propertyId}`);
           if (stored) setSubmitted(true);
           else setShouldShow(isMockMoveInEligible);
       }
    };

    checkExistingFeedback();
  }, [propertyId]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);

    const feedbackData = {
        userId: auth.currentUser ? auth.currentUser.uid : 'demo-user',
        propertyId,
        propertyName,
        predictedCompatibilityScore: predictedScore,
        satisfactionRating: rating,
        feedbackComment: comment,
        submissionDate: auth.app.options.apiKey !== 'dummy-api-key' ? serverTimestamp() : new Date().toISOString()
    };

    try {
        if (auth.app.options.apiKey === 'dummy-api-key') {
            localStorage.setItem(`feedback_${propertyId}`, JSON.stringify(feedbackData));
            console.log("Mock Feedback Submitted:", feedbackData);
        } else {
            await addDoc(collection(db, 'compatibilityFeedback'), feedbackData);
        }
        setSubmitted(true);
    } catch (err) {
        console.error("Failed to submit feedback", err);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!shouldShow && !submitted) return null;

  if (submitted) {
    return (
      <div className="glass-panel p-8 text-center bg-primary/5 border-primary/20">
         <div className="flex justify-center mb-4 text-green-500">
            <CheckCircle2 size={40} />
         </div>
         <h3 className="text-xl font-bold mb-2">Feedback Received</h3>
         <p className="text-sm font-medium text-mainText/50">Your experience helps train our predictive algorithm for future students.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-8 relative overflow-hidden border-2 border-primary/20 bg-gradient-to-b from-white to-gray-50">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <MessageSquareText size={120} />
      </div>

      <div className="text-center mb-8 relative z-10">
         <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-3">Model Accuracy Analysis</p>
         <h3 className="text-2xl font-display font-bold text-mainText mb-2">How was your stay?</h3>
         <p className="text-sm font-medium text-mainText/40 max-w-sm mx-auto">
            You matched with <strong>{propertyName}</strong> at <strong>{predictedScore}%</strong>. How accurately did this predict your living experience?
         </p>
      </div>

      <div className="mb-8 relative z-10">
         <StarRatingComponent rating={rating} setRating={setRating} />
      </div>

      <div className="space-y-4 relative z-10">
         <div>
            <label className="block text-xs font-bold text-mainText/30 uppercase tracking-widest mb-2 px-1">
              Optional Feedback
            </label>
            <textarea 
               value={comment}
               onChange={(e) => setComment(e.target.value)}
               placeholder="The property was quiet and great for studying, but guests were more frequent than expected..."
               className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm font-medium placeholder:text-mainText/20 min-h-[100px] focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all resize-none"
            />
         </div>

         <button 
            onClick={handleSubmit} 
            disabled={isSubmitting || rating === 0}
            className={`w-full py-4 rounded-xl font-bold text-sm transition-all shadow-md ${rating > 0 && !isSubmitting ? 'bg-primary text-white shadow-primary/20 hover:-translate-y-0.5' : 'bg-gray-100 text-mainText/30 cursor-not-allowed shadow-none'}`}
         >
            {isSubmitting ? 'Submitting...' : 'Submit Satisfaction Feedback'}
         </button>
      </div>
    </div>
  );
}
