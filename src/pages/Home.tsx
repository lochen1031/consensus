import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Prediction } from '../lib/types';
import { PredictionCard } from '../components/PredictionCard';
import { CreatePredictionModal } from '../components/CreatePredictionModal';
import { BetModal } from '../components/BetModal';
import { useAuth } from '../contexts/AuthContext';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cancelAndRefundPrediction } from '../services/dbService';

export const Home = () => {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);

  useEffect(() => {
    // Background janitor: automatically clean up and refund expired predictions
    const janitor = setInterval(() => {
      setPredictions(current => {
        current.forEach(p => {
          if (p.status === 'active' && Date.now() >= p.deadline) {
            cancelAndRefundPrediction(p.id).catch(err => console.error("Janitor error:", err));
          }
        });
        return current;
      });
    }, 5000);

    return () => clearInterval(janitor);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'predictions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const preds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Prediction);
      setPredictions(preds);
      setLoading(false);
      
      // Update selected prediction if it changes
      setSelectedPrediction(currentSelected => {
         if (!currentSelected) return null;
         const updated = preds.find(p => p.id === currentSelected.id);
         return updated || null;
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Predictions Explorer</h1>
          <p className="text-slate-500 mt-1">Predict the future and earn points.</p>
        </div>
        {user && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Create
          </button>
        )}
      </div>

      {loading ? (
         <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
         </div>
      ) : predictions.filter(p => p.status === 'active' && Date.now() < p.deadline).length === 0 ? (
         <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No active predictions</h3>
            <p className="text-slate-500 mb-6">Be the first to create an active prediction!</p>
            {user && (
               <button 
                onClick={() => setIsCreateOpen(true)}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm inline-flex items-center gap-2"
               >
                 <Plus className="w-4 h-4" /> Create One
               </button>
            )}
         </div>
      ) : (
        <div className="space-y-6">
          {predictions
            .filter(p => p.status === 'active' && Date.now() < p.deadline)
            .map(pred => (
              <PredictionCard 
                key={pred.id} 
                prediction={pred} 
                onBetClick={() => setSelectedPrediction(pred)}
              />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isCreateOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <CreatePredictionModal onClose={() => setIsCreateOpen(false)} />
          </motion.div>
        )}
        
        {selectedPrediction && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
             <BetModal 
               prediction={selectedPrediction} 
               onClose={() => setSelectedPrediction(null)} 
             />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
