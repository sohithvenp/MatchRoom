import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function DecisionConfidenceModal({ isOpen, onClose, onSubmit, taskType }) {
  const [confidence, setConfidence] = useState(0);
  const [suitability, setSuitability] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (confidence === 0 || suitability === 0) return;
    onSubmit({ confidence, suitability });
    setConfidence(0);
    setSuitability(0);
  };

  const scaleButtons = (value, setValue) =>
    [1, 2, 3, 4, 5].map((val) => (
      <button
        key={val}
        type="button"
        onClick={() => setValue(val)}
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl font-display font-bold text-lg transition-all duration-300 transform hover:scale-110 ${
          value === val
            ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-105 border-primary'
            : 'bg-gray-50 text-mainText/30 border-2 border-transparent hover:border-primary/10'
        }`}
      >
        {val}
      </button>
    ));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-mainText/40 animate-fade-in">
      <div className="glass-panel max-w-lg w-full p-8 sm:p-10 bg-white border-2 border-primary/20 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-mainText mb-2">Task complete</h2>
          <p className="text-mainText/40 font-medium text-sm sm:text-base">
            After using the <strong>{taskType === 'baseline' ? 'traditional' : 'MatchRoom'}</strong> listings, please rate the following (1 = low, 5 = high).
          </p>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-bold text-mainText/30 uppercase tracking-[0.2em] text-center">
              Decision confidence (1–5)
            </p>
            <div className="flex justify-between items-center px-1 sm:px-4 gap-1">{scaleButtons(confidence, setConfidence)}</div>
            <div className="flex justify-between px-1 text-[10px] font-bold text-mainText/30 uppercase tracking-widest">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-mainText/30 uppercase tracking-[0.2em] text-center">
              Perceived suitability of your choice (1–5)
            </p>
            <div className="flex justify-between items-center px-1 sm:px-4 gap-1">{scaleButtons(suitability, setSuitability)}</div>
            <div className="flex justify-between px-1 text-[10px] font-bold text-mainText/30 uppercase tracking-widest">
              <span>Poor fit</span>
              <span>Strong fit</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={confidence === 0 || suitability === 0}
            className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl ${
              confidence > 0 && suitability > 0
                ? 'bg-primary text-white shadow-primary/20 hover:-translate-y-1'
                : 'bg-gray-100 text-mainText/20 cursor-not-allowed'
            }`}
          >
            Submit <CheckCircle2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
