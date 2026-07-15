import { useState, useEffect } from 'react';
import { SignageState, DisplayItem, AdminUser } from './types';
import { INITIAL_SIGNAGE_STATE } from './initialData';
import AdminDashboard from './components/AdminDashboard';
import SignageDisplay from './components/SignageDisplay';
import AdminLogin from './components/AdminLogin';
import DisplayLogin from './components/DisplayLogin';
import { PRESET_LAYOUTS } from './initialData';
import { doc, onSnapshot, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const [state, setState] = useState<SignageState>(INITIAL_SIGNAGE_STATE);
  const [isStandaloneDisplay, setIsStandaloneDisplay] = useState(false);
  const [displayId, setDisplayId] = useState('global_state');
  const [isDisplayLoggedIn, setIsDisplayLoggedIn] = useState(false);
  
  // Admin selected display being configured
  const [selectedDisplayId, setSelectedDisplayId] = useState('global_state');
  const [displaysList, setDisplaysList] = useState<DisplayItem[]>([]);
  const [displayStatuses, setDisplayStatuses] = useState<Record<string, any>>({});
  
  // Admin users state (Real-Time cross-device synchronization)
  const [adminUsersList, setAdminUsersList] = useState<AdminUser[]>([]);
  const [currentAdminUsername, setCurrentAdminUsername] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('signage_admin_username');
    }
    return null;
  });

  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('signage_admin_logged_in') === 'true';
    }
    return false;
  });

  // 1. Detect Mode from Query Parameter (?mode=display&displayId=...)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'display') {
          setIsStandaloneDisplay(true);
        }
        const queryDisplayId = params.get('displayId');
        if (queryDisplayId) {
          setDisplayId(queryDisplayId);
          setSelectedDisplayId(queryDisplayId);
        }
      }
    } catch (e) {
      console.warn("Unable to access window.location.search safely inside iframe:", e);
    }
  }, []);

  // 1b. Check if standalone display is authenticated
  useEffect(() => {
    if (isStandaloneDisplay) {
      const savedAuth = localStorage.getItem(`display_logged_in_${displayId}`);
      setIsDisplayLoggedIn(savedAuth === 'true');
    }
  }, [isStandaloneDisplay, displayId]);

  // 2. Subscribe to Available Displays List (Cross-device and persistent in Cloud Firestore)
  useEffect(() => {
    const displaysRef = doc(db, 'signage', 'displays_list');
    
    const unsubscribe = onSnapshot(displaysRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.displays)) {
          setDisplaysList(data.displays);
        }
      } else {
        // First-time seed of physical displays
        const INITIAL_DISPLAYS: DisplayItem[] = [
          { id: 'global_state', name: 'Layar Utama (Lobi)', location: 'Lobby Utama Gedung', createdAt: Date.now() },
          { id: 'display_cafeteria', name: 'Layar Kafe & Menu', location: 'Area Kafetaria Lantai Dasar', createdAt: Date.now() },
          { id: 'display_office', name: 'Layar Informasi Kantor', location: 'Ruang Kerja Bersama Lantai 2', createdAt: Date.now() }
        ];
        setDoc(displaysRef, { displays: INITIAL_DISPLAYS })
          .then(() => setDisplaysList(INITIAL_DISPLAYS))
          .catch(err => console.error("Error seeding displays list:", err));
      }
    });

    return () => unsubscribe();
  }, []);

  // 2b. Subscribe to Admin Users list (Cloud Firestore)
  useEffect(() => {
    const adminsRef = doc(db, 'signage', 'admins_list');
    
    const unsubscribe = onSnapshot(adminsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.admins)) {
          setAdminUsersList(data.admins);
        }
      } else {
        // Seed default super administrator
        const INITIAL_ADMINS: AdminUser[] = [
          {
            id: 'admin_root',
            username: 'admin',
            passwordHash: 'admin', // Simple password storage for kiosk system
            fullName: 'Administrator Utama',
            role: 'super_admin',
            createdAt: Date.now()
          }
        ];
        setDoc(adminsRef, { admins: INITIAL_ADMINS })
          .then(() => setAdminUsersList(INITIAL_ADMINS))
          .catch(err => console.error("Error seeding admins list:", err));
      }
    });

    return () => unsubscribe();
  }, []);

  // 2c. Subscribe to Display Status/Heartbeats (Real-Time live reports)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'display_status'), (snapshot) => {
      const statuses: Record<string, any> = {};
      snapshot.forEach((doc) => {
        statuses[doc.id] = doc.data();
      });
      setDisplayStatuses(statuses);
    }, (error) => {
      console.error("Error fetching display statuses:", error);
    });
    return () => unsubscribe();
  }, []);

  // 2d. Send Heartbeat when Standalone Display is Active & Logged In
  useEffect(() => {
    if (!isStandaloneDisplay || !isDisplayLoggedIn || !displayId) return;

    const sendHeartbeat = async () => {
      try {
        const statusRef = doc(db, 'display_status', displayId);
        await setDoc(statusRef, {
          displayId,
          lastSeen: Date.now(),
          status: 'online',
          userAgent: navigator.userAgent,
          currentLayoutId: state.currentLayoutId || 'default'
        }, { merge: true });
      } catch (err) {
        console.error("Failed to send display heartbeat:", err);
      }
    };

    // Send immediately on mount or status change
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 15000); // Heartbeat every 15 seconds

    return () => clearInterval(interval);
  }, [isStandaloneDisplay, isDisplayLoggedIn, displayId, state.currentLayoutId]);

  // 3. Subscribe to current active display state (Real-Time cross-device updates)
  const activeSubscriptionId = isStandaloneDisplay ? displayId : selectedDisplayId;

  useEffect(() => {
    const docRef = doc(db, 'signage_displays', activeSubscriptionId);
    
    const unsubscribe = onSnapshot(docRef, async (snapshot) => {
      if (snapshot.exists()) {
        const cloudState = snapshot.data() as SignageState;
        setState(cloudState);
        localStorage.setItem(`signage_state_${activeSubscriptionId}`, JSON.stringify(cloudState));
      } else {
        // Document doesn't exist yet, seed it
        try {
          if (activeSubscriptionId === 'global_state') {
            // Backward compatibility lookup
            const oldRef = doc(db, 'signage', 'global_state');
            onSnapshot(oldRef, (oldSnapshot) => {
              if (oldSnapshot.exists()) {
                const oldData = oldSnapshot.data() as SignageState;
                setState(oldData);
                setDoc(docRef, oldData);
              } else {
                setDoc(docRef, INITIAL_SIGNAGE_STATE);
              }
            });
          } else {
            await setDoc(docRef, INITIAL_SIGNAGE_STATE);
          }
        } catch (err) {
          console.error("Error initializing display document:", err);
        }
      }
    }, (error) => {
      console.warn(`Firestore display '${activeSubscriptionId}' failed, falling back to local storage:`, error);
      const saved = localStorage.getItem(`signage_state_${activeSubscriptionId}`);
      if (saved) {
        try {
          setState(JSON.parse(saved));
        } catch (e) {
          setState(INITIAL_SIGNAGE_STATE);
        }
      } else {
        setState(INITIAL_SIGNAGE_STATE);
      }
    });

    return () => unsubscribe();
  }, [activeSubscriptionId]);

  // 4. State update propagation (Writes to Firestore for instant display updates)
  const handleStateChange = async (newState: SignageState) => {
    setState(newState);
    localStorage.setItem(`signage_state_${activeSubscriptionId}`, JSON.stringify(newState));
    
    try {
      const docRef = doc(db, 'signage_displays', activeSubscriptionId);
      await setDoc(docRef, newState);
      
      // Mirror to old global_state if needed to prevent breaking legacy systems
      if (activeSubscriptionId === 'global_state') {
        await setDoc(doc(db, 'signage', 'global_state'), newState);
      }
    } catch (err) {
      console.error("Failed to sync updated state to Firestore:", err);
    }
  };

  // 5. Multi-Display Management Actions
  const handleAddDisplay = async (newDisplay: DisplayItem) => {
    const updated = [...displaysList, newDisplay];
    setDisplaysList(updated);
    try {
      await setDoc(doc(db, 'signage', 'displays_list'), { displays: updated });
      // Initialize state for the new display
      await setDoc(doc(db, 'signage_displays', newDisplay.id), INITIAL_SIGNAGE_STATE);
    } catch (err) {
      console.error("Failed to add display in Firestore:", err);
    }
  };

  const handleEditDisplay = async (updatedDisplay: DisplayItem) => {
    const updated = displaysList.map(d => d.id === updatedDisplay.id ? updatedDisplay : d);
    setDisplaysList(updated);
    try {
      await setDoc(doc(db, 'signage', 'displays_list'), { displays: updated });
    } catch (err) {
      console.error("Failed to update display metadata in Firestore:", err);
    }
  };

  const handleDeleteDisplay = async (idToDelete: string) => {
    if (idToDelete === 'global_state') return;
    const updated = displaysList.filter(d => d.id !== idToDelete);
    setDisplaysList(updated);
    try {
      await setDoc(doc(db, 'signage', 'displays_list'), { displays: updated });
      // If deleted was currently configured, fallback to default
      if (selectedDisplayId === idToDelete) {
        setSelectedDisplayId('global_state');
      }
    } catch (err) {
      console.error("Failed to delete display in Firestore:", err);
    }
  };

  // 5b. Admin Users Management Actions
  const handleAddAdmin = async (newAdmin: AdminUser) => {
    const updated = [...adminUsersList, newAdmin];
    setAdminUsersList(updated);
    try {
      await setDoc(doc(db, 'signage', 'admins_list'), { admins: updated });
    } catch (err) {
      console.error("Failed to add admin user to Firestore:", err);
    }
  };

  const handleEditAdmin = async (updatedAdmin: AdminUser) => {
    const updated = adminUsersList.map(u => u.id === updatedAdmin.id ? updatedAdmin : u);
    setAdminUsersList(updated);
    try {
      await setDoc(doc(db, 'signage', 'admins_list'), { admins: updated });
    } catch (err) {
      console.error("Failed to update admin user in Firestore:", err);
    }
  };

  const handleDeleteAdmin = async (idToDelete: string) => {
    if (idToDelete === 'admin_root') return;
    const updated = adminUsersList.filter(u => u.id !== idToDelete);
    setAdminUsersList(updated);
    try {
      await setDoc(doc(db, 'signage', 'admins_list'), { admins: updated });
    } catch (err) {
      console.error("Failed to delete admin user in Firestore:", err);
    }
  };

  const handleSyncTVChannelsToAllDisplays = async (channelsToSync: any[], activeTVChannelIdToSync: string) => {
    try {
      // 1. Sync global_state
      const globalDocId = 'global_state';
      const globalDocRef = doc(db, 'signage_displays', globalDocId);
      
      try {
        await updateDoc(globalDocRef, {
          channels: channelsToSync,
          activeTVChannelId: activeTVChannelIdToSync
        });
      } catch (err) {
        console.warn(`Could not updateDoc for global_state, attempting setDoc:`, err);
        try {
          await setDoc(globalDocRef, {
            ...INITIAL_SIGNAGE_STATE,
            channels: channelsToSync,
            activeTVChannelId: activeTVChannelIdToSync
          });
        } catch (setErr) {
          console.error("Failed to sync global_state:", setErr);
        }
      }

      // Also mirror to legacy path
      try {
        await setDoc(doc(db, 'signage', 'global_state'), {
          ...state,
          channels: channelsToSync,
          activeTVChannelId: activeTVChannelIdToSync
        });
      } catch (err) {
        console.warn("Legacy path write failed:", err);
      }

      // 2. Sync other displays in displaysList
      const promises = displaysList.map(async (display) => {
        if (display.id === 'global_state') return;
        const targetDocRef = doc(db, 'signage_displays', display.id);
        try {
          await updateDoc(targetDocRef, {
            channels: channelsToSync,
            activeTVChannelId: activeTVChannelIdToSync
          });
        } catch (err) {
          console.warn(`Could not updateDoc for display ${display.id}, attempting setDoc:`, err);
          try {
            await setDoc(targetDocRef, {
              ...INITIAL_SIGNAGE_STATE,
              channels: channelsToSync,
              activeTVChannelId: activeTVChannelIdToSync
            });
          } catch (setErr) {
            console.error(`Failed to sync display ${display.id}:`, setErr);
          }
        }
      });

      await Promise.all(promises);
    } catch (err) {
      console.error("Failed to broadcast channels to all displays:", err);
    }
  };

  const handleLoginSuccess = (username: string) => {
    localStorage.setItem('signage_admin_logged_in', 'true');
    localStorage.setItem('signage_admin_username', username);
    setCurrentAdminUsername(username);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('signage_admin_logged_in');
    localStorage.removeItem('signage_admin_username');
    setCurrentAdminUsername(null);
    setIsLoggedIn(false);
  };

  // 6. Standalone TV Display Rendering Mode
  if (isStandaloneDisplay) {
    if (!isDisplayLoggedIn) {
      return (
        <DisplayLogin
          onLoginSuccess={(id) => {
            localStorage.setItem(`display_logged_in_${id}`, 'true');
            setDisplayId(id);
            setSelectedDisplayId(id);
            setIsDisplayLoggedIn(true);
          }}
          displaysList={displaysList}
          adminUsers={adminUsersList}
        />
      );
    }

    const layoutsList = state.layouts || PRESET_LAYOUTS;
    const activeLayout = layoutsList.find((l) => l.id === state.currentLayoutId) || layoutsList[0];
    
    return (
      <div className="w-screen h-screen overflow-hidden bg-black flex items-center justify-center">
        <div className="w-full h-full">
          <SignageDisplay 
            state={state} 
            layout={activeLayout} 
            previewMode={false} 
            onChange={handleStateChange} 
            onLogoutDisplay={() => {
              localStorage.removeItem(`display_logged_in_${displayId}`);
              setIsDisplayLoggedIn(false);
            }}
          />
        </div>
      </div>
    );
  }

  // 7. Security Admin Access Gate
  if (!isLoggedIn) {
    return (
      <AdminLogin 
        onLoginSuccess={handleLoginSuccess} 
        adminUsers={adminUsersList} 
      />
    );
  }

  // Find currently logged-in user object details
  const activeCurrentUser = adminUsersList.find(u => u.username === currentAdminUsername) || {
    id: 'admin_root',
    username: currentAdminUsername || 'admin',
    fullName: 'Administrator',
    role: 'super_admin' as const,
    createdAt: Date.now()
  };

  // 8. Logged-in Administrator Dashboard Panel
  return (
    <AdminDashboard 
      state={state} 
      onChange={handleStateChange}
      displaysList={displaysList}
      displayStatuses={displayStatuses}
      selectedDisplayId={selectedDisplayId}
      onSelectDisplay={setSelectedDisplayId}
      onAddDisplay={handleAddDisplay}
      onEditDisplay={handleEditDisplay}
      onDeleteDisplay={handleDeleteDisplay}
      onLogout={handleLogout}
      adminUsers={adminUsersList}
      currentUser={activeCurrentUser}
      onAddAdmin={handleAddAdmin}
      onEditAdmin={handleEditAdmin}
      onDeleteAdmin={handleDeleteAdmin}
      onSyncTVChannelsToAllDisplays={handleSyncTVChannelsToAllDisplays}
    />
  );
}
