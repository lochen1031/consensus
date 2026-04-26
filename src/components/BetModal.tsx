import React, { useState } from 'react';
import { placeBet } from '../services/dbService';
import { useAuth } from '../contexts/AuthContext';
import { Prediction } from '../lib/types';
import { X, CheckCircle2, XCircle } from 'lucide-react';

interface BetModalProps {
  prediction: Prediction;
  onClose: () => void;
}

export const BetModal = ({ prediction, onClose }: BetModalProps) => {
  const { user } = useAuth();
  const [option, setOption] = useState<'yes' | 'no' | null>(null);
  const [amount, setAmount] = useState<number>(10);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !option || amount <= 0 || amount > user.points) return;
    
    setLoading(true);
    try {
      await placeBet(user.id, prediction.id, option, amount);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to place bet. Check your balance.');
    } finally {
      setLoading(false);
    }
  };

  const presetAmounts = [10, 50, 100, "Max"];

  const setAmountHandler = (val: number | string) => {
    if (val === 'Max') {
      setAmount(Math.floor(user?.points || 0));
    } else {
      setAmount(val as number);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 line-clamp-1 pr-4">{prediction.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
           <form id="bet-form" onSubmit={handleSubmit} className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setOption('yes')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${option === 'yes' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50 text-slate-600'}`}
                >
                  <CheckCircle2 className={`w-8 h-8 ${option === 'yes' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className="font-bold text-lg">YES</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOption('no')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${option === 'no' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 hover:border-rose-200 hover:bg-rose-50/50 text-slate-600'}`}
                >
                  <XCircle className={`w-8 h-8 ${option === 'no' ? 'text-rose-500' : 'text-slate-400'}`} />
                  <span className="font-bold text-lg">NO</span>
                </button>
             </div>

             <div>
               <div className="flex justify-between items-end mb-2">
                 <label className="block text-sm font-medium text-slate-700">Amount to predict</label>
                 <span className="text-xs text-slate-500">Balance: {Math.floor(user?.points || 0)} pts</span>
               </div>
               <div className="relative">
                 <input 
                   type="number" 
                   value={amount || ''}
                   onChange={(e) => setAmount(Number(e.target.value))}
                   min={1}
                   max={Math.floor(user?.points || 0)}
                   className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-lg font-bold text-slate-800"
                   placeholder="100"
                   required
                 />
                 <span className="absolute right-4 top-1/2 -translate-y-1/2 font-medium text-slate-400">pts</span>
               </div>
               
               <div className="flex gap-2 mt-3">
                 {presetAmounts.map((amt) => (
                   <button
                     key={amt}
                     type="button"
                     onClick={() => setAmountHandler(amt)}
                     className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg transition-colors"
                   >
                     {amt}
                   </button>
                 ))}
               </div>
             </div>
           </form>
        </div>
        
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 hover:bg-slate-200 bg-slate-100 text-slate-700 font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="bet-form"
            disabled={loading || !option || amount <= 0 || amount > (user?.points || 0)}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors min-w-[120px]"
          >
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
