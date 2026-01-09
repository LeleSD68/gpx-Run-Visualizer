
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Track, ActivityType } from '../types';
import TrackPreview from './TrackPreview';
import RaceLeaderboard from './RacePaceBar';
import Tooltip from './Tooltip';

interface SidebarProps {
  tracks: Track[];
  onFileUpload: (files: File[] | null) => void;
  visibleTrackIds: Set<string>;
  onToggleVisibility: (trackId: string) => void;
  raceSelectionIds: Set<string>;
  onToggleRaceSelection: (trackId: string) => void;
  onDeselectAll: () => void;
  onSelectAll: () => void;
  onStartRace: () => void;
  onGoToEditor: () => void;
  onStartVeo: () => void; 
  onPauseRace: () => void;
  onResumeRace: () => void;
  onResetRace: () => void;
  simulationState: 'idle' | 'running' | 'paused' | 'finished';
  simulationTime: number;
  onTrackHoverStart: (trackId: string) => void;
  onTrackHoverEnd: () => void;
  hoveredTrackId: string | null;
  raceProgress: Map<string, number>;
  simulationSpeed: number;
  onSpeedChange: (speed: number) => void;
  lapTimes: Map<string, number[]>;
  sortOrder: string;
  onSortChange: (order: string) => void;
  onDeleteTrack: (trackId: string) => void;
  onDeleteSelected: () => void;
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
  onOpenGuide: () => void;
  onOpenCalendar: () => void; 
  tokenCount: number;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onCloseMobile?: () => void;
  onUpdateTrackMetadata?: (id: string, metadata: Partial<Track>) => void;
  onShowGroup?: (trackIds: string[]) => void;
  onRegenerateTitles: () => void;
  onToggleExplorer: () => void;
  showExplorer: boolean;
  listViewMode: 'full' | 'compact' | 'minimal';
  onListViewModeChange: (mode: 'full' | 'compact' | 'minimal') => void;
  onToggleSidebarMobile?: () => void;
}

