
import React, { useState } from 'react';
import { Track } from '../types';
import TrackPreview from './TrackPreview';

interface SidebarProps {
  tracks: Track[];
  onFileUpload: (files: File[] | null) => void;
  visibleTrackIds: Set<string>;
  onToggleVisibility: (trackId: string) => void;
  raceSelectionIds: Set<string>;
  onToggleRaceSelection: (trackId: string) => void;
  onDeselectAll: () => void;
  onStartRace: () => void;
  onGoToEditor: () => void;
  onPauseRace: () => void;
  onResumeRace: () => void;
  onResetRace: () => void;
  simulationState: 'idle' | 'running' | 'paused' | 'finished';
  simulationTime: number;
  onTrackHoverStart: (trackId: string) => void;
  onTrackHoverEnd: () => void;
  raceProgress: Map<string, number>;
  simulationSpeed: number;
  onSpeedChange: (speed: number) => void;
  lapTimes: Map<string, number[]>;
  sortOrder: string;
  onSortChange: (order: string) => void;
  onDeleteTrack: (trackId: string) => void;
  onViewDetails: (trackId: string) => void;
  onStartAnimation: (trackId: string) => void;
  raceRanks: Map<string, number>;
  runnerSpeeds: Map<string, number>;
  runnerDistances: Map<string, number>;
  runnerGapsToLeader: Map<string, number>;
  collapsedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onOpenChangelog: () => void;
  onOpenProfile: () => void;
  tokenCount: number;
  
  // Recording Props
  isRecording?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
    </svg>
);

const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);

const ResetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-4.518v-4.518l1.903 1.903A9 9 0 0 0 3 10.5a9 9 0 0 0 9 9c2.39 0 4.58-1.102 6.048-2.853l-1.48-1.48A7.5 7.5 0 0 1 12 18a7.5 7.5 0 0 1-7.245-7.941Z" clipRule="evenodd" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0 51.196 51.196 0 0 1-3.273 0zM15 9.75a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5a.75.75 0 0 1 .75-.75zm-4.5 0a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5a.75.75 0 0 1 .75-.75z" clipRule="evenodd" />
    </svg>
);

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32L19.513 8.2Z" />
    </svg>
);

const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
    </svg>
);

const PlayCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm14.024-.983a1.125 1.125 0 0 1 0 1.966l-5.603 3.235A1.125 1.125 0 0 1 9 15.235V8.765a1.125 1.125 0 0 1 1.671-.983l5.603 3.235Z" clipRule="evenodd" />
    </svg>
);

