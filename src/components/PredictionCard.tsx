import React, { useState } from 'react';
import { Prediction } from '../lib/types';
import { formatDistanceToNow, isPast } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { Bot, AlertCircle, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { judgePrediction } from '../services/aiService';
import { settlePrediction } from '../services/dbService';

interface PredictionCardProps {
  prediction: Prediction;
  onBetClick: () => void;
}

export const PredictionCard = ({ prediction, onBetClick }: PredictionCardProps) => {
  const { user } = useAuth();
  const [isJudging, setIsJudging] = useState(false);
  const totalPoolSize = prediction.totalPool.yes + prediction.totalPool.no;
  const yesOdds = totalPoolSize > 0 ? ((prediction.totalPool.yes / totalPoolSize) * 100).toFixed(0) : '50';
  const noOdds = totalPoolSize > 0 ? ((prediction.totalPool.no / totalPoolSize) * 100).toFixed(0) : '50';
  
  const pastDeadline = isPast(new Date(prediction.deadline));
  const isActive = prediction.status === 'active';

  const handleJudge = async () => {
    if (!pastDeadline || !isActive) return;
    setIsJudging(true);
    try {
      const aiResult = await judgePrediction(prediction.title, prediction.criteria);
      await settlePrediction(prediction.id, aiResult.result as 'yes' | 'no', aiResult.reason);
    } catch(err) {
      console.error(err);
      alert("Failed to judge prediction: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsJudging(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      <div className="p-5">
        <div className="flex justify-between items-start gap-4 mb-3">
          <h3 className="text-lg font-semibold text-slate-900 leading-snug">{prediction.title}</h3>
          {(isActive && pastDeadline) && (
            <span className="shrink-0 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Pending Judgment
            </span>
          )}
          {prediction.status === 'resolved' && (
            <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${prediction.result === 'yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {prediction.result === 'yes' ? <CheckCircle2 className="w-3 h-3"/> : <XCircle className="w-3 h-3"/> }
              {prediction.result?.toUpperCase()}
            </span>
          )}
        </div>

        <p className="text-sm text-slate-500 mb-4 line-clamp-2" title={prediction.criteria}>
          Criteria: {prediction.criteria}
        </p>

        <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
               <div className="bg-emerald-500 h-full" style={{ width: `${yesOdds}%` }} />
               <div className="bg-rose-500 h-full" style={{ width: `${noOdds}%` }} />
            </div>
            <div className="text-xs font-medium text-slate-500 w-24 text-right">
              Y {yesOdds}% / N {noOdds}%
            </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
            <div className="text-sm text-slate-500">
              {isActive && !pastDeadline ? (
                <>Ends {formatDistanceToNow(new Date(prediction.deadline), { addSuffix: true })}</>
              ) : (
                 <>Ended {formatDistanceToNow(new Date(prediction.deadline), { addSuffix: true })}</>
              )}
               <span className="mx-2">•</span>
               {totalPoolSize} pts pool
            </div>

            {isActive && !pastDeadline && (
              <button 
                onClick={onBetClick}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                disabled={!user}
                title={!user ? "Login to bet" : ""}
              >
                Predict
              </button>
            )}

            {isActive && pastDeadline && (
               <div className="flex items-center gap-2">
                 <button 
                  onClick={handleJudge}
                  disabled={isJudging}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                 >
                   <Bot className="w-4 h-4" />
                   {isJudging ? "AI is judging..." : "Judge Result"}
                 </button>
               </div>
            )}
        </div>

        {prediction.status === 'resolved' && prediction.reason && (
           <div className={`mt-4 p-3 ${prediction.result === null ? 'bg-slate-100 border-slate-200' : 'bg-slate-50 border-slate-100'} rounded-xl border flex gap-3 text-sm text-slate-700`}>
              {prediction.result === null ? (
                 <RotateCcw className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              ) : (
                 <Bot className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-semibold text-slate-900 block mb-1">
                  {prediction.result === null ? 'Cancelled' : 'AI Verdict'}
                </span>
                {prediction.reason}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
