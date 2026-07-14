import React, { useState, useEffect } from 'react';
import { SignageState, LayoutConfig, TVChannel, CCTVCamera, Promotion, TickerConfig, LayoutMode, DisplayOrientation } from '../types';
import { PRESET_LAYOUTS, PRESET_CHANNELS, PRESET_CCTVS, PRESET_PROMOS, DEFAULT_TICKER } from '../initialData';
import SignageDisplay from './SignageDisplay';
import { 
  Tv, Shield, Calendar, Sliders, Play, Plus, Trash2, Edit, ExternalLink, Sparkles, 
  Clock, RefreshCw, Volume2, LayoutGrid, Check, AlertCircle, Sun, Info, HeartPulse, 
  HelpCircle, Eye, MonitorPlay, CheckCircle2, ChevronRight, Minimize2, Maximize2, Loader2
} from 'lucide-react';

interface AdminDashboardProps {
  state: SignageState;
  onChange: (newState: SignageState) => void;
}

const PRESET_IMAGES = [
  { label: '☕ Café & Coffee', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800' },
  { label: '🥗 Healthy Food', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800' },
  { label: '🏋️ Gym & Fitness', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=800' },
  { label: '🥩 Fine Dining', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800' },
  { label: '🎮 Arcade/Tech', url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=800' },
  { label: '🛍️ Fashion Store', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800' }
];

export default function AdminDashboard({ state, onChange }: AdminDashboardProps) {
  const { 
    currentLayoutId, 
    activeTVChannelId, 
    activeCCTVIds, 
    ticker, 
    promotions, 
    useSystemTime, 
    simulatedTime, 
    volume, 
    channels, 
    cctvs,
    weatherAreaId = 'area_gadog',
    weatherAreas = [],
    displayTheme = 'slate_minimal'
  } = state;

  const channelsList = channels || PRESET_CHANNELS;
  const cctvsList = cctvs || PRESET_CCTVS;

  // Form states for TV Channels CRUD
  const [showTVForm, setShowTVForm] = useState(false);
  const [editingTVId, setEditingTVId] = useState<string | null>(null);
  const [tvForm, setTVForm] = useState<Partial<TVChannel>>({
    name: '',
    category: 'News',
    videoUrl: '',
    isSimulated: false,
    overlayText: '',
  });

  // Form states for CCTV Cameras CRUD
  const [showCCTVForm, setShowCCTVForm] = useState(false);
  const [editingCCTVId, setEditingCCTVId] = useState<string | null>(null);
  const [cctvForm, setCCTVForm] = useState<Partial<CCTVCamera>>({
    name: '',
    location: '',
    status: 'online',
    fps: 30,
    noiseLevel: 5,
    panSpeed: 1,
    hasMotion: false,
    colorTheme: 'monochrome',
    rtspUrl: '',
  });

  // TV Channel Handlers
  const handleSaveTV = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tvForm.name) return;

    let updatedChannels: TVChannel[];

    if (editingTVId) {
      updatedChannels = channelsList.map((ch) =>
        ch.id === editingTVId
          ? ({
              ...ch,
              ...tvForm,
            } as TVChannel)
          : ch
      );
    } else {
      const newId = `ch_${Date.now()}`;
      const newTV: TVChannel = {
        id: newId,
        name: tvForm.name,
        category: (tvForm.category || 'News') as any,
        videoUrl: tvForm.videoUrl || '',
        isSimulated: tvForm.isSimulated || false,
        overlayText: tvForm.overlayText || '',
      };
      updatedChannels = [...channelsList, newTV];
    }

    onChange({
      ...state,
      channels: updatedChannels,
      activeTVChannelId: editingTVId ? state.activeTVChannelId : updatedChannels[updatedChannels.length - 1].id,
    });

    setShowTVForm(false);
    setEditingTVId(null);
    setTVForm({
      name: '',
      category: 'News',
      videoUrl: '',
      isSimulated: false,
      overlayText: '',
    });
  };

  const handleEditTV = (ch: TVChannel) => {
    setTVForm({
      name: ch.name,
      category: ch.category,
      videoUrl: ch.videoUrl,
      isSimulated: ch.isSimulated,
      overlayText: ch.overlayText || '',
    });
    setEditingTVId(ch.id);
    setShowTVForm(true);
  };

  const handleDeleteTV = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = channelsList.filter((ch) => ch.id !== id);
    
    // Fallback if deleted the active channel
    let nextActiveId = state.activeTVChannelId;
    if (nextActiveId === id) {
      nextActiveId = filtered[0]?.id || '';
    }

    onChange({
      ...state,
      channels: filtered,
      activeTVChannelId: nextActiveId,
    });
  };

  // CCTV Camera Handlers
  const handleSaveCCTV = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cctvForm.name || !cctvForm.location) return;

    let updatedCCTVs: CCTVCamera[];

    if (editingCCTVId) {
      updatedCCTVs = cctvsList.map((cam) =>
        cam.id === editingCCTVId
          ? ({
              ...cam,
              ...cctvForm,
            } as CCTVCamera)
          : cam
      );
    } else {
      const newId = `cam_${Date.now()}`;
      const newCam: CCTVCamera = {
        id: newId,
        name: cctvForm.name,
        location: cctvForm.location,
        status: (cctvForm.status || 'online') as any,
        fps: Number(cctvForm.fps) || 30,
        noiseLevel: Number(cctvForm.noiseLevel) || 5,
        panSpeed: Number(cctvForm.panSpeed) || 1,
        hasMotion: cctvForm.hasMotion || false,
        colorTheme: (cctvForm.colorTheme || 'monochrome') as any,
        rtspUrl: cctvForm.rtspUrl || '',
      };
      updatedCCTVs = [...cctvsList, newCam];
    }

    onChange({
      ...state,
      cctvs: updatedCCTVs,
    });

    setShowCCTVForm(false);
    setEditingCCTVId(null);
    setCCTVForm({
      name: '',
      location: '',
      status: 'online',
      fps: 30,
      noiseLevel: 5,
      panSpeed: 1,
      hasMotion: false,
      colorTheme: 'monochrome',
      rtspUrl: '',
    });
  };

  const handleEditCCTV = (cam: CCTVCamera) => {
    setCCTVForm({
      name: cam.name,
      location: cam.location,
      status: cam.status,
      fps: cam.fps,
      noiseLevel: cam.noiseLevel,
      panSpeed: cam.panSpeed,
      hasMotion: cam.hasMotion,
      colorTheme: cam.colorTheme,
      rtspUrl: cam.rtspUrl || '',
    });
    setEditingCCTVId(cam.id);
    setShowCCTVForm(true);
  };

  const handleDeleteCCTV = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = cctvsList.filter((cam) => cam.id !== id);

    // Also remove from activeCCTVIds if it was active
    const nextActiveCCTVIds = state.activeCCTVIds.filter((cid) => cid !== id);

    onChange({
      ...state,
      cctvs: filtered,
      activeCCTVIds: nextActiveCCTVIds,
    });
  };

  const activeTime = useSystemTime
    ? (() => {
        const d = new Date();
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      })()
    : simulatedTime;

  // Active admin section
  const [activeTab, setActiveTab] = useState<'overview' | 'layouts' | 'weather' | 'promos' | 'tv' | 'cctv' | 'ticker'>('overview');

  // Preview options
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [previewOrientation, setPreviewOrientation] = useState<DisplayOrientation>('landscape');
  const [timelineHour, setTimelineHour] = useState<number>(12);
  const [timelineMin, setTimelineMin] = useState<number>(0);

  // Form states for adding promotions
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState<Partial<Promotion>>({
    title: '',
    description: '',
    discountValue: '',
    badgeText: '',
    imageUrl: PRESET_IMAGES[0].url,
    theme: 'elegant_gold',
    schedule: {
      allDay: false,
      startTime: '08:00',
      endTime: '12:00',
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    duration: 10,
    isActive: true,
  });

  // Selected preset layout details
  const layoutsList = state.layouts || PRESET_LAYOUTS;
  const activeLayout = layoutsList.find((l) => l.id === currentLayoutId) || layoutsList[0];

  useEffect(() => {
    // Keep preview orientation in sync with active layout selection
    setPreviewOrientation(activeLayout.orientation);
  }, [currentLayoutId, activeLayout]);

  // Synchronize custom timeline hour slider with state's simulatedTime
  useEffect(() => {
    if (!useSystemTime) {
      const parts = simulatedTime.split(':');
      setTimelineHour(parseInt(parts[0], 10) || 12);
      setTimelineMin(parseInt(parts[1], 10) || 0);
    }
  }, [useSystemTime, simulatedTime]);

  const handleTimeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const totalMinutes = parseInt(e.target.value, 10);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    setTimelineHour(hrs);
    setTimelineMin(mins);

    const timeString = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    onChange({
      ...state,
      useSystemTime: false,
      simulatedTime: timeString,
    });
  };

  const toggleSystemTime = () => {
    const nextVal = !useSystemTime;
    let timeStr = simulatedTime;
    if (!nextVal) {
      const d = new Date();
      timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
    onChange({
      ...state,
      useSystemTime: nextVal,
      simulatedTime: timeStr,
    });
  };

  // Create or edit promo handler
  const savePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.title || !promoForm.description) return;

    let updatedPromos: Promotion[] = [];

    if (editingPromoId) {
      updatedPromos = promotions.map((p) =>
        p.id === editingPromoId ? ({ ...p, ...promoForm } as Promotion) : p
      );
    } else {
      const newPromo: Promotion = {
        id: 'p_' + Date.now(),
        title: promoForm.title || 'Special Promotion',
        description: promoForm.description || '',
        discountValue: promoForm.discountValue,
        badgeText: promoForm.badgeText || 'NEW OFFER',
        imageUrl: promoForm.imageUrl || PRESET_IMAGES[0].url,
        theme: promoForm.theme || 'elegant_gold',
        schedule: promoForm.schedule || { allDay: true, startTime: '00:00', endTime: '23:59', daysOfWeek: [0,1,2,3,4,5,6] },
        duration: promoForm.duration || 10,
        isActive: true,
      };
      updatedPromos = [...promotions, newPromo];
    }

    onChange({
      ...state,
      promotions: updatedPromos,
    });

    // Reset Form
    setShowPromoForm(false);
    setEditingPromoId(null);
    setPromoForm({
      title: '',
      description: '',
      discountValue: '',
      badgeText: '',
      imageUrl: PRESET_IMAGES[0].url,
      theme: 'elegant_gold',
      schedule: {
        allDay: false,
        startTime: '08:00',
        endTime: '12:00',
        daysOfWeek: [1, 2, 3, 4, 5],
      },
      duration: 10,
      isActive: true,
    });
  };

  const deletePromo = (id: string) => {
    const filtered = promotions.filter((p) => p.id !== id);
    onChange({
      ...state,
      promotions: filtered,
    });
  };

  const togglePromoActive = (id: string) => {
    const updated = promotions.map((p) =>
      p.id === id ? { ...p, isActive: !p.isActive } : p
    );
    onChange({
      ...state,
      promotions: updated,
    });
  };

  const handleEditPromoClick = (p: Promotion) => {
    setEditingPromoId(p.id);
    setPromoForm(p);
    setShowPromoForm(true);
  };

  // Toggle active CCTV selection (can select up to 4 cams)
  const handleCCTVToggle = (camId: string) => {
    let nextIds = [...activeCCTVIds];
    if (nextIds.includes(camId)) {
      // Must keep at least 1 camera active
      if (nextIds.length > 1) {
        nextIds = nextIds.filter((id) => id !== camId);
      }
    } else {
      if (nextIds.length < 4) {
        nextIds.push(camId);
      } else {
        // Replace first one
        nextIds.shift();
        nextIds.push(camId);
      }
    }
    onChange({
      ...state,
      activeCCTVIds: nextIds,
    });
  };

  // Helper calculation for active scheduled promos counts
  const getActivePromosCountAtTime = (timeStr: string) => {
    const timeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const currentMins = timeToMinutes(timeStr);
    return promotions.filter((p) => {
      if (!p.isActive) return false;
      if (p.schedule.allDay) return true;
      const start = timeToMinutes(p.schedule.startTime);
      const end = timeToMinutes(p.schedule.endTime);
      if (start <= end) {
        return currentMins >= start && currentMins <= end;
      } else {
        return currentMins >= start || currentMins <= end;
      }
    }).length;
  };

  // Open standalone view in a new tab
  const handleLaunchStandalone = () => {
    window.open('?mode=display', '_blank', 'noopener,noreferrer');
  };

  // Quick preset generators for demonstrating scheduler
  const loadPromoPreset = (presetIndex: number) => {
    const presets = [
      {
        title: '☕ Hot Americano Buy 1 Get 1 Free',
        description: 'Happy Hours Coffee! Fuel your morning meeting with our freshly roasted house espresso beans. Double the joy, pay for one.',
        discountValue: 'BUY 1 GET 1',
        badgeText: 'COFFEE HAPPY HOUR',
        imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800',
        theme: 'elegant_gold' as const,
        schedule: { allDay: false, startTime: '08:00', endTime: '10:00', daysOfWeek: [1,2,3,4,5] },
        duration: 8,
        isActive: true,
      },
      {
        title: '🍔 Sizzling Volcano Burger Feast',
        description: 'Take on the heat with our triple-stacked prime Angus beef burger drenched in molten cheddar and spicy jalapeno sauce.',
        discountValue: 'FREE FRIES & SODAS',
        badgeText: 'LUNCH FEAST HOT',
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800',
        theme: 'crimson_hot' as const,
        schedule: { allDay: false, startTime: '12:00', endTime: '15:00', daysOfWeek: [0,1,2,3,4,5,6] },
        duration: 12,
        isActive: true,
      },
      {
        title: '🏋️ VIP Premium Gym All-Access Day Pass',
        description: 'Try out our top-of-the-line free weight zones, high-tech cardio decks, and luxury dry sauna rooms. Valid for first-timers.',
        discountValue: 'SAVE 50% DAYPASS',
        badgeText: 'WEEKEND WELLNESS',
        imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=800',
        theme: 'emerald_fresh' as const,
        schedule: { allDay: false, startTime: '15:00', endTime: '21:00', daysOfWeek: [6,0] },
        duration: 10,
        isActive: true,
      }
    ];

    const p = presets[presetIndex];
    setPromoForm({
      ...promoForm,
      ...p,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 1. Header Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3 select-none">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Tv className="w-5.5 h-5.5 animate-pulse" />
          </div>
          <div className="text-left">
            <h1 className="text-base font-display font-black tracking-tight text-white flex items-center">
              SignageStudio <span className="text-indigo-400 font-mono text-[9px] ml-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 tracking-wider">PRO</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">DIGITAL MEDIA SIGNAGE CONTROL & MONITOR</p>
          </div>
        </div>

        {/* Dashboard Real-Time System Health Bar */}
        <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800/80 px-4 py-2 rounded-xl">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-semibold text-slate-200">System Live</span>
          </div>
          <span className="text-slate-800">|</span>
          <div className="text-xs text-slate-400 font-mono">
            Mode: <span className="text-indigo-400 font-bold">{useSystemTime ? 'SYS' : 'SIMULASI'}</span> • <span className="text-slate-200 font-bold">{timelineHour.toString().padStart(2, '0')}:{timelineMin.toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* Launcher Button */}
        <button
          onClick={handleLaunchStandalone}
          className="w-full md:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-95 transition-all text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/10 border border-indigo-500/20 cursor-pointer"
        >
          <MonitorPlay className="w-4 h-4" />
          <span>Launch TV Display (Tab Baru)</span>
          <ExternalLink className="w-3 h-3 ml-0.5" />
        </button>
      </header>

      {/* 2. Main content area: Split Sidebar controls vs Signage Display Preview */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden min-h-0">
        
        {/* SIDE A: CONTROL DASHBOARD PANELS (col-span-12 to col-span-7) */}
        <div className="col-span-12 lg:col-span-7 border-r border-slate-800/80 flex flex-col h-full bg-slate-950 overflow-y-auto">
          
          {/* Section Selector Tab list */}
          <nav className="flex flex-wrap border-b border-slate-800 bg-slate-900/10 p-2 gap-1.5 sticky top-0 z-10 backdrop-blur-md">
            {[
              { id: 'overview', label: 'Ringkasan', icon: <Sliders className="w-4 h-4" /> },
              { id: 'layouts', label: 'Studio Layout', icon: <LayoutGrid className="w-4 h-4" /> },
              { id: 'weather', label: 'Cuaca & Tema', icon: <Sun className="w-4 h-4" /> },
              { id: 'promos', label: 'Jadwal Promo', icon: <Calendar className="w-4 h-4" /> },
              { id: 'tv', label: 'Live TV', icon: <Tv className="w-4 h-4" /> },
              { id: 'cctv', label: 'CCTV Matrix', icon: <Shield className="w-4 h-4" /> },
              { id: 'ticker', label: 'Teks Berjalan', icon: <Info className="w-4 h-4" /> },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500/30 text-white border'
                      : 'text-slate-400 border border-transparent hover:bg-slate-900/50 hover:text-slate-200'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-6 flex-1">
            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-950/20 via-slate-900/30 to-slate-950 border border-slate-800 rounded-3xl p-6 text-left relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-2xl pointer-events-none" />
                  <h3 className="text-base font-display font-extrabold text-white flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Selamat Datang di SignageStudio TV</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-2 leading-relaxed font-light">
                    Sistem signage digital real-time ini dirancang untuk memadukan siaran TV, grid CCTV, dan media promosi terjadwal dalam satu tampilan TV di toko/kantor Anda. Anda dapat merubah tata letak, jadwal promo, dan ticker dari dasbor ini dan melihat perubahannya langsung pada layar display TV secara seketika (real-time).
                  </p>
                </div>

                {/* Dashboard Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900/20 border border-slate-800/80 p-4 rounded-2xl text-left hover:border-slate-700/80 transition-all shadow-md">
                    <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">Layout Aktif</p>
                    <p className="text-sm font-bold text-slate-100 mt-1 truncate">{activeLayout.name.split(' (')[0]}</p>
                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase mt-2 inline-block">
                      {activeLayout.orientation === 'landscape' ? 'Landscape' : 'Portrait'}
                    </span>
                  </div>
                  <div className="bg-slate-900/20 border border-slate-800/80 p-4 rounded-2xl text-left hover:border-slate-700/80 transition-all shadow-md">
                    <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">Jadwal Promo</p>
                    <p className="text-sm font-bold text-slate-100 mt-1">{promotions.length} Terdaftar</p>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase mt-2 inline-block flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                      {getActivePromosCountAtTime(activeTime)} Aktif
                    </span>
                  </div>
                  <div className="bg-slate-900/20 border border-slate-800/80 p-4 rounded-2xl text-left hover:border-slate-700/80 transition-all shadow-md">
                    <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">CCTV Online</p>
                    <p className="text-sm font-bold text-slate-100 mt-1">{activeCCTVIds.length} / {cctvsList.length} Saluran</p>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase mt-2 inline-block">
                      Secure Link
                    </span>
                  </div>
                  <div className="bg-slate-900/20 border border-slate-800/80 p-4 rounded-2xl text-left hover:border-slate-700/80 transition-all shadow-md">
                    <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">Channel TV</p>
                    <p className="text-sm font-bold text-slate-100 mt-1 truncate">
                      {channelsList.find((c)=>c.id === activeTVChannelId)?.name.split(' (')[0] || 'Lofi Chill'}
                    </p>
                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase mt-2 inline-block">
                      Vol: {volume}%
                    </span>
                  </div>
                </div>

                {/* Real-time sync instructions */}
                <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-6 text-left flex items-start space-x-3 shadow-lg">
                  <Info className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-indigo-200">Teknologi Real-Time Sinkronisasi</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed font-light">
                      Layar signage kami dilengkapi dengan sistem sinkronisasi <strong>Storage Link</strong>. Cukup buka halaman display TV di monitor/TV fisik kedua, maka setiap kali Anda mengubah konten di panel administrator ini, TV signage Anda akan langsung bertransisi seketika tanpa perlu memuat ulang halaman!
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={handleLaunchStandalone}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-white bg-indigo-500/20 hover:bg-indigo-500/30 px-3.5 py-2 rounded-xl border border-indigo-500/30 transition-all cursor-pointer"
                      >
                        <span>Coba Dual-Monitor Screen</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick actions Panel */}
                <div className="space-y-3 text-left">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kontrol Cepat & Simulasi</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Time Simulator card */}
                    <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-indigo-400" />
                          <span>Simulasi Waktu Tayang</span>
                        </span>
                        <button
                          onClick={toggleSystemTime}
                          className={`text-[10px] font-mono font-bold px-2 py-1 rounded transition-all border ${
                            useSystemTime
                              ? 'bg-indigo-600 border-indigo-400 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                          }`}
                        >
                          {useSystemTime ? '✓ SYNC SYSTEM' : 'MANUAL TIME'}
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        {useSystemTime 
                          ? 'Waktu signage terikat dengan jam server system saat ini.'
                          : 'Geser slider di bawah untuk mensimulasikan jam tayang promosi Anda.'
                        }
                      </p>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
                          <span>00:00 (Tengah Malam)</span>
                          <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 text-xs">
                            {timelineHour.toString().padStart(2, '0')}:{timelineMin.toString().padStart(2, '0')}
                          </span>
                          <span>23:59</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1439"
                          disabled={useSystemTime}
                          value={timelineHour * 60 + timelineMin}
                          onChange={handleTimeSliderChange}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Quick alert simulator */}
                    <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-white flex items-center space-x-1">
                          <Shield className="w-4 h-4 text-emerald-400" />
                          <span>Pencegah Bahaya Instan</span>
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                          Mensimulasikan gangguan gerak atau trigger bahaya dari kamera pengawas CCTV untuk menampilkan notifikasi bahaya visual instan pada monitor signage.
                        </p>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            // Toggle hasMotion in preset CCTV lists
                            const firstCamActive = activeCCTVIds[0];
                            if (firstCamActive) {
                              onChange({
                                ...state,
                                promotions: promotions.map((p) => p), // dummy refresh
                              });
                              // Simulating a system trigger via alert classes
                              const targetCam = PRESET_CCTVS.find(c => c.id === firstCamActive);
                              if (targetCam) {
                                targetCam.hasMotion = !targetCam.hasMotion;
                                onChange({ ...state });
                              }
                            }
                          }}
                          className="flex-1 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-200 hover:text-red-100 text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5"
                        >
                          <AlertCircle className="w-4 h-4" />
                          <span>Simulasi Trigger Alarm</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* TAB: LAYOUTS */}
            {activeTab === 'layouts' && (
              <div className="space-y-6 text-left">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pilih Template Tata Letak Signage</h3>
                  <p className="text-slate-400 text-xs mt-1">Pilih tata letak yang sesuai dengan letak TV dan kebutuhan bisnis Anda.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {layoutsList.map((lay) => {
                    const isSelected = lay.id === currentLayoutId;
                    return (
                      <button
                        key={lay.id}
                        onClick={() => {
                          onChange({
                            ...state,
                            currentLayoutId: lay.id,
                          });
                        }}
                        className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between relative overflow-hidden group cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/10 border-indigo-500 shadow-xl shadow-indigo-550/5'
                            : 'bg-slate-900/20 border-slate-850 hover:border-slate-700 hover:bg-slate-900/40'
                        }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}>
                            <Tv className="w-4.5 h-4.5" />
                          </span>
                          <span className="text-[9px] font-mono font-bold tracking-wider uppercase bg-slate-900 px-2.5 py-1 rounded-full text-slate-400 border border-slate-800">
                            {lay.mode === 'l_shape' ? 'L-SPLIT' : lay.mode === 'split_tv_cctv' ? 'SPLIT SEC' : lay.mode === 'quad_cctv' ? '4-GRID' : lay.mode === 'promo_focus' ? 'PROMO' : 'FULL'}
                          </span>
                        </div>

                        <div className="mt-4">
                          <h4 className="text-xs font-display font-extrabold text-white tracking-tight">{lay.name}</h4>
                          <p className="text-[10px] text-slate-400 font-mono mt-1 font-light">
                            Arah: <span className="text-indigo-400 font-bold">{lay.orientation.toUpperCase()}</span> • Ticker: {lay.showTicker ? 'AKTIF' : 'MATI'}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="absolute top-3 right-3 text-indigo-400">
                            <CheckCircle2 className="w-5 h-5 fill-indigo-950/80" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Additional Layout Settings */}
                <div className="bg-slate-900/10 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Pengaturan Lanjutan Layout</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Orientasi Layar Fisik</label>
                      <div className="flex mt-2 gap-2">
                        <button
                          onClick={() => {
                            const updatedLayouts = layoutsList.map(l => 
                              l.id === currentLayoutId ? { ...l, orientation: 'landscape' as const } : l
                            );
                            onChange({
                              ...state,
                              layouts: updatedLayouts
                            });
                          }}
                          className={`flex-1 text-[11px] py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                            activeLayout.orientation === 'landscape'
                              ? 'bg-indigo-600/10 border-indigo-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                          }`}
                        >
                          Landscape (16:9)
                        </button>
                        <button
                          onClick={() => {
                            const updatedLayouts = layoutsList.map(l => 
                              l.id === currentLayoutId ? { ...l, orientation: 'portrait' as const } : l
                            );
                            onChange({
                              ...state,
                              layouts: updatedLayouts
                            });
                          }}
                          className={`flex-1 text-[11px] py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                            activeLayout.orientation === 'portrait'
                              ? 'bg-indigo-600/10 border-indigo-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                          }`}
                        >
                          Portrait (9:16)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Garis Info Ticker Bawah</label>
                      <div className="flex mt-2 gap-2">
                        <button
                          onClick={() => {
                            const updatedLayouts = layoutsList.map(l => 
                              l.id === currentLayoutId ? { ...l, showTicker: true } : l
                            );
                            onChange({
                              ...state,
                              layouts: updatedLayouts
                            });
                          }}
                          className={`flex-1 text-xs py-2 rounded font-bold border transition-all ${
                            activeLayout.showTicker
                              ? 'bg-slate-800 border-indigo-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                          }`}
                        >
                          Aktifkan
                        </button>
                        <button
                          onClick={() => {
                            const updatedLayouts = layoutsList.map(l => 
                              l.id === currentLayoutId ? { ...l, showTicker: false } : l
                            );
                            onChange({
                              ...state,
                              layouts: updatedLayouts
                            });
                          }}
                          className={`flex-1 text-xs py-2 rounded font-bold border transition-all ${
                            !activeLayout.showTicker
                              ? 'bg-slate-800 border-indigo-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                          }`}
                        >
                          Sembunyikan
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: WEATHER & THEME */}
            {activeTab === 'weather' && (
              <div className="space-y-6 text-left">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sun className="w-5 h-5 text-amber-500" />
                    <span>Konfigurasi Cuaca & Tema Display</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Sesuaikan lokasi prakiraan cuaca serta skin tema visual display TV signage secara real-time.
                  </p>
                </div>

                {/* Weather Area Selection */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Pemilihan Area Cuaca Display</span>
                    </h4>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase">
                      5 Area Tersedia
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed font-light">
                    Pilih wilayah Bogor/Puncak untuk menampilkan perkiraan cuaca real-time yang dinamis di layout signage TV Anda.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {weatherAreas.map((area) => {
                      const isSelected = weatherAreaId === area.id;
                      return (
                        <button
                          key={area.id}
                          onClick={() => {
                            onChange({
                              ...state,
                              weatherAreaId: area.id
                            });
                          }}
                          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all hover:scale-[1.01] active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5 text-white'
                              : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <span className="text-2xl bg-slate-900/60 w-10 h-10 rounded-lg flex items-center justify-center border border-slate-800 shadow-inner">
                              {area.iconDay}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[11px] font-extrabold tracking-tight truncate">
                                {area.name.split('•')[0].trim()}
                              </p>
                              <p className="text-[9px] text-slate-400 truncate mt-0.5 font-light">
                                {area.name.split('•')[1]?.trim() || 'Kawasan Wisata'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <span className="text-xs font-black text-white">{area.tempDay}°C</span>
                            <span className="text-[9px] text-amber-400/80 font-semibold mt-0.5 truncate max-w-[80px]" title={area.descDay}>
                              {area.descDay.split(' ')[0]}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Global Dashboard Theme Presets */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>Template Tema Desain Signage</span>
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
                      Premium Skins
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed font-light">
                    Sesuaikan suasana visual display Anda secara instan dengan pilihan kombinasi warna, glow, dan layout tipografi premium.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {[
                      {
                        id: 'slate_minimal',
                        name: 'Slate Minimalist',
                        desc: 'Klasik & Sleek',
                        colorClasses: 'from-slate-800 via-slate-900 to-slate-950',
                        accent: 'border-slate-700 text-slate-300'
                      },
                      {
                        id: 'cyber_neon',
                        name: 'Cyberpunk Neon',
                        desc: 'Glow Pink & Cyan',
                        colorClasses: 'from-pink-900/40 via-purple-950/20 to-zinc-950',
                        accent: 'border-pink-500 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.3)]'
                      },
                      {
                        id: 'warm_gold',
                        name: 'Luxury Gold',
                        desc: 'Amber Elegan',
                        colorClasses: 'from-amber-950/40 via-stone-900/30 to-stone-950',
                        accent: 'border-amber-500 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                      },
                      {
                        id: 'emerald_eco',
                        name: 'Emerald Eco',
                        desc: 'Hijau Alami',
                        colorClasses: 'from-emerald-950/40 via-stone-950/10 to-stone-950',
                        accent: 'border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                      },
                      {
                        id: 'royal_navy',
                        name: 'Royal Navy',
                        desc: 'Biru Keperakan',
                        colorClasses: 'from-indigo-900/40 via-slate-900/30 to-slate-950',
                        accent: 'border-indigo-500 text-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.3)]'
                      }
                    ].map((themeItem) => {
                      const isSelected = displayTheme === themeItem.id;
                      return (
                        <button
                          key={themeItem.id}
                          onClick={() => {
                            onChange({
                              ...state,
                              displayTheme: themeItem.id as any
                            });
                          }}
                          className={`relative p-3 rounded-xl border text-left overflow-hidden transition-all hover:scale-[1.02] active:scale-95 flex flex-col justify-between h-24 cursor-pointer bg-gradient-to-br ${themeItem.colorClasses} ${
                            isSelected
                              ? `border-slate-200 ring-2 ring-indigo-500/40 shadow-xl`
                              : 'border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="absolute top-1 right-1">
                            {isSelected && (
                              <Check className="w-4 h-4 text-white fill-indigo-600 shadow-sm" />
                            )}
                          </div>
                          <div>
                            <p className="text-[11px] font-extrabold tracking-tight text-white">
                              {themeItem.name}
                            </p>
                            <p className="text-[9px] text-slate-400 mt-0.5 font-light">
                              {themeItem.desc}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 mt-2">
                            <span className={`w-3.5 h-3.5 rounded-full border ${themeItem.accent}`} />
                            <span className="text-[8px] font-mono text-slate-500 uppercase font-bold">AKSEN TEMA</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PROMOS (SCHEDULED PROMOS MANAGER) */}
            {activeTab === 'promos' && (
              <div className="space-y-6 text-left">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Manajemen Promo Terjadwal</h3>
                    <p className="text-slate-400 text-xs mt-1">Kelola banner, jam aktif tayang, serta diskon promosi bisnis Anda.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingPromoId(null);
                      setPromoForm({
                        title: '',
                        description: '',
                        discountValue: '',
                        badgeText: '',
                        imageUrl: PRESET_IMAGES[0].url,
                        theme: 'elegant_gold',
                        schedule: { allDay: false, startTime: '08:00', endTime: '12:00', daysOfWeek: [1, 2, 3, 4, 5] },
                        duration: 10,
                        isActive: true,
                      });
                      setShowPromoForm(!showPromoForm);
                    }}
                    className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-all"
                  >
                    {showPromoForm ? <Minimize2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{showPromoForm ? 'Tutup Formulir' : 'Tambah Promo'}</span>
                  </button>
                </div>

                {/* Promotion creation/edit form */}
                {showPromoForm && (
                  <form onSubmit={savePromo} className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4 shadow-xl">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center">
                      <Sparkles className="w-4 h-4 mr-1" />
                      <span>{editingPromoId ? 'Edit Detail Promo' : 'Buat Promo Baru'}</span>
                    </h4>

                    {/* Quick Demo Presets */}
                    {!editingPromoId && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase">Isi Cepat dengan Preset Bisnis</label>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => loadPromoPreset(0)} className="text-[10px] bg-slate-800 hover:bg-slate-750 text-amber-300 px-2.5 py-1.5 rounded border border-slate-700">Café Coffee Hour</button>
                          <button type="button" onClick={() => loadPromoPreset(1)} className="text-[10px] bg-slate-800 hover:bg-slate-750 text-red-300 px-2.5 py-1.5 rounded border border-slate-700">Hot Food Sizzling</button>
                          <button type="button" onClick={() => loadPromoPreset(2)} className="text-[10px] bg-slate-800 hover:bg-slate-750 text-emerald-300 px-2.5 py-1.5 rounded border border-slate-700">Gym Fitness Pass</button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase">Judul Promosi</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Diskon Kopi Pagi Nikmat"
                          value={promoForm.title}
                          onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-3 py-2 text-xs text-white mt-1"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase">Deskripsi Penawaran</label>
                        <textarea
                          placeholder="Jelaskan detail diskon dan cara mendapatkannya..."
                          required
                          rows={2}
                          value={promoForm.description}
                          onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-3 py-2 text-xs text-white mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase">Nilai Diskon / Harga</label>
                          <input
                            type="text"
                            placeholder="Contoh: DISKON 30% atau IDR 15K"
                            value={promoForm.discountValue}
                            onChange={(e) => setPromoForm({ ...promoForm, discountValue: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-3 py-1.5 text-xs text-white mt-1"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase">Teks Lencana (Badge)</label>
                          <input
                            type="text"
                            placeholder="Contoh: MORNING SPECIAL"
                            value={promoForm.badgeText}
                            onChange={(e) => setPromoForm({ ...promoForm, badgeText: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-3 py-1.5 text-xs text-white mt-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase">Tema Desain Visual</label>
                          <select
                            value={promoForm.theme}
                            onChange={(e) => setPromoForm({ ...promoForm, theme: e.target.value as any })}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 mt-1"
                          >
                            <option value="elegant_gold">Elegant Charcoal Gold</option>
                            <option value="neon_sunset">Neon Purple Pink</option>
                            <option value="emerald_fresh">Fresh Emerald Mint</option>
                            <option value="cyber_blue">Cyber Techno Blue</option>
                            <option value="crimson_hot">Crimson Flame Red</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase">Durasi Tampil (Detik)</label>
                          <input
                            type="number"
                            min="3"
                            max="60"
                            value={promoForm.duration}
                            onChange={(e) => setPromoForm({ ...promoForm, duration: parseInt(e.target.value, 10) || 10 })}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-3 py-1.5 text-xs text-white mt-1"
                          />
                        </div>
                      </div>

                      {/* Unsplash Presets Selectors */}
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase">Foto Banner Promosi (Preset Unsplash)</label>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-1.5">
                          {PRESET_IMAGES.map((img) => (
                            <button
                              key={img.label}
                              type="button"
                              onClick={() => setPromoForm({ ...promoForm, imageUrl: img.url })}
                              className={`rounded border overflow-hidden p-0.5 text-[9px] font-mono leading-tight transition-all relative ${
                                promoForm.imageUrl === img.url ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-950'
                              }`}
                            >
                              <img src={img.url} className="w-full h-8 object-cover rounded" alt="" />
                              <div className="py-0.5 truncate text-slate-300">{img.label}</div>
                              {promoForm.imageUrl === img.url && (
                                <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[6px]">✓</div>
                              )}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Atau tempel link gambar kustom Anda di sini..."
                          value={promoForm.imageUrl}
                          onChange={(e) => setPromoForm({ ...promoForm, imageUrl: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-3 py-1.5 text-xs text-slate-400 mt-2"
                        />
                      </div>

                      {/* Scheduling Settings */}
                      <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-lg space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-slate-400 uppercase">Pengaturan Waktu Tayang Jadwal</span>
                          <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={promoForm.schedule?.allDay}
                              onChange={(e) => {
                                const sched = promoForm.schedule || { allDay: false, startTime: '08:00', endTime: '12:00', daysOfWeek: [1,2,3,4,5] };
                                setPromoForm({
                                  ...promoForm,
                                  schedule: { ...sched, allDay: e.target.checked }
                                });
                              }}
                              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                            />
                            <span className="text-[10px] font-mono text-slate-300 uppercase">TAMPIL 24 JAM</span>
                          </label>
                        </div>

                        {!promoForm.schedule?.allDay && (
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="block text-[9px] font-mono text-slate-500 uppercase">Jam Mulai Tayang</label>
                              <input
                                type="time"
                                required
                                value={promoForm.schedule?.startTime || '08:00'}
                                onChange={(e) => {
                                  const sched = promoForm.schedule || { allDay: false, startTime: '08:00', endTime: '12:00', daysOfWeek: [1,2,3,4,5] };
                                  setPromoForm({
                                    ...promoForm,
                                    schedule: { ...sched, startTime: e.target.value }
                                  });
                                }}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white mt-1"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-mono text-slate-500 uppercase">Jam Berhenti Tayang</label>
                              <input
                                type="time"
                                required
                                value={promoForm.schedule?.endTime || '12:00'}
                                onChange={(e) => {
                                  const sched = promoForm.schedule || { allDay: false, startTime: '08:00', endTime: '12:00', daysOfWeek: [1,2,3,4,5] };
                                  setPromoForm({
                                    ...promoForm,
                                    schedule: { ...sched, endTime: e.target.value }
                                  });
                                }}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white mt-1"
                              />
                            </div>
                          </div>
                        )}

                        {/* Days selection */}
                        <div className="pt-1">
                          <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1.5">Hari Tayang Aktif</label>
                          <div className="flex gap-1">
                            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day, idx) => {
                              const daysList = promoForm.schedule?.daysOfWeek || [];
                              const isSelected = daysList.includes(idx);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    const sched = promoForm.schedule || { allDay: false, startTime: '08:00', endTime: '12:00', daysOfWeek: [] };
                                    let nextDays = [...daysList];
                                    if (nextDays.includes(idx)) {
                                      nextDays = nextDays.filter((d) => d !== idx);
                                    } else {
                                      nextDays.push(idx);
                                    }
                                    setPromoForm({
                                      ...promoForm,
                                      schedule: { ...sched, daysOfWeek: nextDays }
                                    });
                                  }}
                                  className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all ${
                                    isSelected
                                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPromoForm(false);
                          setEditingPromoId(null);
                        }}
                        className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-semibold px-4 py-2 rounded-lg transition-all"
                      >
                        Batalkan
                      </button>
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition-all flex items-center space-x-1"
                      >
                        <Check className="w-4 h-4" />
                        <span>{editingPromoId ? 'Simpan Perubahan' : 'Tambahkan Ke Jadwal'}</span>
                      </button>
                    </div>

                  </form>
                )}

                {/* Promotional list visual grid */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Daftar Jadwal Promosi Aktif</h4>
                  
                  <div className="space-y-3">
                    {promotions.map((promo) => (
                      <div
                        key={promo.id}
                        className={`bg-slate-900/20 border p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between transition-all hover:border-slate-700/80 ${
                          promo.isActive ? 'border-slate-850' : 'border-slate-900 opacity-50'
                        }`}
                      >
                        {/* Thumbnail image */}
                        <div className="flex items-center space-x-4 w-full md:w-2/3">
                          <img
                            src={promo.imageUrl}
                            alt=""
                            className="w-16 h-12 rounded-xl object-cover border border-slate-800 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-left overflow-hidden">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="font-display font-extrabold text-white text-xs tracking-tight truncate">{promo.title}</span>
                              {promo.discountValue && (
                                <span className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                                  {promo.discountValue}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 font-light">{promo.description}</p>
                            
                            {/* Schedule info display */}
                            <div className="flex items-center space-x-3 text-[9px] font-mono text-slate-500 mt-2 flex-wrap gap-y-1">
                              <span className="bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-850 text-indigo-400 font-bold">
                                🕒 {promo.schedule.allDay ? '24 JAM PENUH' : `${promo.schedule.startTime} - ${promo.schedule.endTime}`}
                              </span>
                              <span>•</span>
                              <span className="text-slate-400">HARI: {
                                promo.schedule.daysOfWeek.length === 7 
                                  ? 'SETIAP HARI' 
                                  : promo.schedule.daysOfWeek.map(d => ['Min','Sen','Sel','Rab','Kam','Jum','Sab'][d]).join(', ')
                              }</span>
                              <span>•</span>
                              <span className="text-slate-400">SLIDE: {promo.duration}s</span>
                            </div>
                          </div>
                        </div>

                        {/* Controls toggler */}
                        <div className="flex items-center space-x-2 self-stretch md:self-auto justify-end">
                          <button
                            onClick={() => togglePromoActive(promo.id)}
                            className={`text-[9px] font-mono font-extrabold px-3 py-1.5 rounded-xl transition-all border cursor-pointer ${
                              promo.isActive
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {promo.isActive ? 'TAYANG' : 'MATI'}
                          </button>
                          <button
                            onClick={() => handleEditPromoClick(promo)}
                            className="p-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                            title="Edit Promo"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deletePromo(promo.id)}
                            className="p-2 bg-slate-950 hover:bg-red-950 border border-slate-850 hover:border-red-900/40 text-slate-400 hover:text-red-300 rounded-xl transition-all cursor-pointer"
                            title="Hapus Promo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {promotions.length === 0 && (
                      <div className="border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
                        Belum ada promosi yang dibuat. Silakan tambahkan promosi pertama Anda!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TV CHANNEL SETTINGS */}
            {activeTab === 'tv' && (
              <div className="space-y-6 text-left">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Konfigurasi Siaran TV</h3>
                    <p className="text-slate-400 text-xs mt-1">Atur sumber siaran berita, video dekorasi, atau channel music live.</p>
                  </div>
                  {!showTVForm && (
                    <button
                      onClick={() => {
                        setEditingTVId(null);
                        setTVForm({
                          name: '',
                          category: 'News',
                          videoUrl: '',
                          isSimulated: false,
                          overlayText: '',
                        });
                        setShowTVForm(true);
                      }}
                      className="flex items-center space-x-1 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Channel</span>
                    </button>
                  )}
                </div>

                {showTVForm && (
                  <form onSubmit={handleSaveTV} className="bg-slate-900/20 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h4 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center">
                      <Tv className="w-4 h-4 mr-1.5 text-indigo-400" />
                      <span>{editingTVId ? 'Edit Channel TV' : 'Tambah Channel TV Baru'}</span>
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Nama Saluran</label>
                        <input
                          type="text"
                          required
                          value={tvForm.name || ''}
                          onChange={(e) => setTVForm({ ...tvForm, name: e.target.value })}
                          placeholder="Contoh: Global Business News (LIVE)"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white mt-1.5 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Kategori</label>
                          <select
                            value={tvForm.category || 'News'}
                            onChange={(e) => setTVForm({ ...tvForm, category: e.target.value as any })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 mt-1.5 focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="News">News</option>
                            <option value="Entertainment">Entertainment</option>
                            <option value="Sports">Sports</option>
                            <option value="Documentary">Documentary</option>
                            <option value="Scenery">Scenery</option>
                          </select>
                        </div>

                        <div className="flex items-center pt-5">
                          <label className="flex items-center space-x-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={tvForm.isSimulated || false}
                              onChange={(e) => setTVForm({ ...tvForm, isSimulated: e.target.checked })}
                              className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 h-4 w-4 cursor-pointer"
                            />
                            <span className="text-xs font-medium text-slate-300">Simulasi Gelombang Lofi</span>
                          </label>
                        </div>
                      </div>

                      {!tvForm.isSimulated && (
                        <div>
                          <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Video Stream URL (.mp4)</label>
                          <input
                            type="url"
                            required={!tvForm.isSimulated}
                            value={tvForm.videoUrl || ''}
                            onChange={(e) => setTVForm({ ...tvForm, videoUrl: e.target.value })}
                            placeholder="https://assets.mixkit.co/videos/preview/mixkit-..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white mt-1.5 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Teks Berita Overlay (Opsional)</label>
                        <textarea
                          rows={2}
                          value={tvForm.overlayText || ''}
                          onChange={(e) => setTVForm({ ...tvForm, overlayText: e.target.value })}
                          placeholder="Teks berjalan khusus di bagian bawah layar video..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white mt-1.5 leading-relaxed focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTVForm(false);
                          setEditingTVId(null);
                        }}
                        className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-indigo-600/10 transition-all"
                      >
                        Simpan Channel
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pilih Saluran TV Aktif</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {channelsList.map((ch) => {
                       const isSelected = ch.id === activeTVChannelId;
                       return (
                         <div
                           key={ch.id}
                           onClick={() => {
                             onChange({
                               ...state,
                               activeTVChannelId: ch.id,
                             });
                           }}
                           className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between relative overflow-hidden group cursor-pointer ${
                             isSelected
                               ? 'bg-indigo-600/10 border-indigo-500 shadow-xl shadow-indigo-550/5'
                               : 'bg-slate-900/20 border-slate-850 hover:border-slate-700 hover:bg-slate-900/40'
                           }`}
                         >
                           <div className="flex justify-between items-start w-full">
                             <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                               isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 border border-slate-800'
                             }`}>
                               <Tv className="w-4.5 h-4.5" />
                             </span>
                             
                             <div className="flex items-center space-x-1.5 opacity-85 hover:opacity-100 transition-opacity">
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleEditTV(ch);
                                 }}
                                 className="p-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-lg hover:border-slate-700 transition-all cursor-pointer"
                                 title="Edit Channel"
                               >
                                 <Edit className="w-3.5 h-3.5" />
                               </button>
                               <button
                                 onClick={(e) => handleDeleteTV(ch.id, e)}
                                 className="p-1.5 bg-slate-950 border border-slate-800 text-red-400 hover:bg-red-950/20 rounded-lg hover:border-red-900/50 transition-all cursor-pointer"
                                 title="Hapus Channel"
                               >
                                 <Trash2 className="w-3.5 h-3.5" />
                               </button>
                             </div>
                           </div>

                           <div className="mt-5 flex justify-between items-end">
                             <div>
                               <h4 className="text-xs font-display font-extrabold text-white tracking-tight leading-tight">{ch.name}</h4>
                               <p className="text-[10px] text-slate-400 font-mono mt-1 font-light">
                                 {ch.isSimulated ? 'AMBIENT ANIMATED' : 'LIVE MP4 STREAM'}
                               </p>
                             </div>
                             <span className="text-[9px] font-mono font-bold uppercase bg-slate-900 px-2.5 py-1 rounded-full text-slate-400 border border-slate-800">
                               {ch.category}
                             </span>
                           </div>

                           {isSelected && (
                             <div className="absolute top-3 right-16 text-indigo-400">
                               <CheckCircle2 className="w-5 h-5 fill-indigo-950/80" />
                             </div>
                           )}
                         </div>
                       );
                    })}
                  </div>
                </div>

                {/* Volume slider control */}
                <div className="bg-slate-900/10 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center">
                    <Volume2 className="w-4 h-4 text-slate-400 mr-1.5" />
                    <span>Kontrol Volume Audio TV</span>
                  </h4>

                  <p className="text-[11px] text-slate-400 leading-normal font-light">
                    Mengatur volume suara siaran TV langsung pada monitor TV Signage Anda. Gunakan mute jika ingin suasana hening.
                  </p>

                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => {
                        onChange({
                          ...state,
                          volume: volume === 0 ? 50 : 0
                        });
                      }}
                      className="p-2.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-300 rounded-xl transition-all cursor-pointer"
                    >
                      <Volume2 className={`w-4 h-4 ${volume === 0 ? 'text-red-500 line-through' : 'text-slate-300'}`} />
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => {
                        onChange({
                          ...state,
                          volume: parseInt(e.target.value, 10) || 0
                        });
                      }}
                      className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <span className="text-xs font-mono font-bold text-slate-300 w-8 text-right">
                      {volume}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CCTV SETTINGS */}
            {activeTab === 'cctv' && (
              <div className="space-y-6 text-left">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Matrix Pemantauan CCTV</h3>
                    <p className="text-slate-400 text-xs mt-1">Pilih kamera pengawas aktif untuk ditampilkan pada layout pengawasan.</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCCTVForm(!showCCTVForm);
                      setEditingCCTVId(null);
                      setCCTVForm({ name: '', location: '', colorTheme: 'monochrome', fps: 15, rtspUrl: '' });
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-indigo-600/10 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah CCTV</span>
                  </button>
                </div>

                {/* CCTV Create/Edit Form */}
                {showCCTVForm && (
                  <form onSubmit={handleSaveCCTV} className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5 space-y-4 mb-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      {editingCCTVId ? 'Edit CCTV Camera' : 'Tambah Kamera CCTV Baru'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-1.5">Nama Kamera</label>
                        <input
                          type="text"
                          required
                          value={cctvForm.name}
                          onChange={(e) => setCCTVForm({ ...cctvForm, name: e.target.value })}
                          placeholder="Contoh: CCTV Lobby Utama, Parkir Timur"
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-1.5">Lokasi / Sektor</label>
                        <input
                          type="text"
                          required
                          value={cctvForm.location}
                          onChange={(e) => setCCTVForm({ ...cctvForm, location: e.target.value })}
                          placeholder="Contoh: Sektor Utara, Lantai 1"
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-1.5">Skema Warna Visual</label>
                        <select
                          value={cctvForm.colorTheme}
                          onChange={(e) => setCCTVForm({ ...cctvForm, colorTheme: e.target.value as any })}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                        >
                          <option value="monochrome">Monochrome (Modern / Grey)</option>
                          <option value="emerald">Emerald Green (Malam / Night Vision)</option>
                          <option value="nightvision">Night Vision Green</option>
                          <option value="amber">Amber Gold (Termal / Industri)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-1.5">FPS (Frame Rate)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="60"
                          value={cctvForm.fps}
                          onChange={(e) => setCCTVForm({ ...cctvForm, fps: parseInt(e.target.value, 10) || 15 })}
                          placeholder="Default: 15"
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-1.5">Stream URL (RTSP / MP4 / Simulasi)</label>
                        <input
                          type="text"
                          value={cctvForm.rtspUrl}
                          onChange={(e) => setCCTVForm({ ...cctvForm, rtspUrl: e.target.value })}
                          placeholder="Simulasi ambient (kosongkan) atau masukkan URL video (MP4/HLS)"
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowCCTVForm(false)}
                        className="px-4 py-2 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-indigo-600/10 transition-all"
                      >
                        Simpan CCTV
                      </button>
                    </div>
                  </form>
                )}

                {/* CCTV Matrix Select Grid */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kamera Terkoneksi (Pilih Maksimal 4)</h4>
                    <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                      TERPILIH: {activeCCTVIds.length} / 4
                    </span>
                  </div>

                  <div className="space-y-3">
                    {cctvsList.map((cam) => {
                      const isSelected = activeCCTVIds.includes(cam.id);
                      return (
                        <div
                          key={cam.id}
                          className={`bg-slate-900/20 border p-4 rounded-2xl flex items-center justify-between transition-all hover:border-slate-700/80 ${
                            isSelected ? 'border-indigo-550 bg-indigo-600/5' : 'border-slate-850'
                          }`}
                        >
                          <div className="flex items-center space-x-3 text-left">
                            <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-950 text-slate-500 border border-slate-800'
                            }`}>
                              <Shield className="w-4.5 h-4.5" />
                            </span>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="text-xs font-display font-extrabold text-white">{cam.name}</p>
                                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                                  cam.colorTheme === 'monochrome' ? 'bg-slate-950/40 text-slate-300 border border-slate-800/30' :
                                  cam.colorTheme === 'emerald' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' :
                                  cam.colorTheme === 'nightvision' ? 'bg-green-950/40 text-green-400 border border-green-900/30' :
                                  'bg-amber-950/40 text-amber-400 border border-amber-900/30'
                                }`}>
                                  {cam.colorTheme}
                                </span>
                              </div>
                              <p className="text-[9px] font-mono text-slate-400 mt-0.5 font-light">
                                LOKASI: <span className="text-indigo-400 font-bold">{cam.location.toUpperCase()}</span> • FPS: {cam.fps}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleCCTVToggle(cam.id)}
                              className={`text-[9px] font-mono font-extrabold px-3 py-1.5 rounded-xl transition-all border cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                                  : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {isSelected ? 'AKTIF' : 'PILIH'}
                            </button>

                            <button
                              onClick={() => handleEditCCTV(cam)}
                              className="p-1.5 bg-slate-950 border border-slate-850 text-slate-400 hover:text-white rounded-lg hover:border-slate-700 transition-all cursor-pointer"
                              title="Edit CCTV"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteCCTV(cam.id, e)}
                              className="p-1.5 bg-slate-950 border border-slate-850 text-red-400 hover:bg-red-950/20 rounded-lg hover:border-red-900/50 transition-all cursor-pointer"
                              title="Hapus CCTV"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CCTV Detail configs */}
                <div className="bg-slate-900/10 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Konfigurasi Mutu CCTV</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Tema Warna Monitor</label>
                      <select
                        onChange={(e) => {
                          const theme = e.target.value as any;
                          // update all cctvs to this color theme for demo simplicity
                          PRESET_CCTVS.forEach((c) => { c.colorTheme = theme; });
                          onChange({ ...state });
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 mt-2 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="monochrome">Monochrome Slate (Default)</option>
                        <option value="nightvision">Emerald Nightvision (Green)</option>
                        <option value="amber">Warm Security Amber (Orange)</option>
                        <option value="emerald">Classic Retro CCTV (Teal)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Interferensi Analog Static Noise</label>
                      <select
                        onChange={(e) => {
                          const noise = parseInt(e.target.value, 10) || 5;
                          PRESET_CCTVS.forEach((c) => { c.noiseLevel = noise; });
                          onChange({ ...state });
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 mt-2 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="5">Sinyal Jernih (5% Noise)</option>
                        <option value="15">Sinyal Standar (15% Noise)</option>
                        <option value="40">Gangguan Cuaca (40% Noise)</option>
                        <option value="85">Interferensi Parah (85% Noise)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TICKER MARQUEE */}
            {activeTab === 'ticker' && (
              <div className="space-y-6 text-left">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Teks Berjalan (Ticker Bawah)</h3>
                  <p className="text-slate-400 text-xs mt-1">Sesuaikan informasi berjalan yang ditampilkan di bagian paling bawah layar TV.</p>
                </div>

                <div className="bg-slate-900/10 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Isi Kalimat Ticker</label>
                    <textarea
                      rows={3}
                      value={ticker.text}
                      onChange={(e) => {
                        onChange({
                          ...state,
                          ticker: {
                            ...ticker,
                            text: e.target.value,
                          }
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white mt-2 leading-relaxed focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Kecepatan Gulir</label>
                      <select
                        value={ticker.speed}
                        onChange={(e) => {
                          onChange({
                            ...state,
                            ticker: {
                              ...ticker,
                              speed: e.target.value as any,
                            }
                          });
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 mt-1.5"
                      >
                        <option value="slow">Slow (Pelan Nyaman)</option>
                        <option value="medium">Medium (Standar)</option>
                        <option value="fast">Fast (Cepat)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase">Ukuran Huruf</label>
                      <select
                        value={ticker.fontSize}
                        onChange={(e) => {
                          onChange({
                            ...state,
                            ticker: {
                              ...ticker,
                              fontSize: e.target.value as any,
                            }
                          });
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 mt-1.5"
                      >
                        <option value="sm">Kecil (Sleek)</option>
                        <option value="md">Sedang (Rekomendasi)</option>
                        <option value="lg">Besar (Menonjol)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase">Warna Ticker</label>
                      <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                        {[
                          { bg: '#0f172a', text: '#f8fafc', label: 'Gelap' },
                          { bg: '#ef4444', text: '#ffffff', label: 'Merah' },
                          { bg: '#1e3a8a', text: '#ffffff', label: 'Biru' },
                          { bg: '#14532d', text: '#f0fdf4', label: 'Hijau' },
                        ].map((c, i) => {
                          const isSelected = ticker.backgroundColor === c.bg;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                onChange({
                                  ...state,
                                  ticker: {
                                    ...ticker,
                                    backgroundColor: c.bg,
                                    textColor: c.text,
                                  }
                                });
                              }}
                              className={`text-[9px] font-mono rounded py-1 border text-center transition-all ${
                                isSelected ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 font-bold' : 'border-slate-800 bg-slate-950 text-slate-400'
                              }`}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* SIDE B: INTERACTIVE TV SIGNAGE MONITOR PREVIEW (col-span-12 to col-span-5) */}
        <div className="col-span-12 lg:col-span-5 bg-slate-950 flex flex-col h-full border-l border-slate-800/80 sticky top-16 overflow-y-auto">
          
          {/* Header Preview controls */}
          <div className="border-b border-slate-800 bg-slate-900/10 p-4 flex justify-between items-center">
            <span className="text-xs font-mono font-bold text-slate-200 flex items-center space-x-1.5">
              <Eye className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>Live TV Signage Monitor Preview</span>
            </span>

            {/* Quick scale selection */}
            <div className="flex gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
              {[50, 75, 100].map((zoom) => (
                <button
                  key={zoom}
                  onClick={() => setPreviewZoom(zoom)}
                  className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    previewZoom === zoom ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {zoom}%
                </button>
              ))}
            </div>
          </div>

          {/* Simulated Physical TV frame wrapper */}
          <div className="flex-1 flex flex-col justify-center items-center p-6 relative bg-slate-950">
            
            {/* Absolute indicator for rotation directions */}
            <div className="absolute top-4 right-4 flex items-center space-x-2 bg-slate-900/30 backdrop-blur border border-slate-800/80 px-3 py-1.5 rounded-xl text-slate-300 text-[10px] font-mono select-none z-10">
              <span className="text-slate-500 font-bold">ORIENTASI:</span>
              <span className="text-indigo-400 font-extrabold">{activeLayout.orientation.toUpperCase()}</span>
            </div>

            {/* Simulated TV Outer Body */}
            <div
              className={`relative bg-zinc-900 border-4 border-zinc-850 rounded-3xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95)] p-2.5 transition-all duration-500 max-w-full ${
                activeLayout.orientation === 'portrait' ? 'w-80' : 'w-full max-w-lg'
              }`}
              style={{
                transform: `scale(${previewZoom / 100})`,
                transformOrigin: 'center center',
              }}
            >
              {/* Inner monitor screen glass glow overlay */}
              <div className="absolute inset-0 z-10 pointer-events-none rounded-2xl border border-white/5 bg-gradient-to-tr from-white/0 via-white/5 to-white/0" />
              
              {/* The Signage TV engine player */}
              <div className="relative z-0 overflow-hidden rounded-2xl bg-black">
                <SignageDisplay state={state} layout={activeLayout} previewMode={true} />
              </div>

              {/* Lower TV Brand logo watermark */}
              <div className="mt-1.5 text-center text-[7px] font-mono tracking-widest text-zinc-650 font-extrabold">
                SIGNAGE STUDIO • DIGITAL RETAIL SMART SYSTEM
              </div>
            </div>

            {/* Stand / Wall Mount bracket decoration under the TV frame */}
            <div className="w-16 h-4 bg-zinc-800/80 rounded-t border-t border-zinc-700/50 mt-[-2px] flex items-center justify-center pointer-events-none" />
            <div className="w-24 h-1.5 bg-zinc-900/90 rounded-full shadow-lg pointer-events-none" />

            {/* Bottom active state timeline debug logger */}
            <div className="w-full max-w-md mt-6 bg-slate-900/10 border border-slate-800 rounded-2xl p-5 text-left space-y-2.5 shadow-md">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">Active Schedule Timeline</span>
                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">AUTO MATCHING</span>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {promotions.map((p) => {
                  const isActiveHour = () => {
                    if (!p.isActive) return false;
                    if (p.schedule.allDay) return true;
                    const timeToMinutes = (t: string) => {
                      const [h, m] = t.split(':').map(Number);
                      return h * 60 + m;
                    };
                    const cur = timeToMinutes(activeTime);
                    const start = timeToMinutes(p.schedule.startTime);
                    const end = timeToMinutes(p.schedule.endTime);
                    return cur >= start && cur <= end;
                  };

                  const active = isActiveHour();

                  return (
                    <div key={p.id} className="flex justify-between items-center text-[10px] font-mono border-b border-slate-900/40 pb-1.5 last:border-0 last:pb-0">
                      <span className="flex items-center space-x-1.5 truncate text-slate-300">
                        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400 animate-ping' : 'bg-slate-700'}`} />
                        <span className="truncate">{p.title}</span>
                      </span>
                      <span className={active ? 'text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10 text-[9px]' : 'text-slate-600'}>
                        {p.schedule.allDay ? '24 JAM' : `${p.schedule.startTime}-${p.schedule.endTime}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