// Icons
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M8.75 3A2.75 2.75 0 0 0 6 5.75v.5h8v-.5A2.75 2.75 0 0 0 11.25 3h-2.5ZM5 7.25v.75h10v-.75H5ZM6.25 9.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Zm3.75.75a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0v-4.5ZM13 10.25a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0v-4.5Z" clipRule="evenodd" />
        <path d="M3 18.25V19a.75.75 0 0 0 .75.75h12.5a.75.75 0 0 0 .75-.75v-.75H3Z" />
    </svg>
);
const StarIcon = ({ filled }: { filled?: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} className={`w-4 h-4 ${filled ? 'text-yellow-400' : 'text-slate-300'}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" />
    </svg>
);
const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
    </svg>
);
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1a1.23 1.23 0 0 0 .41-1.412A9.957 9.957 0 0 0 10 13a9.957 9.957 0 0 0-6.535 1.493Z" />
    </svg>
);
const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
    </svg>
);
const GuideIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.94 6.94a.75.75 0 1 1 1.06 1.06L9.125 9H13a.75.75 0 0 1 0 1.5H9.125l.875.875a.75.75 0 1 1-1.06 1.06l-2.25-2.25a.75.75 0 0 1 0-1.06l2.25-2.25Z" clipRule="evenodd" />
    </svg>
);
const UploadCloudIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-cyan-400">
        <path fillRule="evenodd" d="M10.5 3.75a6 6 0 0 0-5.98 6.496A5.25 5.25 0 0 0 6.75 20.25H18a4.5 4.5 0 0 0 1.106-8.865 6.75 6.75 0 0 0-8.606-7.635ZM12 7.5a.75.75 0 0 1 .75.75v4.59l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72V8.25A.75.75 0 0 1 12 7.5Z" clipRule="evenodd" />
    </svg>
);
const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.333-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
    </svg>
);
const MergeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M10.375 2.25a.75.75 0 0 0-1.25 0l-3 4.5a.75.75 0 1 0 1.25.833L9.125 5.03v7.22l-1.75 2.625a.75.75 0 1 0 1.25.833l2-3a.75.75 0 0 0 0-.833l-2-3v-7.22l1.75 2.625a.75.75 0 1 0 1.25-.833l-1.25-1.875ZM6 10a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 6 10ZM8 0a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h2.5A.75.75 0 0 1 14 10Z" />
    </svg>
);
const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="m2.695 14.763-1.262 3.154a.5.5 0 0 0 .65.65l3.154-1.262a.5.5 0 0 0 .173-.11l9.493-9.493a.5.5 0 0 0 0-.707L12.05 4.15a.5.5 0 0 0-.707 0l-8.538 8.538a.5.5 0 0 0-.11.173Zm12.114-11.47 1.341 1.34a1.5 1.5 0 0 1 0 2.122l-1.06 1.06a.5.5 0 0 1-.708 0l-1.697-1.697a.5.5 0 0 1 0-.707l1.06-1.06a1.5 1.5 0 0 1 2.122 0Z" />
    </svg>
);
const ReplayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13l-1.5 1.5 3.5 3.5-3.5 3.5 1.5 1.5 5-5-5-5z" />
    </svg>
);
const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M5.75 3a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-1.5 0V3.75A.75.75 0 0 1 5.75 3ZM14.25 3a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-1.5 0V3.75A.75.75 0 0 1 14.25 3Z" />
    </svg>
);
const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M5.25 3A2.25 2.25 0 0 0 3 5.25v9.5A2.25 2.25 0 0 0 5.25 17h9.5A2.25 2.25 0 0 0 17 14.75v-9.5A2.25 2.25 0 0 0 14.75 3h-9.5Z" />
    </svg>
);

const LayoutIcons = {
    full: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M2 4.25A2.25 2.25 0 0 1 4.25 2h11.5A2.25 2.25 0 0 1 18 4.25v11.5A2.25 2.25 0 0 1 15.75 18H4.25A2.25 2.25 0 0 1 2 15.75V4.25Z" /></svg>,
    compact: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 15.25ZM2 10a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /></svg>,
    minimal: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Z" /></svg>
};

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
        <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
);

const TrackItem: React.FC<any> = ({ 
    track, onTrackHoverStart, onTrackHoverEnd, raceSelectionIds, onToggleRaceSelection, 
    simulationState, onDeleteTrack, onViewDetails, onUpdateTrackMetadata, isHovered, viewMode = 'full'
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(track.name);
    const itemRef = useRef<HTMLLIElement>(null);

    useEffect(() => {
        if (isHovered && itemRef.current) {
            itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [isHovered]);

    const handleNameSubmit = () => {
        onUpdateTrackMetadata?.(track.id, { name: tempName });
        setIsEditing(false);
    };

    if (viewMode === 'minimal') {
        return (
            <li
                ref={itemRef}
                className={`group px-3 py-1.5 rounded flex items-center justify-between transition-all border ${isHovered ? 'bg-cyan-500/30 border-cyan-500/50' : 'bg-slate-700/40 hover:bg-slate-700 border-transparent'}`}
                onMouseEnter={() => onTrackHoverStart(track.id)}
                onMouseLeave={onTrackHoverEnd}
            >
                <div className="flex items-center gap-2 flex-grow min-w-0">
                    <input 
                      type="checkbox" 
                      checked={raceSelectionIds.has(track.id)} 
                      onChange={() => onToggleRaceSelection(track.id)} 
                      className="w-4 h-4 text-cyan-500 bg-slate-600 border-slate-500 rounded focus:ring-offset-0 focus:ring-0" 
                      disabled={simulationState === 'running' || simulationState === 'paused'}
                    />
                    <span 
                        className={`text-xs truncate cursor-pointer font-medium ${isHovered ? 'text-cyan-200 font-bold' : 'text-slate-100'}`}
                        onClick={() => onViewDetails(track.id)}
                    >
                        {track.name}
                    </span>
                    <span className="text-[10px] text-slate-300 font-bold shrink-0 opacity-80">{track.distance.toFixed(1)}k</span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] text-slate-300 font-bold font-mono">{new Date(track.points[0].time).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}</span>
                    <button onClick={() => onDeleteTrack(track.id)} className="text-slate-300 hover:text-red-400"><TrashIcon /></button>
                </div>
            </li>
        );
    }

    if (viewMode === 'compact') {
        return (
            <li
                ref={itemRef}
                className={`group p-2 rounded flex items-center gap-3 transition-all border ${isHovered ? 'bg-cyan-500/30 border-cyan-500/50' : 'bg-slate-700/50 hover:bg-slate-700 border-transparent'}`}
                onMouseEnter={() => onTrackHoverStart(track.id)}
                onMouseLeave={onTrackHoverEnd}
            >
                <div className="cursor-pointer shrink-0" onClick={() => onViewDetails(track.id)}>
                    <TrackPreview points={track.points} color={track.color} className="w-12 h-9 bg-slate-800 rounded border border-slate-600 shadow-md" />
                </div>
                <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold truncate cursor-pointer ${isHovered ? 'text-cyan-300' : 'text-white'}`} onClick={() => onViewDetails(track.id)}>{track.name}</span>
                        <input 
                          type="checkbox" 
                          checked={raceSelectionIds.has(track.id)} 
                          onChange={() => onToggleRaceSelection(track.id)} 
                          className="w-4 h-4 text-cyan-500 bg-slate-600 border-slate-500 rounded"
                          disabled={simulationState === 'running' || simulationState === 'paused'}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-300 mt-0.5 font-semibold">
                        <span className="text-cyan-400 font-bold">{track.distance.toFixed(1)} km</span>
                        <span className="opacity-60">• {new Date(track.points[0].time).toLocaleDateString()}</span>
                    </div>
                </div>
            </li>
        );
    }

    return (
        <li
            ref={itemRef}
            className={`group p-3 rounded-lg flex flex-col space-y-2 transition-all duration-300 border ${isHovered ? 'bg-cyan-500/30 border-cyan-400 shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)]' : 'bg-slate-700 border-transparent hover:border-slate-500/70 shadow-sm'}`}
            onMouseEnter={() => onTrackHoverStart(track.id)}
            onMouseLeave={onTrackHoverEnd}
        >
            <div className="flex items-start space-x-3">
                <div className="cursor-pointer shrink-0" onClick={() => onViewDetails(track.id)}>
                    <TrackPreview points={track.points} color={track.color} className="w-16 h-12 bg-slate-900 rounded border border-slate-600 shadow-lg" />
                </div>
                <div className="flex-grow overflow-hidden flex flex-col min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        {isEditing ? (
                            <input autoFocus className="bg-slate-800 text-sm border border-cyan-500 rounded px-1 w-full outline-none text-white" value={tempName} onChange={e => setTempName(e.target.value)} onBlur={handleNameSubmit} onKeyDown={e => e.key === 'Enter' && handleNameSubmit()} />
                        ) : (
                            <span className={`font-bold truncate text-base cursor-pointer ${isHovered ? 'text-cyan-200' : 'text-white'}`} onClick={() => onViewDetails(track.id)} onDoubleClick={() => setIsEditing(true)}>{track.name}</span>
                        )}
                        <div className="flex items-center space-x-1 shrink-0">
                            <button onClick={() => onUpdateTrackMetadata?.(track.id, { isFavorite: !track.isFavorite })} className="p-1 hover:bg-slate-500 rounded transition-all"><StarIcon filled={track.isFavorite} /></button>
                            <input type="checkbox" checked={raceSelectionIds.has(track.id)} onChange={() => onToggleRaceSelection(track.id)} className="w-5 h-5 text-cyan-500 bg-slate-600 border-slate-500 rounded" disabled={simulationState === 'running' || simulationState === 'paused'} />
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-cyan-400 uppercase font-extrabold tracking-wider border border-cyan-900/50">{track.activityType || 'Altro'}</span>
                        <span className="text-xs text-slate-100 font-bold">{track.distance.toFixed(1)} km</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium border-t border-slate-600/50 pt-2">
                <span className="truncate max-w-[120px]">{track.folder || 'Generale'}</span>
                <div className="flex items-center gap-2">
                    <span className="font-mono">{new Date(track.points[0].time).toLocaleDateString()}</span>
                    <button onClick={() => onDeleteTrack(track.id)} className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"><TrashIcon /></button>
                </div>
            </div>
        </li>
    );
};

