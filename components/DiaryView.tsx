import React, { useState, useMemo } from 'react';
import { Track, PlannedWorkout, UserProfile } from '../types';
import TrackPreview from './TrackPreview';
import AiTrainingCoachPanel from './AiTrainingCoachPanel';
import FormattedAnalysis from './FormattedAnalysis';
import RatingStars from './RatingStars';

interface DiaryViewProps {
    tracks: Track[];
    plannedWorkouts?: PlannedWorkout[];
    userProfile: UserProfile;
    onClose: () => void;
    onSelectTrack: (trackId: string) => void;
    onDeletePlannedWorkout?: (id: string) => void;
    onAddPlannedWorkout?: (workout: PlannedWorkout) => void;
}

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-purple-400">
        <path d="M8 1.75a.75.75 0 0 1 .75.75V4a.75.75 0 0 1-1.5 0V2.5a.75.75 0 0 1 .75-.75Z M3.25 3.25a.75.75 0 0 1 1.06 0L5.37 4.31a.75.75 0 0 1-1.06 1.06L3.25 4.31a.75.75 0 0 1 0-1.06ZM1.75 8a.75.75 0 0 1 .75-.75H4a.75.75 0 0 1 0 1.5H2.5a.75.75 0 0 1-.75-.75ZM4.31 10.63a.75.75 0 0 1 1.06 1.06L4.31 12.75a.75.75 0 0 1-1.06-1.06l1.06-1.06Z M8 12a.75.75 0 0 1 .75.75v1.75a.75.75 0 0 1-1.5 0V12.75a.75.75 0 0 1 .75-.75ZM10.63 11.69a.75.75 0 0 1 1.06-1.06l1.06 1.06a.75.75 0 0 1-1.06 1.06l-1.06-1.06ZM12 8a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-1.5 0V8.75a.75.75 0 0 1 .75-.75ZM10.69 4.31a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06Z M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
    </svg>
);