const ChevronIcon = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-6 h-6 text-slate-400 transition-transform duration-300 ${isCollapsed ? 'transform -rotate-90' : ''}`}>
        <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
);

const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
    </svg>
);

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
    </svg>
);

const UploadCloudIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 mx-auto text-slate-500">
        <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06l-3.22-3.22V16.5a.75.75 0 0 1-1.5 0V4.81L8.03 8.03a.75.75 0 0 1-1.06-1.06l4.5-4.5ZM3 15.75a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);

const RecordIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm0 8.625a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25ZM1.5 12a10.5 10.5 0 0 1 10.5-10.5v10.5h10.5a10.5 10.5 0 0 1-10.5 10.5V12H1.5Z" clipRule="evenodd" />
        <circle cx="12" cy="12" r="6" />
    </svg>
);

const StopRecordIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500">
        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
    </svg>
);


const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatPace = (durationMs: number, distanceKm: number) => {
  if (distanceKm <= 0) {
    return '--:-- /km';
  }
  const paceInSeconds = (durationMs / 1000) / distanceKm;
  const minutes = Math.floor(paceInSeconds / 60);
  const seconds = Math.round(paceInSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
};

const formatPaceFromSpeed = (speedKmh: number): string => {
    if (speedKmh < 0.1) {
        return '--:-- /km';
    }
    const paceInMinutes = 60 / speedKmh;
    const minutes = Math.floor(paceInMinutes);
    const seconds = Math.round((paceInMinutes - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
};

interface TrackItemProps {
  track: Track;
  onTrackHoverStart: (trackId: string) => void;
  onTrackHoverEnd: () => void;
  visibleTrackIds: Set<string>;
  onToggleVisibility: (trackId: string) => void;
  raceSelectionIds: Set<string>;
  onToggleRaceSelection: (trackId: string) => void;
  simulationState: 'idle' | 'running' | 'paused' | 'finished';
  onDeleteTrack: (trackId: string) => void;
  onViewDetails: (trackId: string) => void;
  onStartAnimation: (trackId: string) => void;
}

const TrackItem: React.FC<TrackItemProps> = ({ track, onTrackHoverStart, onTrackHoverEnd, visibleTrackIds, onToggleVisibility, raceSelectionIds, onToggleRaceSelection, simulationState, onDeleteTrack, onViewDetails, onStartAnimation }) => (
    <li
        className="bg-slate-700 p-3 rounded-lg flex items-start space-x-3 transition-all duration-200 hover:bg-slate-600"
        onMouseEnter={() => onTrackHoverStart(track.id)}
        onMouseLeave={onTrackHoverEnd}
    >
        <TrackPreview
            points={track.points}
            color={track.color}
            className="w-20 h-14 bg-slate-800 rounded flex-shrink-0 border border-slate-600"
        />
        <div className="flex-grow overflow-hidden">
            <div className="flex items-center justify-between">
                <div className="flex items-center overflow-hidden">
                    <span className="font-medium truncate" title={track.name}>{track.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="flex items-center" title="Toggle visibility">
                        <input
                            type="checkbox"
                            checked={visibleTrackIds.has(track.id)}
                            onChange={() => onToggleVisibility(track.id)}
                            className="w-4 h-4 text-amber-500 bg-slate-600 border-slate-500 rounded focus:ring-amber-600"
                        />
                    </div>
                    <div className="flex items-center" title="Select for race/edit">
                        <input
                            type="checkbox"
                            checked={raceSelectionIds.has(track.id)}
                            onChange={() => onToggleRaceSelection(track.id)}
                            className="w-4 h-4 text-cyan-500 bg-slate-600 border-slate-500 rounded focus:ring-cyan-600"
                            disabled={simulationState !== 'idle'}
                        />
                    </div>
                     <button
                        onClick={() => onStartAnimation(track.id)}
                        disabled={simulationState !== 'idle'}
                        className="text-slate-500 hover:text-green-400 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                        title="Animation"
                        aria-label="Start animation"
                    >
                        <PlayCircleIcon />
                    </button>
                     <button
                        onClick={() => onViewDetails(track.id)}
                        disabled={simulationState !== 'idle'}
                        className="text-slate-500 hover:text-sky-400 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                        title="View details"
                        aria-label="View details"
                    >
                        <InfoIcon />
                    </button>
                    <button
                        onClick={() => onDeleteTrack(track.id)}
                        disabled={simulationState !== 'idle'}
                        className="text-slate-500 hover:text-red-500 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                        title="Delete track"
                        aria-label="Delete track"
                    >
                        <TrashIcon />
                    </button>
                </div>
            </div>
            <div className="text-xs text-slate-400 mt-2 flex justify-between items-center">
                <span title="Distance">{track.distance.toFixed(2)} km</span>
                <span title="Total Time">{formatDuration(track.duration)}</span>
                <span title="Average Pace" className="font-mono whitespace-nowrap">{formatPace(track.duration, track.distance)}</span>
            </div>
        </div>
    </li>
);

const SHOW_TOKEN_COUNTER = true;

const Sidebar: React.FC<SidebarProps> = ({
  tracks, onFileUpload, visibleTrackIds, onToggleVisibility,
  raceSelectionIds, onToggleRaceSelection, onDeselectAll, onStartRace, onGoToEditor, onPauseRace, onResumeRace, onResetRace, simulationState, simulationTime,
  onTrackHoverStart, onTrackHoverEnd, raceProgress, simulationSpeed, onSpeedChange, lapTimes, sortOrder, onSortChange, onDeleteTrack, onViewDetails, onStartAnimation,
  raceRanks, runnerSpeeds, runnerDistances, runnerGapsToLeader, collapsedGroups, onToggleGroup, onOpenChangelog, onOpenProfile, tokenCount,
  isRecording, onStartRecording, onStopRecording
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onFileUpload(Array.from(e.dataTransfer.files));
          e.dataTransfer.clearData();
      }
  };


  const tracksToDisplay = (simulationState === 'running' || simulationState === 'paused' || simulationState === 'finished')
      ? tracks.filter(t => raceSelectionIds.has(t.id))
      : tracks;
      
  const renderedGroupIds = new Set<string>();
  
  const selectionCount = raceSelectionIds.size;
  let editorButtonText = "Edit Selected";
  if (selectionCount > 1) editorButtonText = `Merge & Edit (${selectionCount})`;

  return (
    <div className="bg-slate-800 text-white flex flex-col h-full p-4 overflow-y-auto">
      <div className="relative bg-slate-900/50 p-4 rounded-lg mb-6 text-center">
        <div className="absolute top-2 right-2 flex items-center space-x-1">
            <button onClick={onOpenProfile} title="Profilo Utente" aria-label="Open user profile" className="text-slate-400 hover:bg-slate-700 p-1.5 rounded-md transition-colors">
                <UserIcon />
            </button>
            <button onClick={onOpenChangelog} title="Registro Modifiche" aria-label="Open changelog" className="text-slate-400 hover:bg-slate-700 p-1.5 rounded-md transition-colors">
                <HistoryIcon />
            </button>
        </div>
        <h1 className="text-3xl font-bold text-cyan-400">
            GPX Visualizer
        </h1>
        <div className="text-xs text-slate-500 mt-1 space-x-2">
            <span>v1.12</span>
            {SHOW_TOKEN_COUNTER && (
                <span title="AI token usage since first use. Stored in your browser's local storage.">
                    | AI Tokens: {tokenCount.toLocaleString()}
                </span>
            )}
        </div>
        
        <label 
            htmlFor="gpx-upload" 
            className={`relative block w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 mt-4
                ${isDraggingOver ? 'border-cyan-400 bg-slate-700/50' : 'border-slate-600 hover:border-slate-500'}`
            }
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <UploadCloudIcon />
            <span className="mt-2 block text-sm font-semibold text-slate-200">
                Trascina e rilascia i file GPX/TCX
            </span>
            <span className="mt-1 block text-xs text-slate-400">o clicca per selezionare</span>
            <input
                id="gpx-upload"
                type="file"
                multiple
                accept=".gpx, .tcx"
                onChange={(e) => {
                    if (e.target.files) {
                        const filesArray = Array.from(e.target.files);
                        onFileUpload(filesArray);
                    }
                    e.currentTarget.value = '';
                }}
                className="sr-only"
            />
        </label>
      </div>

      <div className="mb-6 border-t border-slate-700 pt-4">
          <h2 className="text-lg font-semibold text-slate-200 mb-2">Actions</h2>
          { (simulationState === 'running' || simulationState === 'paused' || simulationState === 'finished') && <div className="font-mono text-2xl text-amber-400 mb-2">{formatDuration(simulationTime)}</div>}
          
          {simulationState === 'idle' ? (
              <div className="space-y-2">
                  <p className="text-sm text-slate-400">Select tracks to start a race or edit.</p>
                  <div className="flex space-x-2">
                      <button
                          onClick={onStartRace}
                          disabled={raceSelectionIds.size < 2}
                          className="flex-1 flex items-center justify-center bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition-colors"
                      >
                          <PlayIcon /> <span className="ml-2">Start Race</span>
                      </button>
                      <button
                          onClick={onGoToEditor}
                          disabled={raceSelectionIds.size < 1}
                          className="flex-1 flex items-center justify-center bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition-colors"
                      >
                          <EditIcon /> <span className="ml-2">{editorButtonText}</span>
                      </button>
                  </div>
                  {raceSelectionIds.size === 1 && <p className="text-xs text-amber-400 mt-1">Select another track to start a race.</p>}
                  {raceSelectionIds.size > 0 && <button onClick={onDeselectAll} className="w-full text-sm text-cyan-400 hover:text-cyan-300 mt-2">Deselect all</button>}
              </div>
          ) : (
              <div className="flex space-x-2">
                  {simulationState === 'running' ? (
                      <button
                          onClick={onPauseRace}
                          className="flex-1 flex items-center justify-center bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
                      >
                          <PauseIcon /> <span className="ml-2">Pause</span>
                      </button>
                  ) : simulationState === 'paused' ? (
                      <button
                          onClick={onResumeRace}
                          className="flex-1 flex items-center justify-center bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
                      >
                          <PlayIcon /> <span className="ml-2">Resume</span>
                      </button>
                  ) : (
                      // Finished state, only Reset is needed
                      <div className="flex-1" />
                  )}
                  <button
                      onClick={onResetRace}
                      className="flex-1 flex items-center justify-center bg-slate-500 hover:bg-slate-400 text-white font-bold py-2 px-4 rounded-md transition-colors"
                  >
                      <ResetIcon /><span className="ml-2">Reset</span>
                  </button>
                  
                  {onStartRecording && onStopRecording && (
                        <button
                            onClick={isRecording ? onStopRecording : onStartRecording}
                            className={`flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-3 rounded-md transition-colors ${isRecording ? 'animate-pulse text-red-500' : 'text-slate-300 hover:text-red-400'}`}
                            title={isRecording ? "Ferma Registrazione" : "Registra Video"}
                        >
                            {isRecording ? <StopRecordIcon /> : <RecordIcon />}
                        </button>
                  )}
              </div>
          )}
          
          {(simulationState === 'running' || simulationState === 'paused' || simulationState === 'finished') && (
          <div className="mt-4">
              <label htmlFor="speed-control" className="block text-sm font-medium text-slate-300">
              Speed: <span className="font-bold text-amber-400">{simulationSpeed.toFixed(1)}x</span>
              </label>
              <input
              id="speed-control"
              type="range"
              min="0.5"
              max="10"
              step="0.1"
              value={simulationSpeed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
              />
          </div>
          )}
      </div>


      <div className="flex-grow border-t border-slate-700 pt-4">
          <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-slate-200">
                  {simulationState !== 'idle' ? `Racing (${tracksToDisplay.length})` : `My Tracks (${tracks.length})`}
              </h2>
              {simulationState === 'idle' && (
              <div className="relative">
                  <select 
                      value={sortOrder} 
                      onChange={(e) => onSortChange(e.target.value)}
                      className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-1.5"
                  >
                      <option value="date">Ordina per: Data</option>
                      <option value="group">Ordina per: Percorso</option>
                      <option value="distance">Ordina per: Distanza</option>
                      <option value="name">Ordina per: Nome</option>
                      <option value="speed">Ordina per: Velocità</option>
                  </select>
              </div>
              )}
          </div>
          <ul className="space-y-3">
          {tracksToDisplay.map((track) => {
              const isRacing = simulationState === 'running' || simulationState === 'paused' || simulationState === 'finished';

              if (isRacing) {
                  const rank = raceRanks.get(track.id);
                  const speed = runnerSpeeds.get(track.id) ?? 0;
                  const distance = runnerDistances.get(track.id) ?? 0;
                  const gapLeader = runnerGapsToLeader.get(track.id);
                  const progress = raceProgress.get(track.id) ?? 0;

                  let gapDisplay: React.ReactNode;
                  if (rank === 1) {
                      gapDisplay = <span className="text-amber-400 font-bold">Leader</span>;
                  } else if (gapLeader !== undefined) {
                      const formattedGap = gapLeader > 1000 ? `${(gapLeader/1000).toFixed(2)}km` : `${gapLeader.toFixed(0)}m`;
                      gapDisplay = <span>-{formattedGap}</span>;
                  } else {
                      gapDisplay = <span>--</span>;
                  }
                  
                  return (
                      <li key={track.id} className="bg-slate-700/80 p-3 rounded-lg flex space-x-3">
                          <div className="flex flex-col items-center flex-shrink-0 w-10 text-center">
                              <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: track.color }}></div>
                              <span className={`text-2xl font-bold ${rank === 1 ? 'text-amber-400' : 'text-slate-300'}`}>{rank || '-'}</span>
                          </div>
                          <div className="flex-grow overflow-hidden">
                              <div className="flex justify-between items-baseline">
                                  <p className="font-medium truncate text-slate-200" title={track.name}>{track.name}</p>
                                  <p className="font-mono text-base whitespace-nowrap pl-2" title="Current Pace">{formatPaceFromSpeed(speed)}</p>
                              </div>
                              <div className="grid grid-cols-3 gap-x-2 text-xs mt-1 text-slate-400 font-mono">
                                  <div title="Current Speed">⚡ {speed.toFixed(1)} km/h</div>
                                  <div title="Distance Covered">📍 {distance.toFixed(2)} km</div>
                                  <div title="Gap to Leader" className="text-right truncate">📊 {gapDisplay}</div>
                              </div>
                              <div className="mt-2" title={`Progress: ${(progress * 100).toFixed(0)}%`}>
                                  <div className="w-full bg-slate-500 rounded-full h-1.5">
                                      <div
                                          className="bg-cyan-400 h-1.5 rounded-full transition-all duration-100 ease-linear"
                                          style={{ width: `${progress * 100}%` }}
                                      ></div>
                                  </div>
                              </div>
                          </div>
                      </li>
                  );

              } else {
                  if (sortOrder === 'group' && track.groupId) {
                      if (renderedGroupIds.has(track.groupId)) {
                          return null; // Already rendered in a group
                      }
                      renderedGroupIds.add(track.groupId);

                      const groupTracks = tracksToDisplay.filter(t => t.groupId === track.groupId);
                      const isCollapsed = collapsedGroups.has(track.groupId);
                      const representativeTrack = groupTracks[0];

                      return (
                          <li key={track.groupId} className="bg-slate-700/70 rounded-lg flex flex-col transition-all duration-300">
                              <button
                                  onClick={() => onToggleGroup(track.groupId)}
                                  className="w-full text-left p-3 flex justify-between items-center hover:bg-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                  aria-expanded={!isCollapsed}
                              >
                                  <div className="flex items-center space-x-3 overflow-hidden">
                                      <TrackPreview points={representativeTrack.points} color="#67e8f9" className="w-20 h-14 bg-slate-800 rounded flex-shrink-0 border border-slate-600" />
                                      <div className="overflow-hidden">
                                          <p className="font-semibold text-slate-100 truncate">{groupTracks.length} Similar Tracks</p>
                                          <div className="text-xs text-slate-400 mt-1 flex space-x-3">
                                              <span title="Average Distance">~{representativeTrack.distance.toFixed(2)} km</span>
                                              <span title="Average Time">~{formatDuration(representativeTrack.duration)}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <ChevronIcon isCollapsed={isCollapsed} />
                              </button>
                              {!isCollapsed && (
                                  <ul className="p-3 pt-2 space-y-3 border-t border-slate-600/50">
                                      {groupTracks.map(groupTrack => (
                                          <TrackItem
                                              key={groupTrack.id}
                                              track={groupTrack}
                                              onTrackHoverStart={onTrackHoverStart}
                                              onTrackHoverEnd={onTrackHoverEnd}
                                              visibleTrackIds={visibleTrackIds}
                                              onToggleVisibility={onToggleVisibility}
                                              raceSelectionIds={raceSelectionIds}
                                              onToggleRaceSelection={onToggleRaceSelection}
                                              simulationState={simulationState}
                                              onDeleteTrack={onDeleteTrack}
                                              onViewDetails={onViewDetails}
                                              onStartAnimation={onStartAnimation}
                                          />
                                      ))}
                                  </ul>
                              )}
                          </li>
                      );
                  }
                  
                  // Standalone track
                  if (track.groupId && sortOrder === 'group') {
                      // This is a track that belongs to a group, but the group header
                      // has not been rendered yet because we're iterating through a non-group-sorted list.
                      // We must not render it here to avoid duplication.
                      return null;
                  }

                  return (
                      <TrackItem
                          key={track.id}
                          track={track}
                          onTrackHoverStart={onTrackHoverStart}
                          onTrackHoverEnd={onTrackHoverEnd}
                          visibleTrackIds={visibleTrackIds}
                          onToggleVisibility={onToggleVisibility}
                          raceSelectionIds={raceSelectionIds}
                          onToggleRaceSelection={onToggleRaceSelection}
                          simulationState={simulationState}
                          onDeleteTrack={onDeleteTrack}
                          onViewDetails={onViewDetails}
                          onStartAnimation={onStartAnimation}
                      />
                  );
              }
          })}
          </ul>
      </div>
    </div>
  );
};

export default Sidebar;