type GroupingMode = 'none' | 'folder' | 'distance' | 'date' | 'activity';

const Sidebar: React.FC<SidebarProps> = (props) => {
  const {
    tracks, onFileUpload, visibleTrackIds, onToggleVisibility,
    raceSelectionIds, onToggleRaceSelection, onStartRace, onGoToEditor, onStartVeo, onPauseRace, onResumeRace, onResetRace, simulationState,
    onTrackHoverStart, onTrackHoverEnd, hoveredTrackId, sortOrder, onDeleteTrack, onViewDetails,
    onOpenChangelog, onOpenProfile, onOpenGuide, onOpenCalendar, simulationSpeed, raceRanks, runnerGapsToLeader,
    collapsedGroups, onToggleGroup, 
    onExportBackup, onImportBackup, onCloseMobile, onUpdateTrackMetadata,
    onToggleExplorer, showExplorer,
    listViewMode, onListViewModeChange, onSpeedChange
  } = props;

  const [groupingMode, setGroupingMode] = useState<GroupingMode>('activity');
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const [isToolsExpanded, setIsToolsExpanded] = useState(true);
  const [isUploadExpanded, setIsUploadExpanded] = useState(false);
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(true);
  
  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const tracksToDisplay = useMemo(() => {
    let result = (simulationState === 'running' || simulationState === 'paused') ? tracks.filter(t => raceSelectionIds.has(t.id)) : [...tracks];
    if (sortOrder === 'date') result.sort((a, b) => b.points[0].time.getTime() - a.points[0].time.getTime());
    else if (sortOrder === 'distance') result.sort((a, b) => b.distance - a.distance);
    else if (sortOrder === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [tracks, sortOrder, simulationState, raceSelectionIds]);

  const groupedByFolder = useMemo(() => {
    const groups: Record<string, Track[]> = {};
    if (groupingMode === 'none') { groups['Tutte le attività'] = tracksToDisplay; return groups; }
    tracksToDisplay.forEach(t => {
        let groupName = 'Altro';
        if (groupingMode === 'folder') groupName = t.folder || 'Senza Cartella';
        else if (groupingMode === 'distance') {
             const d = t.distance;
             if (d < 5) groupName = '< 5 km';
             else if (d < 10) groupName = '5 - 10 km';
             else if (d < 15) groupName = '10 - 15 km';
             else if (d <= 22) groupName = '15 - 22 km';
             else groupName = '> 22 km';
        } else if (groupingMode === 'date') groupName = t.points[0].time.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
        else if (groupingMode === 'activity') groupName = t.activityType || 'Altro';
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(t);
    });
    return groups;
  }, [tracksToDisplay, groupingMode]);

  const toggleFolder = (folderName: string) => {
    setCollapsedFolders(prev => { const next = new Set(prev); if (next.has(folderName)) next.delete(folderName); else next.add(folderName); return next; });
  };

  const isSimulationInProgress = simulationState === 'running' || simulationState === 'paused';

  return (
    <div className="bg-slate-800 text-white flex flex-col h-full w-full overflow-hidden relative">
      {onCloseMobile && (
          <button onClick={onCloseMobile} className="sm:hidden absolute top-4 left-4 z-[2010] p-2 text-slate-300 hover:text-white bg-slate-700 rounded-full shadow-lg border border-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
      )}

      {/* RE-DESIGNED WRAPPING CONTAINER FOR TILES */}
      <div className="p-3 flex flex-wrap gap-2 flex-shrink-0 transition-all duration-500 overflow-y-auto no-scrollbar max-h-[50%]">
          
          {/* HEADER WIDGET */}
          <div className={`bg-slate-900/60 rounded-lg border border-slate-700 shadow-inner overflow-hidden transition-all duration-300 ${isHeaderExpanded ? 'w-full' : 'flex-1 min-w-[140px]'}`}>
              <button onClick={() => setIsHeaderExpanded(!isHeaderExpanded)} className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <h1 className={`font-black text-cyan-400 tracking-tighter transition-all ${isHeaderExpanded ? 'text-2xl' : 'text-xs'}`}>GPX Viz</h1>
                    {!isHeaderExpanded && <span className="text-[9px] text-white font-black uppercase tracking-widest bg-cyan-900/50 px-1 rounded">v1.17</span>}
                  </div>
                  <ChevronIcon isOpen={isHeaderExpanded} />
              </button>
              {isHeaderExpanded && (
                  <div className="px-4 pb-4 animate-fade-in-down">
                    <div className="flex items-center justify-center space-x-6 mb-4 pb-3 border-b border-slate-700/80">
                        <Tooltip text="Profilo" subtext="Dati fisici." position="bottom"><button onClick={onOpenProfile} className="text-slate-300 hover:text-cyan-400 hover:bg-slate-700 p-2 rounded-md transition-all active:scale-95"><UserIcon /></button></Tooltip>
                        <Tooltip text="Novità" subtext="Changelog." position="bottom"><button onClick={onOpenChangelog} className="text-slate-300 hover:text-cyan-400 hover:bg-slate-700 p-2 rounded-md transition-all active:scale-95"><HistoryIcon /></button></Tooltip>
                        <Tooltip text="Guida" subtext="Tutorial." position="bottom"><button onClick={onOpenGuide} className="text-slate-300 hover:text-cyan-400 hover:bg-slate-700 p-2 rounded-md transition-all active:scale-95"><GuideIcon /></button></Tooltip>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={onExportBackup} className="text-[10px] bg-slate-700 hover:bg-slate-600 p-2 rounded text-slate-100 font-black uppercase tracking-wider transition-all border border-slate-600 flex items-center justify-center gap-1 shadow-sm">Backup</button>
                        <button onClick={() => backupInputRef.current?.click()} className="text-[10px] bg-slate-700 hover:bg-slate-600 p-2 rounded text-slate-100 font-black uppercase tracking-wider transition-all border border-slate-600 flex items-center justify-center gap-1 shadow-sm">Restore</button>
                        <input type="file" ref={backupInputRef} className="hidden" accept=".json" onChange={e => e.target.files && onImportBackup(e.target.files[0])} />
                    </div>
                  </div>
              )}
          </div>

          {/* UPLOAD WIDGET */}
          {!isSimulationInProgress && (
              <div className={`bg-slate-900/40 rounded-lg border border-slate-700 overflow-hidden transition-all duration-300 ${isUploadExpanded ? 'w-full' : 'flex-1 min-w-[140px]'}`}>
                  <button onClick={() => setIsUploadExpanded(!isUploadExpanded)} className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-2 text-slate-100 font-black"><UploadCloudIcon /><span className={`uppercase tracking-widest transition-all ${isUploadExpanded ? 'text-[11px]' : 'text-[9px]'}`}>Carica</span></div>
                      <ChevronIcon isOpen={isUploadExpanded} />
                  </button>
                  {isUploadExpanded && (
                      <div className="p-3 pt-0 animate-fade-in-down">
                          <label className="block w-full border-2 border-dashed border-slate-600 hover:border-cyan-400 bg-slate-800/50 rounded-lg p-6 text-center cursor-pointer transition-all duration-200">
                              <span className="block text-xs font-black text-slate-100 uppercase tracking-tighter">Trascina GPX/TCX</span>
                              <input type="file" multiple ref={mainFileInputRef} accept=".gpx, .tcx" onChange={(e) => e.target.files && onFileUpload(Array.from(e.target.files))} className="sr-only" />
                          </label>
                      </div>
                  )}
              </div>
          )}

          {/* TOOLS WIDGET */}
          <div className={`bg-slate-900/40 rounded-lg border border-slate-700 overflow-hidden transition-all duration-300 ${isToolsExpanded ? 'w-full' : 'flex-1 min-w-[140px]'}`}>
              <button onClick={() => setIsToolsExpanded(!isToolsExpanded)} className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-2 text-slate-100 font-black"><PlayIcon /><span className={`uppercase tracking-widest transition-all ${isToolsExpanded ? 'text-[11px]' : 'text-[9px]'}`}>{!isSimulationInProgress ? 'Strumenti' : 'Gara'}</span></div>
                  <ChevronIcon isOpen={isToolsExpanded} />
              </button>
              {isToolsExpanded && (
                  <div className="p-3 pt-0 animate-fade-in-down">
                      {!isSimulationInProgress ? (
                          <div className="grid grid-cols-4 gap-2">
                              <Tooltip text="Gara" position="top"><button onClick={() => onStartRace()} className={`w-full flex flex-col items-center justify-center text-[10px] font-black py-2 rounded-md transition-all active:scale-95 shadow-md ${raceSelectionIds.size >= 2 ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-slate-700 text-slate-400 border border-slate-600 opacity-50'}`}><PlayIcon /> <span>Gara</span></button></Tooltip>
                              <Tooltip text="Unisci" position="top"><button onClick={() => onGoToEditor()} className={`w-full flex flex-col items-center justify-center text-[10px] font-black py-2 rounded-md transition-all active:scale-95 shadow-md ${raceSelectionIds.size >= 2 ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400 border border-slate-600 opacity-50'}`}><MergeIcon /> <span>Unisci</span></button></Tooltip>
                              <Tooltip text="Edit" position="top"><button onClick={() => onGoToEditor()} className={`w-full flex flex-col items-center justify-center text-[10px] font-black py-2 rounded-md transition-all active:scale-95 shadow-md ${raceSelectionIds.size === 1 ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'bg-slate-700 text-slate-400 border border-slate-600 opacity-50'}`}><EditIcon /> <span>Edit</span></button></Tooltip>
                              <Tooltip text="Replay" position="top"><button onClick={() => onStartVeo()} className={`w-full flex flex-col items-center justify-center text-[10px] font-black py-2 rounded-md transition-all active:scale-95 shadow-md ${raceSelectionIds.size === 1 ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-slate-700 text-slate-400 border border-slate-600 opacity-50'}`}><ReplayIcon /> <span>Replay</span></button></Tooltip>
                          </div>
                      ) : (
                          <div className="space-y-3">
                              <div className="flex space-x-2">
                                  {simulationState === 'running' ? (<button onClick={onPauseRace} className="flex-1 flex items-center justify-center bg-amber-600 hover:bg-amber-500 p-2 rounded font-black text-xs text-white shadow-lg transition-all"><PauseIcon /><span className="ml-1 text-[10px]">Pausa</span></button>) : (<button onClick={onResumeRace} className="flex-1 flex items-center justify-center bg-green-600 hover:bg-green-500 p-2 rounded font-black text-xs text-white shadow-lg transition-all"><PlayIcon /><span className="ml-1 text-[10px]">Vai</span></button>)}
                                  <button onClick={onResetRace} className="flex-1 flex items-center justify-center bg-red-600 hover:bg-red-500 p-2 rounded font-black text-xs text-white shadow-lg transition-all"><StopIcon /><span className="ml-1 text-[10px]">Stop</span></button>
                              </div>
                              <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                                  <div className="flex justify-between items-center mb-1"><span className="text-[8px] font-black uppercase text-slate-400">Velocità</span><span className="text-[10px] font-mono font-bold text-cyan-400">{simulationSpeed}x</span></div>
                                  <input type="range" min="1" max="200" step="1" value={simulationSpeed} onChange={(e) => onSpeedChange(parseInt(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>

          {/* ARCHIVE WIDGET TOGGLE */}
          {!isSimulationInProgress && (
              <div className={`bg-slate-900/40 rounded-lg border border-slate-700 overflow-hidden transition-all duration-300 ${isArchiveExpanded ? 'w-full' : 'flex-1 min-w-[140px]'}`}>
                  <button onClick={() => setIsArchiveExpanded(!isArchiveExpanded)} className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-2 text-slate-100 font-black">
                          <LayoutIcons.full />
                          <span className={`uppercase tracking-widest transition-all ${isArchiveExpanded ? 'text-[11px]' : 'text-[9px]'}`}>Archivio</span>
                          {!isArchiveExpanded && <span className="text-[9px] bg-slate-800 px-1.5 rounded">{tracks.length}</span>}
                      </div>
                      <ChevronIcon isOpen={isArchiveExpanded} />
                  </button>
              </div>
          )}
      </div>

      {/* SCROLLABLE ARCHIVE LIST AREA */}
      <div className={`flex-grow px-4 flex flex-col min-h-0 pb-6 transition-opacity duration-300 ${!isArchiveExpanded && !isSimulationInProgress ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {!isSimulationInProgress ? (
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Attività ({tracks.length})</h2>
                        <div className="flex items-center bg-slate-900/60 p-0.5 rounded border border-slate-700">
                            {(['full', 'compact', 'minimal'] as const).map(mode => (
                                <button key={mode} onClick={() => onListViewModeChange(mode)} className={`p-1 rounded transition-all ${listViewMode === mode ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-100'}`}>
                                    {LayoutIcons[mode]()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                         <select value={groupingMode} onChange={e => setGroupingMode(e.target.value as GroupingMode)} className="flex-grow bg-slate-900 border border-slate-700 text-white text-[11px] font-bold rounded px-2 py-1.5 outline-none cursor-pointer focus:border-cyan-500"><option value="none">Vista Piatta</option><option value="activity">Tipo Allenamento</option><option value="folder">Cartelle Personali</option><option value="distance">Range Distanza</option><option value="date">Data (Mese/Anno)</option></select>
                         <div className="flex items-center gap-1 shrink-0">
                            <button onClick={onOpenCalendar} className="p-1.5 text-slate-100 hover:text-white bg-slate-700 border border-slate-600 rounded transition-all shadow-sm" title="Calendario"><CalendarIcon /></button>
                            <button onClick={onToggleExplorer} className={`p-1.5 rounded border transition-all shadow-sm ${showExplorer ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-slate-700 text-slate-100 border-slate-600 hover:text-white'}`} title="Esplora in griglia">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5ZM4.25 11A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5ZM11 4.25A2.25 2.25 0 0 1 13.25 2h2.5A2.25 2.25 0 0 1 18 4.25v2.5A2.25 2.25 0 0 1 15.75 9h-2.5A2.25 2.25 0 0 1 11 6.75v-2.5ZM13.25 11A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" /></svg>
                            </button>
                         </div>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto custom-scrollbar pr-1">
                        {groupingMode !== 'none' ? (
                            (Object.entries(groupedByFolder) as [string, Track[]][]).map(([folderName, folderTracks]) => {
                                const isCollapsed = collapsedFolders.has(folderName);
                                return (
                                    <div key={folderName} className="mb-3">
                                        <div className="flex items-center justify-between group/folder hover:bg-slate-700/50 rounded px-1 transition-colors sticky top-0 bg-slate-800 z-10 py-1 border-b border-slate-700">
                                            <button onClick={() => toggleFolder(folderName)} className="flex items-center text-left py-1 rounded transition-colors flex-grow"><span className={`transition-transform duration-200 mr-1.5 ${isCollapsed ? '-rotate-90' : ''}`}><ChevronIcon isOpen={true} /></span><span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest truncate">{folderName}</span><span className="ml-2 text-[10px] font-black text-white bg-cyan-900/80 rounded-full px-2 border border-cyan-700/50">{folderTracks.length}</span></button>
                                        </div>
                                        {!isCollapsed && (<ul className={`mt-2 ${listViewMode === 'minimal' ? 'space-y-1' : 'space-y-2'}`}>{folderTracks.map(track => (<TrackItem key={track.id} track={track} onTrackHoverStart={onTrackHoverStart} onTrackHoverEnd={onTrackHoverEnd} raceSelectionIds={raceSelectionIds} onToggleRaceSelection={onToggleRaceSelection} simulationState={simulationState} onDeleteTrack={onDeleteTrack} onViewDetails={onViewDetails} onUpdateTrackMetadata={onUpdateTrackMetadata} isHovered={hoveredTrackId === track.id} viewMode={listViewMode} />))}</ul>)}
                                    </div>
                                );
                            })
                        ) : (<ul className={`${listViewMode === 'minimal' ? 'space-y-1' : 'space-y-2'}`}>{tracksToDisplay.map(track => (<TrackItem key={track.id} track={track} onTrackHoverStart={onTrackHoverStart} onTrackHoverEnd={onTrackHoverEnd} raceSelectionIds={raceSelectionIds} onToggleRaceSelection={onToggleRaceSelection} simulationState={simulationState} onDeleteTrack={onDeleteTrack} onViewDetails={onViewDetails} onUpdateTrackMetadata={onUpdateTrackMetadata} isHovered={hoveredTrackId === track.id} viewMode={listViewMode} />))}</ul>)}
                    </div>
                </div>
            ) : (<RaceLeaderboard racers={tracksToDisplay} ranks={raceRanks} gaps={runnerGapsToLeader} />)}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes fade-in-down { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default Sidebar;
