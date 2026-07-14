import { useState, useEffect } from 'react';
import { SignageState } from './types';
import { INITIAL_SIGNAGE_STATE } from './initialData';
import AdminDashboard from './components/AdminDashboard';
import SignageDisplay from './components/SignageDisplay';
import { PRESET_LAYOUTS } from './initialData';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const [state, setState] = useState<SignageState>(INITIAL_SIGNAGE_STATE);
  const [isStandaloneDisplay, setIsStandaloneDisplay] = useState(false);

  // 1. Detect Mode from Query Parameter (?mode=display)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'display') {
          setIsStandaloneDisplay(true);
        }
      }
    } catch (e) {
      console.warn("Unable to access window.location.search safely inside iframe:", e);
    }
  }, []);

  // 2. Synchronize State in Real-Time across all devices via Firebase Firestore (with LocalStorage fallback)
  useEffect(() => {
    const docRef = doc(db, 'signage', 'global_state');
    
    // Listen to real-time updates from cloud Firestore
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const cloudState = snapshot.data() as SignageState;
        setState(cloudState);
        // Keep LocalStorage updated as local fallback
        localStorage.setItem('signage_system_state', JSON.stringify(cloudState));
      } else {
        // Document doesn't exist yet, seed it with the initial state in the database
        setDoc(docRef, INITIAL_SIGNAGE_STATE)
          .catch(err => console.error("Error seeding initial Firestore state:", err));
      }
    }, (error) => {
      console.warn("Firestore subscription failed or blocked, falling back to LocalStorage:", error);
      
      // Offline fallback: Use traditional LocalStorage sync
      const LOCAL_STORAGE_KEY = 'signage_system_state';
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          setState(JSON.parse(saved));
        } catch (e) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SIGNAGE_STATE));
        }
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SIGNAGE_STATE));
      }
    });

    // Local cross-tab storage fallback for offline use
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'signage_system_state' && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Failed to parse storage fallback state', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 3. State update propagation function (Writes to Firestore for instant cross-device updates)
  const handleStateChange = async (newState: SignageState) => {
    setState(newState);
    localStorage.setItem('signage_system_state', JSON.stringify(newState));
    
    try {
      const docRef = doc(db, 'signage', 'global_state');
      await setDoc(docRef, newState);
    } catch (err) {
      console.error("Failed to sync updated state to Firestore:", err);
    }
  };

  // 4. Standalone Fullscreen Display Mode
  if (isStandaloneDisplay) {
    const layoutsList = state.layouts || PRESET_LAYOUTS;
    const activeLayout = layoutsList.find((l) => l.id === state.currentLayoutId) || layoutsList[0];
    
    return (
      <div className="w-screen h-screen overflow-hidden bg-black flex items-center justify-center">
        {/* Full View TV Signage with no margins/paddings */}
        <div className="w-full h-full">
          <SignageDisplay state={state} layout={activeLayout} previewMode={false} onChange={handleStateChange} />
        </div>
      </div>
    );
  }

  // 5. Normal Admin Dashboard Mode with inline Preview Monitor
  return (
    <AdminDashboard 
      state={state} 
      onChange={handleStateChange} 
    />
  );
}
