import React, { useState } from 'react';
import { createPrediction } from '../services/dbService';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';

interface CreatePredictionModalProps {
  onClose: () => void;
}

export const CreatePredictionModal = ({ onClose }: CreatePredictionModalProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [criteria, setCriteria] = useState('');
  const [hours, setHours] = useState('24');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !criteria.trim() || !hours) return;
    
    setLoading(true);
    try {
      const deadline = Date.now() + (parseInt(hours) * 60 * 60 * 1000);
      await createPrediction(user.id, title.trim(), criteria.trim(), deadline);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to create prediction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex py-10 items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Create Prediction</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
           <form id="create-pred-form" onSubmit={handleSubmit} className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
               <input 
                 type="text" 
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
                 className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                 placeholder="e.g. Will Taipei's temperature drop below 15°C next Monday?"
                 required
                 maxLength={120}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Judgment Criteria</label>
               <textarea 
                 value={criteria}
                 onChange={(e) => setCriteria(e.target.value)}
                 className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none h-24"
                 placeholder="Provide a source or specific conditions for the AI judge. E.g. According to the CWA official website's daily report for Taipei City."
                 required
                 maxLength={300}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Hours)</label>
               <select 
                 value={hours}
                 onChange={(e) => setHours(e.target.value)}
                 className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
               >
                 <option value="1">1 Hour</option>
                 <option value="12">12 Hours</option>
                 <option value="24">24 Hours</option>
                 <option value="72">3 Days</option>
                 <option value="168">7 Days</option>
               </select>
             </div>
           </form>
        </div>
        
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2 hover:bg-slate-200 bg-slate-100 text-slate-700 font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="create-pred-form"
            disabled={loading || !title.trim() || !criteria.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
          >
            {loading ? 'Creating...' : 'Create Prediction'}
          </button>
        </div>
      </div>
    </div>
  );
};
