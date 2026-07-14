import { useState, useEffect, useRef } from 'react';
import { SignageState, LayoutConfig, TVChannel, CCTVCamera, Promotion, LayoutMode } from '../types';
import CCTVPlayer from './CCTVPlayer';
import { Volume2, VolumeX, Radio, Shield, MonitorPlay, Calendar, Sparkles, TrendingUp, Compass, Flame, Leaf, Award } from 'lucide-react';

function getYouTubeId(url: string | undefined): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

interface SignageDisplayProps {
  state: SignageState;
  layout: LayoutConfig;
  previewMode?: boolean; // If true, scales the font sizes and elements to fit preview containers gracefully
  customTimeOverride?: string; // e.g. for previewing schedules in real-time
  onChange?: (newState: SignageState) => void;
}

export default function SignageDisplay({
  state,
  layout,
  previewMode = false,
  customTimeOverride,
  onChange,
}: SignageDisplayProps) {
  const { 
    promotions, 
    ticker, 
    activeTVChannelId, 
    activeCCTVIds, 
    useSystemTime, 
    simulatedTime, 
    volume, 
    channels, 
    cctvs,
    weatherAreaId = 'area_gadog',
    weatherAreas = [],
    displayTheme = 'slate_minimal'
  } = state;

  const getThemeConfig = () => {
    switch (displayTheme) {
      case 'cyber_neon':
        return {
          bg: 'bg-zinc-950 border-pink-500/20',
          widgetBg: 'bg-zinc-900/80 backdrop-blur-md border border-pink-500/40 shadow-[0_0_20px_rgba(236,72,153,0.2)]',
          badge: 'bg-pink-500/10 border border-pink-500/30 text-pink-400 font-mono font-bold',
          fontAccent: 'text-cyan-400',
          labelColor: 'text-pink-400 font-mono',
          borderStyle: 'border-pink-500/20'
        };
      case 'warm_gold':
        return {
          bg: 'bg-stone-950 border-amber-500/20',
          widgetBg: 'bg-stone-900/80 backdrop-blur-md border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
          badge: 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-serif font-bold',
          fontAccent: 'text-amber-400',
          labelColor: 'text-amber-500 font-serif',
          borderStyle: 'border-amber-500/20'
        };
      case 'emerald_eco':
        return {
          bg: 'bg-stone-950 border-emerald-500/20',
          widgetBg: 'bg-stone-900/80 backdrop-blur-md border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]',
          badge: 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold',
          fontAccent: 'text-emerald-400',
          labelColor: 'text-emerald-500 font-mono',
          borderStyle: 'border-emerald-500/20'
        };
      case 'royal_navy':
        return {
          bg: 'bg-slate-950 border-indigo-500/20',
          widgetBg: 'bg-slate-900/80 backdrop-blur-md border border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]',
          badge: 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-mono font-bold',
          fontAccent: 'text-indigo-400',
          labelColor: 'text-indigo-500 font-mono',
          borderStyle: 'border-indigo-500/20'
        };
      case 'slate_minimal':
      default:
        return {
          bg: 'bg-slate-950 border-slate-900',
          widgetBg: 'bg-slate-900/50 backdrop-blur-md border border-slate-800 shadow-2xl',
          badge: 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono font-bold',
          fontAccent: 'text-indigo-400',
          labelColor: 'text-slate-500 font-mono',
          borderStyle: 'border-slate-800/60'
        };
    }
  };

  const themeConfig = getThemeConfig();

  // 1. Get current simulated/real time and day of week
  const [currentTime, setCurrentTime] = useState('12:00');
  const [currentDay, setCurrentDay] = useState(1); // 1 = Monday
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (useSystemTime) {
      const updateTime = () => {
        const now = new Date();
        const hrs = now.getHours().toString().padStart(2, '0');
        const mins = now.getMinutes().toString().padStart(2, '0');
        setCurrentTime(`${hrs}:${mins}`);
        setCurrentDay(now.getDay()); // 0 = Sunday, 1 = Monday, etc.
        setSeconds(now.getSeconds());
      };
      updateTime();
      const interval = setInterval(updateTime, 1000);
      return () => clearInterval(interval);
    } else {
      setCurrentTime(simulatedTime);
      const parts = simulatedTime.split(':');
      const hrs = parseInt(parts[0], 10) || 12;
      const mins = parseInt(parts[1], 10) || 0;
      
      // Increment seconds simulated
      const interval = setInterval(() => {
        setSeconds((prev) => {
          const next = (prev + 1) % 60;
          return next;
        });
      }, 1000);

      // Default to Wednesday for simulation
      setCurrentDay(3);
      return () => clearInterval(interval);
    }
  }, [useSystemTime, simulatedTime]);

  const activeTime = customTimeOverride || currentTime;

  // 2. Filter scheduled promotions
  const [activePromos, setActivePromos] = useState<Promotion[]>([]);
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  const [tickSecond, setTickSecond] = useState(0);

  // 1-second ticker for counting down duration timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTickSecond((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const currentMins = timeToMinutes(activeTime);
    const now = Date.now();

    const filtered = promotions.filter((promo) => {
      if (!promo.isActive) return false;
      
      const sched = promo.schedule;

      // Handle duration timer schedules
      if (sched.scheduleType === 'duration_timer') {
        if (sched.endTimestamp) {
          return now < sched.endTimestamp;
        }
        return true; // if active but no endTimestamp is set yet, keep active
      }
      
      // Day of week check
      if (sched.daysOfWeek.length > 0 && !sched.daysOfWeek.includes(currentDay)) {
        return false;
      }

      if (sched.allDay) return true;

      const startMins = timeToMinutes(sched.startTime);
      const endMins = timeToMinutes(sched.endTime);

      if (startMins <= endMins) {
        return currentMins >= startMins && currentMins <= endMins;
      } else {
        // Over midnight (e.g. 22:00 - 02:00)
        return currentMins >= startMins || currentMins <= endMins;
      }
    });

    // Only update state if the filtered list of promotions actually changed
    setActivePromos((prevActivePromos) => {
      const prevIds = prevActivePromos.map((p) => p.id).join(',');
      const nextIds = filtered.map((p) => p.id).join(',');
      if (prevIds !== nextIds) {
        setCurrentPromoIndex(0); // Reset slide index ONLY when the set of active promos actually changes
        return filtered;
      }
      return prevActivePromos;
    });
  }, [promotions, activeTime, currentDay, tickSecond]);

  // Handle auto-deactivation and autoplay layout transitions when a duration-based promo expires
  useEffect(() => {
    if (previewMode || !onChange) return;

    const now = Date.now();
    let hasExpired = false;
    
    const updatedPromos = promotions.map((p) => {
      if (
        p.isActive &&
        p.schedule.scheduleType === 'duration_timer' &&
        p.schedule.endTimestamp &&
        now >= p.schedule.endTimestamp
      ) {
        hasExpired = true;
        return {
          ...p,
          isActive: false, // Mark expired promo as inactive
        };
      }
      return p;
    });

    if (hasExpired) {
      // Transition back to a default layout (e.g. l1 'full_tv' or l2 'l_shape') if we are currently in 'promo_focus'
      let nextLayoutId = state.currentLayoutId;
      const hasAnyActivePromosAfterUpdate = updatedPromos.some((p) => {
        if (!p.isActive) return false;
        if (p.schedule.scheduleType === 'duration_timer') {
          return p.schedule.endTimestamp ? now < p.schedule.endTimestamp : true;
        }
        return true;
      });

      if (!hasAnyActivePromosAfterUpdate && state.currentLayoutId === 'promo_focus') {
        nextLayoutId = 'l1'; // Autoplay: Switch layout to Standard Landscape TV (Full TV)
      }

      onChange({
        ...state,
        promotions: updatedPromos,
        currentLayoutId: nextLayoutId,
      });
    }
  }, [promotions, state, onChange, previewMode, tickSecond]);

  // 3. Slide interval for promotions rotation
  const activePromo = activePromos[currentPromoIndex] || null;

  useEffect(() => {
    if (activePromos.length <= 1) return;

    const currentDuration = (activePromo?.duration || 10) * 1000;
    const interval = setTimeout(() => {
      setCurrentPromoIndex((prev) => (prev + 1) % activePromos.length);
    }, currentDuration);

    return () => clearTimeout(interval);
  }, [activePromos, currentPromoIndex, activePromo]);

  // 4. Find active TV Channel
  const [activeChannel, setActiveChannel] = useState<TVChannel | null>(null);
  
  const channelsList = channels || [];

  useEffect(() => {
    const ch = channelsList.find(c => c.id === activeTVChannelId) || channelsList[0] || null;
    setActiveChannel(ch);
  }, [activeTVChannelId, channelsList]);

  // 5. CCTV Camera Selection
  const camerasList = cctvs || [];

  const activeCCTVs = camerasList.filter(c => activeCCTVIds.includes(c.id));

  // Video reference handling and Autoplay recovery
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const [userActivatedAudio, setUserActivatedAudio] = useState(false);
  const [videoMutedOverride, setVideoMutedOverride] = useState(false);

  const handleScreenInteraction = () => {
    if (!userActivatedAudio) {
      setUserActivatedAudio(true);
    }
    if (videoRef.current) {
      videoRef.current.muted = volume === 0;
      setVideoMutedOverride(false);
      videoRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    setVideoError(false);
    if (videoRef.current) {
      videoRef.current.load();
      
      // Attempt standard play, fall back to muted play if browser blocks unmuted autoplay
      videoRef.current.play().catch((err) => {
        console.warn("Unmuted autoplay blocked, trying muted:", err);
        if (videoRef.current) {
          videoRef.current.muted = true;
          setVideoMutedOverride(true);
          videoRef.current.play().catch(e => {
            console.error("Muted autoplay also failed:", e);
          });
        }
      });
    }
  }, [activeTVChannelId]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
      videoRef.current.muted = videoMutedOverride || volume === 0;
    }
  }, [volume, videoMutedOverride]);

  // Helper theme mapping
  const getThemeStyles = (themeName: string) => {
    switch (themeName) {
      case 'elegant_gold':
        return {
          bg: 'bg-gradient-to-br from-slate-950 via-amber-950/20 to-slate-900 border-amber-500/40',
          textTitle: 'text-amber-400 font-serif font-semibold',
          textDesc: 'text-slate-300',
          badgeBg: 'bg-amber-500/10 border-amber-400/40 text-amber-300',
          badgeIcon: <Award className="w-4 h-4 mr-1 text-amber-400 animate-pulse" />,
          accentGlow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
          badgeTextColor: 'text-amber-400',
        };
      case 'neon_sunset':
        return {
          bg: 'bg-gradient-to-br from-indigo-950 via-pink-950/20 to-slate-900 border-pink-500/40',
          textTitle: 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400 font-sans font-bold',
          textDesc: 'text-indigo-200',
          badgeBg: 'bg-pink-500/10 border-pink-400/40 text-pink-300',
          badgeIcon: <Flame className="w-4 h-4 mr-1 text-pink-400 animate-pulse" />,
          accentGlow: 'shadow-[0_0_20px_rgba(236,72,153,0.15)]',
          badgeTextColor: 'text-pink-400',
        };
      case 'emerald_fresh':
        return {
          bg: 'bg-gradient-to-br from-emerald-950 via-teal-950/20 to-slate-900 border-emerald-500/40',
          textTitle: 'text-emerald-400 font-sans font-medium',
          textDesc: 'text-slate-200',
          badgeBg: 'bg-emerald-500/10 border-emerald-400/40 text-emerald-300',
          badgeIcon: <Leaf className="w-4 h-4 mr-1 text-emerald-400 animate-bounce" />,
          accentGlow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
          badgeTextColor: 'text-emerald-400',
        };
      case 'cyber_blue':
        return {
          bg: 'bg-gradient-to-br from-slate-950 via-cyan-950/20 to-slate-900 border-cyan-500/40',
          textTitle: 'text-cyan-400 font-mono tracking-tight',
          textDesc: 'text-cyan-100/80',
          badgeBg: 'bg-cyan-500/10 border-cyan-400/40 text-cyan-300',
          badgeIcon: <Compass className="w-4 h-4 mr-1 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />,
          accentGlow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]',
          badgeTextColor: 'text-cyan-400',
        };
      case 'crimson_hot':
        return {
          bg: 'bg-gradient-to-br from-stone-950 via-red-950/20 to-stone-900 border-red-500/40',
          textTitle: 'text-red-400 font-sans font-extrabold tracking-tight',
          textDesc: 'text-stone-300',
          badgeBg: 'bg-red-500/10 border-red-400/40 text-red-300',
          badgeIcon: <TrendingUp className="w-4 h-4 mr-1 text-red-400" />,
          accentGlow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]',
          badgeTextColor: 'text-red-400',
        };
      default:
        return {
          bg: 'bg-slate-900 border-slate-700',
          textTitle: 'text-white',
          textDesc: 'text-slate-300',
          badgeBg: 'bg-slate-800 border-slate-700 text-slate-300',
          badgeIcon: <Sparkles className="w-4 h-4 mr-1" />,
          accentGlow: '',
          badgeTextColor: 'text-white',
        };
    }
  };

  // Standalone simulated ambient audio/graphic visualizer
  const renderVisualizer = () => {
    return (
      <div className="relative w-full h-full bg-slate-950 flex flex-col justify-between p-6 overflow-hidden">
        {/* Animated geometric background stars/particles */}
        <div className="absolute inset-0 z-0 opacity-10 flex items-center justify-center">
          <div className="w-[150%] h-[150%] rounded-full border border-dashed border-slate-500 animate-spin" style={{ animationDuration: '60s' }} />
          <div className="absolute w-[110%] h-[110%] rounded-full border border-dashed border-cyan-500 animate-spin" style={{ animationDuration: '45s', animationDirection: 'reverse' }} />
          <div className="absolute w-[70%] h-[70%] rounded-full border border-dotted border-rose-500 animate-spin" style={{ animationDuration: '30s' }} />
        </div>

        {/* HUD top */}
        <div className="relative z-10 flex justify-between items-center text-slate-400 text-xs">
          <span className="flex items-center space-x-1.5 font-mono">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <span className="text-white font-medium tracking-widest text-xs uppercase">Soundwave Premium Ambient Loop</span>
          </span>
          <span className="bg-slate-800 text-[10px] px-2 py-0.5 rounded border border-slate-700 tracking-wider">AUDIO ACTIVE</span>
        </div>

        {/* Waves Animation */}
        <div className="relative z-10 flex justify-center items-center h-1/2 space-x-2">
          {Array.from({ length: 15 }).map((_, i) => {
            const delay = i * 0.12;
            const heightFactor = Math.sin(i * 0.4) * 0.5 + 0.5; // beautiful wave form
            return (
              <div
                key={i}
                className="w-2.5 rounded-full bg-gradient-to-t from-cyan-500 via-rose-500 to-indigo-500 opacity-80"
                style={{
                  height: `${heightFactor * 90 + 10}%`,
                  animation: `bounceWave 1.4s ease-in-out infinite alternate`,
                  animationDelay: `${delay}s`
                }}
              />
            );
          })}
        </div>

        {/* Bottom card details */}
        <div className="relative z-10 bg-slate-900/80 border border-slate-800 p-4 rounded-lg flex items-center space-x-4">
          <div className="w-12 h-12 rounded bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0 animate-pulse">
            <Radio className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-white tracking-tight truncate">Lo-Fi Midnight Coffee Lounge</h4>
            <p className="text-xs text-slate-400 font-mono truncate">Chill beats to focus / work / study • Selected by SmartSignage TV</p>
          </div>
        </div>
      </div>
    );
  };

  const renderVideoPlayer = () => {
    if (activeChannel?.isSimulated || !activeChannel?.videoUrl) {
      return renderVisualizer();
    }

    const ytId = getYouTubeId(activeChannel.videoUrl);

    if (ytId) {
      // Force muted (mute=1) on load to guarantee browser autoplay.
      // Once the user interacts/taps, userActivatedAudio becomes true and we unmute if volume > 0.
      const isMuted = (!userActivatedAudio || volume === 0) ? 1 : 0;
      return (
        <div className="relative w-full h-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${isMuted}&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1`}
            title={activeChannel.name}
            className="w-full h-full object-cover border-0 pointer-events-none scale-[1.05]"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
          {/* Channel Watermark */}
          <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded flex items-center space-x-2 pointer-events-none z-10">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            <span className="text-[10px] font-mono font-medium text-slate-100 tracking-wider">
              {activeChannel?.name.toUpperCase()}
            </span>
          </div>
          
          {/* Overlay breaking text inside channel - sleek marquee news ticker */}
          {activeChannel?.overlayText && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-red-950/95 backdrop-blur border-t border-red-500/30 flex items-center overflow-hidden pointer-events-none z-10">
              <div className="bg-red-600 text-white text-[9px] px-3.5 py-1 font-mono font-black tracking-wider uppercase h-full flex items-center flex-shrink-0 z-20 shadow-lg select-none">
                LIVE UPDATE
              </div>
              <div className="flex-1 overflow-hidden relative flex items-center h-full">
                <div className="animate-ticker-roll whitespace-nowrap text-red-200 font-mono text-[10px] font-medium tracking-wide flex items-center">
                  <span className="inline-block px-4">{activeChannel.overlayText}</span>
                  <span className="inline-block px-4">{activeChannel.overlayText}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (videoError) {
      return renderVisualizer();
    }

    return (
      <div className="relative w-full h-full bg-black">
        <video
          ref={videoRef}
          src={activeChannel.videoUrl}
          autoPlay
          loop
          muted={videoMutedOverride || volume === 0}
          playsInline
          onError={() => setVideoError(true)}
          className="w-full h-full object-cover"
        />
        {/* Channel Watermark */}
        <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded flex items-center space-x-2 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          <span className="text-[10px] font-mono font-medium text-slate-100 tracking-wider">
            {activeChannel?.name.toUpperCase()}
          </span>
        </div>
        
        {/* Overlay breaking text inside channel - sleek marquee news ticker */}
        {activeChannel?.overlayText && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-red-950/95 backdrop-blur border-t border-red-500/30 flex items-center overflow-hidden pointer-events-none z-10">
            <div className="bg-red-600 text-white text-[9px] px-3.5 py-1 font-mono font-black tracking-wider uppercase h-full flex items-center flex-shrink-0 z-20 shadow-lg select-none">
              LIVE UPDATE
            </div>
            <div className="flex-1 overflow-hidden relative flex items-center h-full">
              <div className="animate-ticker-roll whitespace-nowrap text-red-200 font-mono text-[10px] font-medium tracking-wide flex items-center">
                <span className="inline-block px-4">{activeChannel.overlayText}</span>
                <span className="inline-block px-4">{activeChannel.overlayText}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper: Promo Frame Renderer
  const renderPromoFrame = (promo: Promotion) => {
    const t = getThemeStyles(promo.theme);
    const isPortrait = layout.orientation === 'portrait';

    return (
      <div className={`relative w-full h-full p-5 flex flex-col justify-between border rounded-3xl overflow-hidden transition-all duration-500 ${t.bg} ${t.accentGlow}`}>
        {/* Decorative corner patterns */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 via-transparent to-transparent rounded-bl-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-white/5 via-transparent to-transparent rounded-tr-full pointer-events-none" />

        {/* Header Badge */}
        <div className="flex justify-between items-start z-10">
          <div className={`flex items-center px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase border ${t.badgeBg}`}>
            {t.badgeIcon}
            <span className="font-display text-[9px] tracking-widest">{promo.badgeText}</span>
          </div>
          {promo.discountValue && (
            <div className="bg-gradient-to-r from-rose-600 to-pink-600 text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow-lg shadow-rose-950/40 transform rotate-2 animate-pulse uppercase tracking-widest border border-white/10">
              {promo.discountValue}
            </div>
          )}
        </div>

        {/* Main Promo Area: split photo & details depending on orientation */}
        {isPortrait ? (
          <div className="flex flex-col space-y-3 my-2 h-[65%] z-10 min-h-0 justify-center">
            {/* Unsplash Image Card (top) */}
            <div className="h-[45%] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 relative shadow-inner">
              <img
                src={promo.imageUrl}
                alt={promo.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
            </div>

            {/* Details Column (bottom) */}
            <div className="flex flex-col justify-start text-left space-y-1 overflow-hidden">
              <h3 className={`${t.textTitle} text-sm md:text-base font-display font-extrabold tracking-tight leading-snug line-clamp-2`}>
                {promo.title}
              </h3>
              <p className={`${t.textDesc} text-[10px] md:text-xs leading-relaxed font-light opacity-90 line-clamp-3`}>
                {promo.description}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-6 items-center my-2 h-3/5 z-10">
            {/* Unsplash Image Card (left) */}
            <div className="col-span-2 h-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 relative shadow-inner">
              <img
                src={promo.imageUrl}
                alt={promo.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
            </div>

            {/* Details Column (right) */}
            <div className="col-span-3 flex flex-col justify-center space-y-3 text-left">
              <h3 className={`${t.textTitle} text-xl md:text-2xl font-display font-extrabold tracking-tight leading-tight`}>
                {promo.title}
              </h3>
              <p className={`${t.textDesc} text-xs md:text-sm leading-relaxed font-light opacity-90`}>
                {promo.description}
              </p>
            </div>
          </div>
        )}

        {/* Footer info & slide duration visualizer */}
        <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between z-10">
          {promo.schedule.scheduleType === 'duration_timer' ? (() => {
            const now = Date.now();
            const totalSec = promo.schedule.durationSeconds || 60;
            const leftMs = (promo.schedule.endTimestamp || now) - now;
            const leftSec = Math.max(0, Math.ceil(leftMs / 1000));
            const mins = Math.floor(leftSec / 60);
            const secs = leftSec % 60;
            const progressPercent = Math.min(100, Math.max(0, (leftMs / (totalSec * 1000)) * 100));

            return (
              <>
                <div className="flex items-center text-amber-400 text-[9px] space-x-1 font-mono font-bold animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="tracking-wider uppercase">FLASH PROMO: {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')} TERSISA</span>
                </div>
                
                {/* Countdown progress bar */}
                <div className="w-24 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-red-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </>
            );
          })() : (
            <>
              <div className="flex items-center text-slate-400 text-[8px] space-x-1 font-mono truncate max-w-[65%]">
                <Calendar className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                <span className="tracking-wider uppercase truncate">JADWAL: {promo.schedule.allDay ? '24 JAM PENUH' : `${promo.schedule.startTime} - ${promo.schedule.endTime}`}</span>
              </div>
              
              {/* Sliding Timer bar */}
              <div className="w-20 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                  style={{
                    width: '100%',
                    animation: `shrinkWidth ${(promo.duration || 10)}s linear infinite`
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderFallbackPromo = () => {
    return (
      <div className="relative w-full h-full p-8 flex flex-col justify-between border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900/40 to-slate-950 rounded-3xl overflow-hidden text-center shadow-2xl">
        <div className="absolute inset-0 opacity-[0.03] flex items-center justify-center pointer-events-none">
          <Sparkles className="w-72 h-72 text-indigo-500" />
        </div>
        <div className="flex justify-center mt-2">
          <div className="flex items-center px-4 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 uppercase">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Smart Signage TV Service</span>
          </div>
        </div>

        <div className="my-8">
          <h3 className="text-white text-lg font-display font-bold tracking-tight">
            Informasi Layanan & Promosi
          </h3>
          <p className="text-slate-400 text-xs mt-3 max-w-sm mx-auto leading-relaxed font-light">
            Tidak ada promosi khusus yang terjadwal pada jam ({activeTime}) hari ini. Silakan kunjungi meja layanan untuk informasi program terbaru kami.
          </p>
        </div>

        <div className="text-[10px] text-slate-500 font-mono tracking-widest border-t border-slate-900 pt-4 uppercase">
          CONTROLLER: {activeTime} • SYSTEM: LIVE OK
        </div>
      </div>
    );
  };

  // L-Shape Weather / Clock Widget
  const renderLWidget = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const now = new Date();
    const dayName = days[now.getDay()];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

    // Use simulated time hour for custom weather feel
    const timeParts = activeTime.split(':');
    const hr = parseInt(timeParts[0], 10) || 12;
    const isNight = hr < 6 || hr > 18;
    const isPortrait = layout.orientation === 'portrait';

    // Find active weather area
    const activeArea = weatherAreas.find(a => a.id === weatherAreaId) || {
      id: 'area_gadog',
      name: 'Gadog • Puncak (Kawasan Wisata)',
      tempDay: 23,
      tempNight: 18,
      descDay: 'Hujan Ringan / Berkabut',
      descNight: 'Hujan Ringan & Dingin',
      humidity: 85,
      windSpeed: 3,
      iconDay: '🌧️',
      iconNight: '🌫️'
    };

    const temp = isNight ? activeArea.tempNight : activeArea.tempDay;
    const desc = isNight ? activeArea.descNight : activeArea.descDay;
    const icon = isNight ? activeArea.iconNight : activeArea.iconDay;

    return (
      <div className={`w-full h-full ${themeConfig.widgetBg} p-4 flex flex-col justify-between overflow-hidden shadow-2xl`}>
        <div className="flex justify-between items-center">
          <div className="flex flex-col text-left">
            <span className={`text-[8px] font-mono font-bold ${themeConfig.labelColor} uppercase tracking-widest`}>CLOCK / DATE</span>
            <span className="text-[10px] font-bold text-slate-200 mt-0.5 font-display tracking-tight">{dayName}, {dateStr}</span>
          </div>
          <div className="text-right">
            <span className={`text-xs font-mono font-bold ${themeConfig.badge} px-2.5 py-0.5 rounded-xl uppercase shadow-sm`}>
              {activeTime}
            </span>
          </div>
        </div>

        <div className={`grid ${isPortrait ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-4'} items-center my-1`}>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-sm shadow-sm animate-pulse">
              {icon}
            </div>
            <div className="text-left min-w-0">
              <p className={`text-[8px] font-mono ${themeConfig.fontAccent} uppercase font-bold tracking-wider truncate max-w-[120px]`} title={activeArea.name}>
                {activeArea.name.split('•')[0].trim()}
              </p>
              <p className="text-[10px] font-extrabold text-white font-display mt-0.5 leading-tight truncate">{desc}</p>
            </div>
          </div>
          <div className={`text-right ${isPortrait ? 'text-left pt-1 border-t border-slate-800/60' : 'border-l border-slate-800/80 pl-4'}`}>
            <p className="text-base font-black text-slate-100 font-display">{temp}°C</p>
            <p className="text-[8px] font-mono text-slate-400 tracking-wide mt-0.5 font-light">HUM: {activeArea.humidity}% | WIND: {activeArea.windSpeed}m/s</p>
          </div>
        </div>

        <div className="border-t border-slate-800/60 pt-2 flex items-center justify-between text-[8px] font-mono text-slate-500 tracking-wider">
          <span>HOST ID: TVS-HQ-09</span>
          <span className="text-emerald-400 flex items-center font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-ping" />
            LIVE SIGNAL
          </span>
        </div>
      </div>
    );
  };

  // 6. Layout-specific assembly
  const renderLayoutContent = () => {
    switch (layout.mode) {
      case 'full_tv':
        return (
          <div className="w-full h-full relative bg-slate-950">
            {renderVideoPlayer()}
          </div>
        );

      case 'split_tv_cctv':
        if (layout.orientation === 'portrait') {
          return (
            <div className="w-full h-full flex flex-col gap-4 p-4 bg-slate-950">
              {/* TV Broadcast (top, h-[55%]) */}
              <div className="h-[55%] rounded-3xl overflow-hidden border border-slate-800 relative shadow-2xl bg-slate-900/50 backdrop-blur-md min-h-0">
                {renderVideoPlayer()}
              </div>
              
              {/* CCTV Security Monitors (bottom, h-[45%]) */}
              <div className="h-[45%] flex flex-col space-y-3 overflow-hidden min-h-0">
                <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-2xl flex items-center justify-between shadow-2xl">
                  <span className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-indigo-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest font-display">CCTV Security Matrix</span>
                  </span>
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">AUTO PAN</span>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
                  {activeCCTVs.slice(0, 2).map((cam) => (
                    <div key={cam.id} className="relative min-h-0 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                      <CCTVPlayer camera={cam} simulatedTime={activeTime} />
                    </div>
                  ))}
                  {activeCCTVs.length === 0 && (
                    <div className="col-span-2 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex items-center justify-center text-slate-500 text-xs">
                      No CCTV Cameras Connected
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="w-full h-full grid grid-cols-12 gap-4 p-4 bg-slate-950">
            {/* TV Broadcast (col-span-8) */}
            <div className="col-span-8 rounded-3xl overflow-hidden border border-slate-800 relative shadow-2xl bg-slate-900/50 backdrop-blur-md">
              {renderVideoPlayer()}
            </div>
            
            {/* CCTV Security Monitors (col-span-4) */}
            <div className="col-span-4 flex flex-col space-y-4 h-full overflow-hidden">
              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-2xl">
                <span className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-widest font-display">CCTV Security Matrix</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">AUTO PAN</span>
              </div>
              <div className="flex-1 grid grid-rows-2 gap-4 min-h-0">
                {activeCCTVs.slice(0, 2).map((cam) => (
                  <div key={cam.id} className="relative min-h-0 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                    <CCTVPlayer camera={cam} simulatedTime={activeTime} />
                  </div>
                ))}
                {activeCCTVs.length === 0 && (
                  <div className="row-span-2 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex items-center justify-center text-slate-500 text-xs">
                    No CCTV Cameras Connected
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'l_shape':
        if (layout.orientation === 'portrait') {
          return (
            <div className="w-full h-full flex flex-col gap-4 p-4 bg-slate-950">
              {/* Top: TV Broadcast */}
              <div className="h-[35%] rounded-3xl overflow-hidden border border-slate-800 relative shadow-2xl bg-slate-900/50 min-h-0">
                {renderVideoPlayer()}
              </div>

              {/* Middle: Scheduled Promo */}
              <div className="h-[35%] rounded-3xl overflow-hidden shadow-2xl min-h-0">
                {activePromo ? renderPromoFrame(activePromo) : renderFallbackPromo()}
              </div>

              {/* Bottom: CCTV & Weather in a grid */}
              <div className="h-[30%] grid grid-cols-12 gap-4 min-h-0">
                {/* CCTV Camera Feed (col-span-6) */}
                <div className="col-span-6 relative min-h-0 rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
                  {activeCCTVs.length > 0 ? (
                    <CCTVPlayer camera={activeCCTVs[0]} simulatedTime={activeTime} />
                  ) : (
                    <div className="w-full h-full bg-slate-900/30 border border-slate-800/80 rounded-2xl flex items-center justify-center text-slate-500 text-[10px] font-medium">
                      No Security CCTV Online
                    </div>
                  )}
                </div>

                {/* Weather Widget (col-span-6) */}
                <div className="col-span-6 min-h-0">
                  {renderLWidget()}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="w-full h-full grid grid-rows-12 grid-cols-12 gap-4 p-4 bg-slate-950">
            {/* Row 1: TV (top-left) & Scheduled Promo Card (top-right) */}
            {/* Top-Left: TV Broadcast (col-span-7, row-span-8) */}
            <div className="col-span-7 row-span-8 rounded-3xl overflow-hidden border border-slate-800 relative shadow-2xl bg-slate-900/50 min-h-0">
              {renderVideoPlayer()}
            </div>

            {/* Top-Right: Scheduled Promo (col-span-5, row-span-8) */}
            <div className="col-span-5 row-span-8 rounded-3xl overflow-hidden shadow-2xl min-h-0">
              {activePromo ? renderPromoFrame(activePromo) : renderFallbackPromo()}
            </div>

            {/* Row 2: CCTV Feed monitors (bottom-left) & Weather widget (bottom-right) */}
            {/* Bottom-Left: CCTV Camera Grid (col-span-7, row-span-4) */}
            <div className="col-span-7 row-span-4 grid grid-cols-2 gap-4 min-h-0">
              {activeCCTVs.slice(0, 2).map((cam) => (
                <div key={cam.id} className="relative min-h-0 rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
                  <CCTVPlayer camera={cam} simulatedTime={activeTime} />
                </div>
              ))}
              {activeCCTVs.length === 0 && (
                <div className="col-span-2 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex items-center justify-center text-slate-500 text-xs font-medium">
                  No Security CCTV Online
                </div>
              )}
            </div>

            {/* Bottom-Right: Weather Widget (col-span-5, row-span-4) */}
            <div className="col-span-5 row-span-4 min-h-0">
              {renderLWidget()}
            </div>
          </div>
        );

      case 'quad_cctv':
        return (
          <div className="w-full h-full p-4 bg-slate-950 grid grid-cols-2 grid-rows-2 gap-4">
            {activeCCTVs.slice(0, 4).map((cam) => (
              <div key={cam.id} className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                <CCTVPlayer camera={cam} simulatedTime={activeTime} />
              </div>
            ))}
            {activeCCTVs.length === 0 && (
              <div className="col-span-2 row-span-2 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex items-center justify-center text-slate-500 text-xs">
                No CCTV Cameras Connected to Security Unit
              </div>
            )}
          </div>
        );

      case 'promo_focus':
        return (
          <div className="w-full h-full p-6 bg-slate-950 flex items-center justify-center">
            <div className="w-full h-full max-w-5xl max-h-[95%]">
              {activePromo ? renderPromoFrame(activePromo) : renderFallbackPromo()}
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full h-full bg-slate-950 flex items-center justify-center text-white text-lg">
            Layout Configuration Error
          </div>
        );
    }
  };

  return (
    <div
      id="signage-view"
      onClick={handleScreenInteraction}
      className={`relative w-full h-full flex flex-col ${themeConfig.bg} text-slate-50 select-none overflow-hidden cursor-pointer ${
        layout.orientation === 'portrait' ? 'aspect-[9/16]' : 'aspect-[16/9]'
      }`}
    >
      {/* Tap to Unmute Overlay for Autoplay restrictions bypass */}
      {(!userActivatedAudio || videoMutedOverride) && volume > 0 && !previewMode && (
        <div className="absolute top-4 right-4 z-50 bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-pulse select-none">
          <VolumeX className="w-4 h-4" />
          <span>Suara Terbungkam (Ketuk Layar untuk Suara)</span>
        </div>
      )}
      <style>{`
        @keyframes bounceWave {
          0% { transform: scaleY(0.1); }
          100% { transform: scaleY(1); }
        }
        @keyframes shrinkWidth {
          0% { width: 100%; }
          100% { width: 0%; }
        }
        @keyframes tickerRoll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker-roll {
          display: inline-block;
          animation: tickerRoll 25s linear infinite;
        }
      `}</style>

      {/* Main Grid Viewport */}
      <div className="flex-1 min-h-0 relative">
        {renderLayoutContent()}
      </div>

      {/* Ticker / Marquee footer bar (if configured) */}
      {layout.showTicker && (
        <div
          className="h-10 border-t flex-shrink-0 flex items-center overflow-hidden whitespace-nowrap select-none font-mono relative z-20"
          style={{
            backgroundColor: ticker.backgroundColor,
            color: ticker.textColor,
            borderColor: 'rgba(255,255,255,0.05)',
            fontSize: ticker.fontSize === 'sm' ? '11px' : ticker.fontSize === 'md' ? '13px' : '15px'
          }}
        >
          {/* Ticker label */}
          <div className="absolute left-0 top-0 bottom-0 px-3 bg-rose-700 text-white flex items-center text-xs font-bold uppercase tracking-wider z-30 shadow-lg select-none">
            <TrendingUp className="w-3.5 h-3.5 mr-1 animate-pulse" />
            <span>INFO TV</span>
          </div>

          {/* Rolling container */}
          <div className="flex items-center w-full pl-28">
            <div
              className={`inline-block whitespace-nowrap animate-marquee`}
              style={{
                animation: `marqueeRoll ${
                  ticker.speed === 'slow' ? '40s' : ticker.speed === 'medium' ? '25s' : '12s'
                } linear infinite`,
              }}
            >
              <span className="inline-block px-4">{ticker.text}</span>
              <span className="inline-block px-4">{ticker.text}</span> {/* duplicated for seamless infinite scroll */}
            </div>
          </div>

          <style>{`
            @keyframes marqueeRoll {
              0% { transform: translateX(0%); }
              100% { transform: translateX(-50%); }
            }
            .animate-marquee {
              display: inline-block;
              padding-left: 100%;
              animation: marqueeRoll 20s linear infinite;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
