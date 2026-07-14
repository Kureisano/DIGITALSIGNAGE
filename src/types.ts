export type LayoutMode = 'full_tv' | 'split_tv_cctv' | 'l_shape' | 'quad_cctv' | 'promo_focus';

export type DisplayOrientation = 'landscape' | 'portrait';

export interface LayoutConfig {
  id: string;
  name: string;
  mode: LayoutMode;
  orientation: DisplayOrientation;
  aspectRatio: string; // "16:9", "9:16", "4:3", etc.
  showTicker: boolean;
  activePromoId?: string; // Optional manual override, or "auto"
}

export interface TVChannel {
  id: string;
  name: string;
  category: 'News' | 'Entertainment' | 'Sports' | 'Documentary' | 'Scenery';
  videoUrl: string; // Can be mock or a real open-source stream
  logoUrl?: string;
  isSimulated: boolean;
  overlayText?: string;
}

export interface CCTVCamera {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'alert';
  fps: number;
  noiseLevel: number; // 0-100
  panSpeed: number; // 0-10 (simulated panning drift)
  hasMotion: boolean;
  colorTheme: 'monochrome' | 'emerald' | 'amber' | 'nightvision';
  rtspUrl?: string;
}

export interface PromoSchedule {
  allDay: boolean;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  daysOfWeek: number[]; // [0, 1, 2, 3, 4, 5, 6] (0 = Sunday, etc.)
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discountValue?: string; // e.g. "20% OFF" or "Buy 1 Get 1"
  badgeText?: string; // e.g. "Morning Special", "Limited Time"
  imageUrl: string; // curated unsplash or custom URL
  theme: 'elegant_gold' | 'neon_sunset' | 'emerald_fresh' | 'cyber_blue' | 'crimson_hot';
  schedule: PromoSchedule;
  duration: number; // Slide display duration in seconds
  isActive: boolean;
}

export interface TickerConfig {
  text: string;
  speed: 'slow' | 'medium' | 'fast';
  backgroundColor: string;
  textColor: string;
  fontSize: 'sm' | 'md' | 'lg';
}

export interface WeatherArea {
  id: string;
  name: string;
  tempDay: number;
  tempNight: number;
  descDay: string;
  descNight: string;
  humidity: number;
  windSpeed: number;
  iconDay: string;
  iconNight: string;
}

export interface SignageState {
  currentLayoutId: string;
  activeTVChannelId: string;
  activeCCTVIds: string[]; // Up to 4 active cameras
  ticker: TickerConfig;
  promotions: Promotion[];
  channels: TVChannel[];
  cctvs: CCTVCamera[];
  useSystemTime: boolean;
  simulatedTime: string; // "HH:MM" when useSystemTime is false
  volume: number; // 0-100
  layouts?: LayoutConfig[]; // Optional list to support customized template settings (orientation, ticker etc.)
  weatherAreaId?: string; // Selected weather area ID
  weatherAreas?: WeatherArea[]; // List of available weather areas
  displayTheme?: 'slate_minimal' | 'cyber_neon' | 'warm_gold' | 'emerald_eco' | 'royal_navy'; // Display global dashboard theme
}
