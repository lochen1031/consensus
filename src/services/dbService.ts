import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, runTransaction, Timestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Prediction, Bet, UserProfile, OperationType, FirestoreErrorInfo } from '../lib/types';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const d = await getDoc(doc(db, 'users', userId));
    return d.exists() ? (d.data() as UserProfile) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

export async function initializeUserProfile(user: any) {
  const path = `users/${user.uid}`;
  try {
    const profile = await getUserProfile(user.uid);
    if (!profile) {
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || null,
        points: 1000,
        createdAt: Date.now(),
        lastDailyClaim: null,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export const DAILY_REWARD_AMOUNT = 100;

export async function claimDailyReward(userId: string) {
  const path = `users/${userId}`;
  try {
    await runTransaction(db, async (t) => {
      const uRef = doc(db, 'users', userId);
      const uDoc = await t.get(uRef);
      if (!uDoc.exists()) throw new Error("User not found");
      
      const user = uDoc.data() as UserProfile;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      
      if (user.lastDailyClaim && user.lastDailyClaim >= todayStart) {
        throw new Error("Already claimed today");
      }
      
      t.update(uRef, {
        points: user.points + DAILY_REWARD_AMOUNT,
        lastDailyClaim: Date.now()
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function createPrediction(creatorId: string, title: string, criteria: string, deadline: number) {
  const newRef = doc(collection(db, 'predictions'));
  const path = `predictions/${newRef.id}`;
  const prediction: Prediction = {
    id: newRef.id,
    creatorId,
    title,
    criteria,
    deadline,
    status: 'active',
    result: null,
    reason: null,
    totalPool: { yes: 0, no: 0 },
    createdAt: Date.now()
  };
  try {
    await setDoc(newRef, prediction);
    return newRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function placeBet(userId: string, predictionId: string, option: 'yes'|'no', amount: number) {
  const betRef = doc(collection(db, 'bets'));
  const userRef = doc(db, 'users', userId);
  const predictionRef = doc(db, 'predictions', predictionId);
  const path = `bets/${betRef.id}`;

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const predictionDoc = await transaction.get(predictionRef);

      if (!userDoc.exists() || !predictionDoc.exists()) throw new Error("Document not found");
      const user = userDoc.data() as UserProfile;
      const prediction = predictionDoc.data() as Prediction;

      if (user.points < amount) throw new Error("Not enough points");
      if (prediction.status !== 'active') throw new Error("Prediction is not active");
      if (Date.now() > prediction.deadline) throw new Error("Deadline passed");

      const newPoolStr = option === 'yes' ? 'totalPool.yes' : 'totalPool.no';

      transaction.set(betRef, {
        id: betRef.id,
        predictionId,
        userId,
        option,
        amount,
        createdAt: Date.now()
      });
      transaction.update(userRef, { points: user.points - amount });
      transaction.update(predictionRef, { [newPoolStr]: prediction.totalPool[option] + amount });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function settlePrediction(predictionId: string, result: 'yes' | 'no', reason: string) {
  const predictionRef = doc(db, 'predictions', predictionId);
  const path = `predictions/${predictionId}`;
  
  try {
    const predDoc = await getDoc(predictionRef);
    if(!predDoc.exists()) throw new Error("Prediction not found");
    const pred = predDoc.data() as Prediction;

    if (pred.status === 'resolved') throw new Error("Already resolved");

    const betsQuery = query(collection(db, 'bets'), where('predictionId', '==', predictionId));
    const betsSnapshot = await getDocs(betsQuery);

    const totalWinningPool = pred.totalPool[result] || 0;
    const totalLosingPool = pred.totalPool[result === 'yes' ? 'no' : 'yes'] || 0;
    const totalPool = totalWinningPool + totalLosingPool;

    // Calculate payouts
    // If no one bet on the winning side, maybe just refund or keep. MVP: If winning pool is 0, no payouts.
    if (totalWinningPool > 0) {
      const userPayouts: Record<string, number> = {};
      betsSnapshot.forEach(betDoc => {
        const bet = betDoc.data() as Bet;
        if (bet.option === result) {
          // Payout = bet amount + proportional share of losing pool
          const share = bet.amount / totalWinningPool;
          const winnings = share * totalLosingPool;
          const totalPayout = bet.amount + winnings;
          
          userPayouts[bet.userId] = (userPayouts[bet.userId] || 0) + totalPayout;
        }
      });

      // Update user points
      for (const [userId, payout] of Object.entries(userPayouts)) {
        await runTransaction(db, async (t) => {
          const uRef = doc(db, 'users', userId);
          const uDoc = await t.get(uRef);
          if (uDoc.exists()) {
             const u = uDoc.data() as UserProfile;
             t.update(uRef, { points: u.points + payout });
          }
        });
      }
    }

    // Update prediction status
    await updateDoc(predictionRef, {
      status: 'resolved',
      result,
      reason
    });

  } catch(err) {
      handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function cancelAndRefundPrediction(predictionId: string) {
  const predictionRef = doc(db, 'predictions', predictionId);
  const path = `predictions/${predictionId}`;
  
  try {
    let canProceed = false;
    await runTransaction(db, async (t) => {
      const predDoc = await t.get(predictionRef);
      if (!predDoc.exists()) return;
      const pred = predDoc.data() as Prediction;

      if (pred.status !== 'active') {
         return;
      }

      t.update(predictionRef, { status: 'resolving' });
      canProceed = true;
    });

    if (!canProceed) return;

    const betsQuery = query(collection(db, 'bets'), where('predictionId', '==', predictionId));
    const betsSnapshot = await getDocs(betsQuery);

    const userRefunds: Record<string, number> = {};
    const betDocRefs: any[] = [];
    betsSnapshot.forEach(betDoc => {
      const bet = betDoc.data() as Bet;
      userRefunds[bet.userId] = (userRefunds[bet.userId] || 0) + bet.amount;
      betDocRefs.push(betDoc.ref);
    });

    for (const [userId, refund] of Object.entries(userRefunds)) {
      await runTransaction(db, async (t) => {
        const uRef = doc(db, 'users', userId);
        const uDoc = await t.get(uRef);
        if (uDoc.exists()) {
           const u = uDoc.data() as UserProfile;
           t.update(uRef, { points: u.points + refund });
        }
      });
    }

    // Delete the prediction
    await deleteDoc(predictionRef);
    
    // Clean up bets as best effort
    for (const ref of betDocRefs) {
      await deleteDoc(ref).catch(() => {});
    }

  } catch(err) {
      handleFirestoreError(err, OperationType.WRITE, path);
  }
}

