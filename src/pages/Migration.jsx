import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { mockProperties } from '../utils/mockData';
import { Database, Upload, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { ensureOptimizationFields, toUkAddress } from '../utils/propertyModel';

export default function MigrationPage() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const pushData = async () => {
    setLoading(true);
    setStatus('Pushing properties to Firestore...');
    try {
      let count = 0;
      for (const prop of mockProperties) {
        // Remove id to let Firestore generate one, or keep it? 
        // Better to let Firestore generate so it's consistent with AddProperty.jsx
        const { id, ...data } = prop;
        await addDoc(collection(db, 'properties'), ensureOptimizationFields({
          ...data,
          address: toUkAddress(data.address || data.location || data.propertyName),
          location: toUkAddress(data.location || data.address || data.propertyName),
          ownerId: data.ownerId || 'mock_landlord_1',
          countryCode: 'GB',
          createdAt: new Date().toISOString()
        }));
        count++;
      }
      setStatus(`Successfully pushed ${count} properties to "properties" collection.`);
    } catch (error) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  const clearData = async () => {
    if (!window.confirm('Delete all properties from database?')) return;
    setLoading(true);
    setStatus('Clearing properties...');
    try {
      const snap = await getDocs(collection(db, 'properties'));
      let count = 0;
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'properties', d.id));
        count++;
      }
      setStatus(`Cleared ${count} property documents.`);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-20 min-h-screen">
      <div className="glass-panel p-10 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6">
          <Database size={32} />
        </div>
        <h1 className="text-3xl font-display font-bold text-mainText mb-4">Database Migration</h1>
        <p className="text-mainText/50 mb-10 font-medium">
          Synchronize your local mock data with the live Firestore production database.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <button 
            onClick={pushData} 
            disabled={loading}
            className="btn btn-primary py-4 flex items-center justify-center gap-2 rounded-2xl"
          >
            <Upload size={18} /> Push Mock Data
          </button>
          <button 
            onClick={clearData} 
            disabled={loading}
            className="btn bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 py-4 flex items-center justify-center gap-2 rounded-2xl"
          >
            <Trash2 size={18} /> Clear Firestore
          </button>
        </div>

        {status && (
          <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold animate-fade-in ${status.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {status.includes('Error') ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
