import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase/config';
import { UserSession, MemberRole } from '../types';
import { mockUsers } from '../mockData';

interface AuthContextType {
  currentUser: UserSession | null;
  firebaseUser: User | null;
  loading: boolean;
  authError: string | null;
  setAuthError: (error: string | null) => void;
  switchUser: (userId: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Deterministic passwords for mock users to support seamless real-auth switching
const DEFAULT_PASSWORD = 'SolSecurePassword2026!';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Authenticate or register a mock user in Firebase Authentication
  const authenticateAndSyncUser = async (mockId: string) => {
    const mock = mockUsers.find(u => u.id === mockId) || mockUsers[0];
    try {
      setAuthError(null);
      // 1. Try to sign in
      const userCred = await signInWithEmailAndPassword(auth, mock.email, DEFAULT_PASSWORD);
      return userCred.user;
    } catch (err: any) {
      // If we are offline or network fails, gracefully log in directly with the mock user session
      const isNetworkError = err.code === 'auth/network-request-failed' || 
                             err.message?.includes('offline') || 
                             err.message?.includes('Failed to get document') ||
                             err.message?.includes('client is offline');
      
      if (isNetworkError) {
        console.warn('Network error or offline during authentication, logging in offline with mock user:', mock.name);
        setCurrentUser({
          id: mock.id,
          name: mock.name,
          email: mock.email,
          phone: mock.phone,
          role: mock.role,
          avatarUrl: mock.avatarUrl
        });
        return null;
      }

      // 2. If user doesn't exist, create them
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, mock.email, DEFAULT_PASSWORD);
          // Create user document in Firestore to persist role and other properties
          await setDoc(doc(db, 'users', userCred.user.uid), {
            uid: userCred.user.uid,
            email: mock.email,
            displayName: mock.name,
            photoURL: mock.avatarUrl,
            phone: mock.phone,
            role: mock.role,
            language: 'creole',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            mockId: mock.id // track association
          });
          return userCred.user;
        } catch (createErr: any) {
          console.error('Failed to register mock user in Firebase Auth:', createErr);
          const isCreateOffline = createErr.message?.includes('offline') || 
                                  createErr.code === 'unavailable' ||
                                  createErr.message?.includes('client is offline');
          if (isCreateOffline) {
            setCurrentUser({
              id: mock.id,
              name: mock.name,
              email: mock.email,
              phone: mock.phone,
              role: mock.role,
              avatarUrl: mock.avatarUrl
            });
            return null;
          }
          setAuthError(`Lajistrasyon otopilot echwe: ${createErr.message || createErr}`);
        }
      } else {
        console.error('Firebase Auth signin failed:', err);
        setAuthError(`Koneksyon otomatiko echwe: ${err.message || err}`);
      }
    }
    return null;
  };

  useEffect(() => {
    // Listen to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      if (u) {
        try {
          setAuthError(null);
          // Fetch the user's detailed profile from their Firestore document
          const docRef = doc(db, 'users', u.uid);
          let docSnap;
          try {
            docSnap = await getDoc(docRef);
          } catch (fetchErr: any) {
            console.warn('Firestore fetch failed, checking if we can use offline fallback:', fetchErr);
            const isOfflineError = fetchErr.message?.includes('offline') || 
                                   fetchErr.code === 'unavailable' || 
                                   fetchErr.message?.includes('Failed to get document') ||
                                   fetchErr.message?.includes('client is offline');
            
            if (isOfflineError) {
              const matchedMock = mockUsers.find(mu => mu.email === u.email);
              const userSessionData: UserSession = {
                id: matchedMock?.id || u.uid,
                name: u.displayName || matchedMock?.name || 'Offline User',
                email: u.email || '',
                phone: matchedMock?.phone || '',
                role: matchedMock?.role || 'member',
                avatarUrl: u.photoURL || matchedMock?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              };
              setCurrentUser(userSessionData);
              setLoading(false);
              return;
            } else {
              throw fetchErr;
            }
          }
          
          if (docSnap && docSnap.exists()) {
            const data = docSnap.data();
            setCurrentUser({
              id: data.mockId || u.uid, // maintain compatibility with existing sol relation IDs
              name: data.displayName || u.displayName || 'Unknown User',
              email: data.email || u.email || '',
              phone: data.phone || '',
              role: (data.role as MemberRole) || 'member',
              avatarUrl: data.photoURL || u.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            });
          } else {
            // Find matched mock user by email
            const matchedMock = mockUsers.find(mu => mu.email === u.email);
            const userSessionData: UserSession = {
              id: matchedMock?.id || u.uid,
              name: u.displayName || matchedMock?.name || 'Anonymous User',
              email: u.email || '',
              phone: matchedMock?.phone || '',
              role: matchedMock?.role || 'member',
              avatarUrl: u.photoURL || matchedMock?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            };

            // Provision user document
            try {
              await setDoc(docRef, {
                uid: u.uid,
                email: userSessionData.email,
                displayName: userSessionData.name,
                photoURL: userSessionData.avatarUrl,
                phone: userSessionData.phone,
                role: userSessionData.role,
                language: 'creole',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                mockId: matchedMock?.id || u.uid
              });
            } catch (setErr: any) {
              console.warn('Failed to provision user document offline:', setErr);
              const isSetOffline = setErr.message?.includes('offline') || 
                                  setErr.code === 'unavailable' ||
                                  setErr.message?.includes('client is offline');
              if (!isSetOffline) {
                throw setErr;
              }
            }

            setCurrentUser(userSessionData);
          }
        } catch (err: any) {
          console.error('Error fetching/syncing user document:', err);
          setAuthError(`Erè nan rekipere done pwofil yo: ${err.message || err}`);
          setCurrentUser(null);
        }
      } else {
        const isLoggedOut = localStorage.getItem('logged_out') === 'true';
        if (isLoggedOut) {
          setCurrentUser(null);
        } else {
          // No user is logged in. Automatically authenticate default user (Maman Sol / Marie)
          // to maintain approved mockup context without forcing sign-in screens.
          const defaultMock = mockUsers[0];
          try {
            await authenticateAndSyncUser(defaultMock.id);
          } catch (autoErr: any) {
            console.warn('Auto auth failed:', autoErr);
            // Fallback directly
            setCurrentUser({
              id: defaultMock.id,
              name: defaultMock.name,
              email: defaultMock.email,
              phone: defaultMock.phone,
              role: defaultMock.role,
              avatarUrl: defaultMock.avatarUrl
            });
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const switchUser = async (userId: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      localStorage.setItem('logged_out', 'false');
      await signOut(auth);
      await authenticateAndSyncUser(userId);
    } catch (err: any) {
      console.error('Error switching user: ', err);
      setAuthError(`Lè w ap chanje itilizatè: ${err.message || err}`);
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      localStorage.setItem('logged_out', 'false');
      const provider = new GoogleAuthProvider();
      // Use signInWithPopup which works great within embedded/iframe previews
      const userCred = await signInWithPopup(auth, provider);
      const u = userCred.user;
      
      // Sync immediately on login block to guarantee persistence without relying solely on listener trigger
      const docRef = doc(db, 'users', u.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        const matchedMock = mockUsers.find(mu => mu.email === u.email);
        const userSessionData: UserSession = {
          id: matchedMock?.id || u.uid,
          name: u.displayName || matchedMock?.name || 'Anonymous User',
          email: u.email || '',
          phone: matchedMock?.phone || '',
          role: matchedMock?.role || 'member',
          avatarUrl: u.photoURL || matchedMock?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        };

        await setDoc(docRef, {
          uid: u.uid,
          email: userSessionData.email,
          displayName: userSessionData.name,
          photoURL: userSessionData.avatarUrl,
          phone: userSessionData.phone,
          role: userSessionData.role,
          language: 'creole',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          mockId: matchedMock?.id || u.uid
        });
      }
    } catch (err: any) {
      console.error('Failed to log in with Google:', err);
      let friendlyMessage = 'Koneksyon Google la echwe. Tanpri tcheke rezo w epi eseye ankò.';
      if (err.code === 'auth/popup-closed-by-user') {
        friendlyMessage = 'Fenèt koneksyon Google la fèmen poukont li san li pa fini.';
      } else if (err.code === 'auth/network-request-failed') {
        friendlyMessage = 'Erè rezo. Pa ka konekte ak sèvè Google Auth la.';
      } else if (err.message) {
        friendlyMessage = `Erè koneksyon: ${err.message}`;
      }
      setAuthError(friendlyMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      localStorage.setItem('logged_out', 'true');
      await signOut(auth);
    } catch (err: any) {
      console.error('Failed to log in/out:', err);
      setAuthError(`Erè dekoneksyon: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, loading, authError, setAuthError, switchUser, loginWithGoogle, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
