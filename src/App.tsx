import { useState, useEffect } from 'react';
import { SignageState } from './types';
import { INITIAL_SIGNAGE_STATE } from './initialData';
import AdminDashboard from './components/AdminDashboard';
import SignageDisplay from './components/SignageDisplay';
import { PRESET_LAYOUTS } from './initialData';

export default function App() {
  const [state, setState] = useState<SignageState>(INITIAL_SIGNAGE_STATE);
  const [isStandaloneDisplay, setIsStandaloneDisplay] = useState(false);

  // 1. Detect Mode from Query Parameter (?mode=display)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'display') {
      setIsStandaloneDisplay(true);
    }
  }, []);

  // 2. Initialize and Synchronize State across tabs via LocalStorage
  useEffect(() => {
    const LOCAL_STORAGE_KEY = 'signage_system_state';

    // Load initial state
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

    // Storage event listener for cross-tab synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Failed to parse cross-tab storage state', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 3. State update propagation function
  const handleStateChange = (newState: SignageState) => {
    setState(newState);
    localStorage.setItem('signage_system_state', JSON.stringify(newState));
  };

  // 4. Standalone Fullscreen Display Mode
  if (isStandaloneDisplay) {
    const layoutsList = state.layouts || PRESET_LAYOUTS;
    const activeLayout = layoutsList.find((l) => l.id === state.currentLayoutId) || layoutsList[0];
    
    return (
      <div className="w-screen h-screen overflow-hidden bg-black flex items-center justify-center">
        {/* Full View TV Signage with no margins/paddings */}
        <div className="w-full h-full">
          <SignageDisplay state={state} layout={activeLayout} previewMode={false} />
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