const DiaryView: React.FC<DiaryViewProps> = ({ tracks, plannedWorkouts = [], userProfile, onClose, onSelectTrack, onDeletePlannedWorkout, onAddPlannedWorkout }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
    const [showAiCoach, setShowAiCoach] = useState(false);

    const { stats } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const filteredTracks = tracks.filter(t => {
            const tDate = t.points[0].time;
            return tDate.getFullYear() === year && tDate.getMonth() === month;
        });

        const totalDistance = filteredTracks.reduce((sum, t) => sum + t.distance, 0);
        const totalDuration = filteredTracks.reduce((sum, t) => sum + t.duration, 0);

        return { stats: { totalDistance, totalDuration, count: filteredTracks.length } };
    }, [tracks, currentDate]);

    const { calendarGrid, weeksCount } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7; 

        const days = [];
        for (let i = 0; i < startDayIndex; i++) days.push(null);

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dayTracks = tracks.filter(t => {
                const d = t.points[0].time;
                return d.getDate() === i && d.getMonth() === month && d.getFullYear() === year;
            });
            const dayPlanned = plannedWorkouts.filter(w => {
                const d = new Date(w.date);
                return d.getDate() === i && d.getMonth() === month && d.getFullYear() === year;
            });
            days.push({ day: i, tracks: dayTracks, planned: dayPlanned, date });
        }

        const weeksCount = Math.ceil(days.length / 7);
        return { calendarGrid: days, weeksCount };
    }, [currentDate, tracks, plannedWorkouts]);

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
        setCurrentDate(newDate);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    const currentSelectedWorkout = useMemo(() => 
        plannedWorkouts.find(w => w.id === selectedWorkoutId),
    [selectedWorkoutId, plannedWorkouts]);

    return (
        <div className="absolute inset-0 z-[2000] bg-slate-900 flex flex-col font-sans text-white animate-fade-in overflow-hidden">
            <header className="flex items-center justify-between p-2 sm:p-4 bg-slate-800 border-b border-slate-700 shadow-md flex-shrink-0 z-10">
                <div className="flex items-center space-x-2 sm:space-x-6">
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-bold text-sm sm:text-base">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg>
                        <span className="hidden sm:inline">Esci</span>
                    </button>
                    <div className="flex items-center bg-slate-700 rounded-lg p-0.5 sm:p-1">
                        <button onClick={() => changeMonth(-1)} className="p-1 sm:p-2 hover:bg-slate-600 rounded-md transition-colors"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg></button>
                        <h2 className="text-sm sm:text-lg font-bold w-32 sm:w-40 text-center capitalize truncate">
                            {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={() => changeMonth(1)} className="p-1 sm:p-2 hover:bg-slate-600 rounded-md transition-colors"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg></button>
                    </div>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-6">
                    <button 
                        onClick={() => setShowAiCoach(!showAiCoach)}
                        className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs uppercase transition-all shadow-md active:scale-95 ${showAiCoach ? 'bg-cyan-700 border border-cyan-400 text-white' : 'bg-slate-700 hover:bg-slate-600 border border-slate-600 text-cyan-400'}`}
                    >
                        <SparklesIcon />
                        <span className="hidden sm:inline">Suggerimenti AI</span>
                        <span className="sm:hidden">AI</span>
                    </button>

                    <div className="hidden lg:flex space-x-4 text-xs border-l border-slate-700 pl-6">
                        <div className="flex flex-col items-center">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider">Km Mese</span>
                            <span className="font-bold text-cyan-400 text-base">{stats.totalDistance.toFixed(1)}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider">Uscite</span>
                            <span className="font-bold text-white text-base">{stats.count}</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-grow flex flex-col sm:flex-row overflow-hidden">
                <div className="flex-grow flex flex-col overflow-hidden">
                    <div className="grid grid-cols-7 bg-slate-800 border-b border-slate-700 flex-shrink-0">
                        {DAYS_OF_WEEK.map(day => (
                            <div key={day} className="p-1 sm:p-2 text-center text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest truncate">{day}</div>
                        ))}
                    </div>

                    <div className="flex-grow overflow-hidden bg-slate-900 p-1 sm:p-2">
                        <div className="grid grid-cols-7 gap-1 sm:gap-2 h-full w-full" style={{ gridTemplateRows: `repeat(${weeksCount}, minmax(0, 1fr))` }}>
                            {calendarGrid.map((cell, idx) => {
                                if (!cell) return <div key={`empty-${idx}`} className="bg-slate-800/20 rounded-lg"></div>;
                                const isCurrentDay = isToday(cell.date);
                                return (
                                    <div key={cell.day} className={`rounded-lg p-1 sm:p-2 flex flex-col border relative transition-colors overflow-hidden ${isCurrentDay ? 'bg-slate-800/90 border-cyan-500/50 shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]' : 'bg-slate-800 border-slate-700/50 hover:bg-slate-700/50'}`}>
                                        <span className={`text-[10px] sm:text-sm font-bold mb-1 flex items-center justify-between flex-shrink-0 ${isCurrentDay ? 'text-cyan-400' : 'text-slate-400'}`}>
                                            {cell.day}
                                        </span>
                                        
                                        <div className="space-y-1 flex-grow overflow-y-auto no-scrollbar">
                                            {cell.planned.map(workout => (
                                                <div 
                                                    key={workout.id}
                                                    onClick={() => setSelectedWorkoutId(workout.id)}
                                                    className="bg-purple-900/30 border border-dashed border-purple-500/60 rounded p-1 sm:p-1.5 cursor-pointer hover:bg-purple-900/50 transition-all flex flex-col gap-0.5 group animate-pulse-slow"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <SparklesIcon />
                                                        <span className="text-[8px] sm:text-[9px] font-bold text-purple-400 uppercase truncate">AI</span>
                                                    </div>
                                                    <div className="text-[8px] sm:text-[9px] font-medium text-slate-100 truncate leading-tight group-hover:text-white">{workout.title}</div>
                                                </div>
                                            ))}

                                            {cell.tracks.map(track => (
                                                <div key={track.id} onClick={() => onSelectTrack(track.id)} className="group cursor-pointer bg-slate-700 rounded p-1 border border-transparent hover:border-cyan-500/50 hover:bg-slate-600 transition-all flex flex-col gap-0.5 shadow-sm">
                                                    <div className="w-full h-8 sm:h-10 bg-slate-900 rounded overflow-hidden relative flex-shrink-0">
                                                        <TrackPreview points={track.points} color={track.color} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                        <div className="absolute bottom-0 right-0 bg-black/70 px-1 text-[8px] font-mono text-white rounded-tl">{track.distance.toFixed(1)}k</div>
                                                        {track.rating !== undefined && (
                                                            <div className="absolute top-0 right-0 p-0.5 bg-black/50 rounded-bl">
                                                                <RatingStars rating={track.rating} reason={track.ratingReason} size="xs" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {showAiCoach && (
                    <div className="w-full sm:w-80 lg:w-96 bg-slate-800 border-l border-slate-700 flex flex-col animate-fade-in-right overflow-hidden flex-shrink-0 shadow-2xl z-20">
                        <header className="p-4 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
                            <h3 className="font-bold text-cyan-400 uppercase tracking-widest text-sm flex items-center gap-2">
                                <SparklesIcon /> Prossime Sessioni
                            </h3>
                            <button onClick={() => setShowAiCoach(false)} className="text-slate-500 hover:text-white transition-colors">&times;</button>
                        </header>
                        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                            <AiTrainingCoachPanel 
                                userProfile={userProfile} 
                                allHistory={tracks} 
                                onAddPlannedWorkout={onAddPlannedWorkout}
                                isCompact={false}
                            />
                        </div>
                    </div>
                )}
            </div>

            {currentSelectedWorkout && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedWorkoutId(null)}>
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <header className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <SparklesIcon />
                                <h3 className="font-bold text-purple-400 uppercase tracking-widest text-sm">Programma Diario AI</h3>
                            </div>
                            <button onClick={() => setSelectedWorkoutId(null)} className="text-slate-500 hover:text-white text-xl">&times;</button>
                        </header>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="text-xl font-bold text-white mb-1">{currentSelectedWorkout.title}</h4>
                                    <p className="text-xs text-slate-400 font-mono uppercase">
                                        {new Date(currentSelectedWorkout.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </p>
                                </div>
                                <span className="bg-purple-600/20 text-purple-400 border border-purple-500/30 px-3 py-1 rounded text-[10px] font-bold uppercase">{currentSelectedWorkout.activityType}</span>
                            </div>
                            
                            <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-600/50 mb-6">
                                <div className="text-sm text-slate-200 leading-relaxed italic prose prose-invert prose-sm">
                                    <FormattedAnalysis text={currentSelectedWorkout.description} />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => {
                                        onDeletePlannedWorkout?.(currentSelectedWorkout.id);
                                        setSelectedWorkoutId(null);
                                    }}
                                    className="flex-1 py-3 bg-red-900/20 text-red-400 border border-red-900/30 rounded-lg hover:bg-red-900/40 transition-colors font-bold text-sm"
                                >
                                    Rimuovi
                                </button>
                                <button onClick={() => setSelectedWorkoutId(null)} className="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-bold text-sm">
                                    Chiudi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(0.98); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 3s infinite ease-in-out;
                }
                @keyframes fade-in-right { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
                .animate-fade-in-right { animation: fade-in-right 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default DiaryView;