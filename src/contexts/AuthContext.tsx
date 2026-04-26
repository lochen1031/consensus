import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserProfile } from '../lib/types';
import { getUserProfile, initializeUserProfile } from '../services/dbService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub: (() => void) | undefined;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await initializeUserProfile(firebaseUser);
        
        const { doc, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        
        profileUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (docInfo) => {
           if (docInfo.exists()) {
             setUser(docInfo.data() as UserProfile);
           }
        });
      } else {
        if (profileUnsub) profileUnsub();
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
        {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
