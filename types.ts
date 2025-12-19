
export interface TrackPoint {
  lat: number;
  lon: number;
  ele: number;
  time: Date;
  cummulativeDistance: number;
  hr?: number; // Heart rate in BPM
}

export interface Track {
  id: string;
  name: string;
  points: TrackPoint[];
  color: string;
  distance: number; // in kilometers
  duration: number; // in milliseconds
  groupId?: string;
}

export interface RaceRunner {
  trackId: string;
  position: { lat: number; lon: number };
  color: string;
}

export interface RaceResult {
  rank: number;
  trackId: string;
  name: string;
  color: string;
  finishTime: number; // ms
  avgSpeed: number; // km/h
  distance: number; // km
}

export interface PauseSegment {
    startPoint: TrackPoint;
    endPoint: TrackPoint;
    duration: number; // in seconds
}

export interface MapDisplayProps {
  tracks: Track[];
  visibleTrackIds: Set<string>;
  raceRunners: RaceRunner[] | null;
  hoveredTrackId: string | null;
  runnerSpeeds: Map<string, number>;
  selectionPoints?: TrackPoint[] | null;
  hoveredPoint?: TrackPoint | null; // For editor hover
  pauseSegments?: PauseSegment[]; // For editor pause markers
  showPauses?: boolean;
  onMapHover?: (point: TrackPoint | null) => void; // For editor map hover -> chart sync
  onPauseClick?: (segment: PauseSegment) => void;
  mapGradientMetric?: 'none' | 'elevation' | 'pace' | 'speed' | 'hr' | 'hr_zones';
  coloredPauseSegments?: PauseSegment[];
  selectedPoint?: TrackPoint | null; // Point selected by clicking
  onPointClick?: (point: TrackPoint | null) => void; // Callback for when a point is clicked on map
  hoveredLegendValue?: number | null; // The value of the metric at the hovered point

  // Animation Props
  animationTrack?: Track | null;
  animationProgress?: number;
  onExitAnimation?: () => void;
  fastestSplitForAnimation?: Split | null;
  animationHighlight?: Split | null;
  animationKmHighlight?: Split | null;
  isAnimationPlaying?: boolean;
  onToggleAnimationPlay?: () => void;
  onAnimationProgressChange?: (progress: number) => void;
  animationSpeed?: number;
  onAnimationSpeedChange?: (speed: number) => void;
  fitBoundsCounter?: number;
  aiSegmentHighlight?: AiSegment | null;
  showSummaryMode?: boolean;
  
  // Recording Props
  isRecording?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}


export interface Split {
    splitNumber: number;
    distance: number;
    duration: number;
    pace: number;
    elevationGain: number;
    elevationLoss: number;
    avgHr: number | null;
    isFastest: boolean;
    isSlowest: boolean;
}

export interface TrackStats {
    totalDistance: number;
    totalDuration: number;
    movingDuration: number;
    elevationGain: number;
    elevationLoss: number;
    avgPace: number;
    movingAvgPace: number;
    maxSpeed: number;
    avgSpeed: number;
    avgHr: number | null;
    maxHr: number | null;
    minHr: number | null;
    splits: Split[];
    pauses: PauseSegment[];
}

export interface RaceHighlight {
  title: string;
  value: string;
  trackName: string;
  trackColor: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Weather {
  temperature: number;
  windSpeed: number;
  humidity: number;
  condition: string;
}

export interface AiSegment {
  type: 'ai';
  title: string;
  description: string;
  startDistance: number;
  endDistance: number;
  // Calculated stats for display
  distance: number;
  duration: number;
  pace: number;
  elevationGain: number;
}

export type RunningGoal = 'none' | '5k' | '10k' | 'half_marathon' | 'marathon' | 'speed' | 'endurance' | 'weight_loss';

export interface UserProfile {
  age?: number;
  weight?: number;
  gender?: 'male' | 'female' | 'other';
  maxHr?: number;
  restingHr?: number;
  goal?: RunningGoal;
}

export interface PersonalRecord {
  distance: number; // in meters
  time: number; // in milliseconds
  trackId: string;
  trackName: string;
  date: string; // ISO string
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    gpxApp?: {
      addTokens: (count: number) => void;
    };
    aistudio?: AIStudio;
  }
}
