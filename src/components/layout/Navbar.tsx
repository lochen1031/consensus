import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { loginWithGoogle, logout } from '../../lib/firebase';
import { LogIn, LogOut, Coins, Activity, Gift } from 'lucide-react';
import { claimDailyReward, DAILY_REWARD_AMOUNT } from '../../services/dbService';

export const Navbar = () => {
  const { user, loading } = useAuth();
  const [claiming, setClaiming] = useState(false);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const canClaim = user && (!user.lastDailyClaim || user.lastDailyClaim < todayStart);

  const handleClaim = async () => {
    if (!user) return;
    setClaiming(true);
    try {
      await claimDailyReward(user.id);
    } catch (e) {
      alert("Failed to claim: " + (e as Error).message);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <nav className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">Consensus<span className="text-blue-600">AI</span></span>
        </div>

        <div className="flex items-center gap-4">
          {!loading && (
            <>
              {user ? (
                <>
                  {canClaim && (
                    <button 
                      onClick={handleClaim}
                      disabled={claiming}
                      className="flex items-center gap-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      <Gift className="w-4 h-4" />
                      {claiming ? '...' : `Claim ${DAILY_REWARD_AMOUNT}`}
                    </button>
                  )}
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-slate-700">{Math.floor(user.points)} pts</span>
                  </div>
                  <button 
                    onClick={logout}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5 text-slate-500" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={loginWithGoogle}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-full font-medium transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
