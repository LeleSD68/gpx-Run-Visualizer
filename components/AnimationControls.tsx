
import React, { useState } from 'react';

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
    </svg>
);

const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
);

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clipRule="evenodd" />
    </svg>
);

interface AnimationControlsProps {
    isPlaying: boolean;
    onTogglePlay: () => void;
    progress: number; // in km
    totalDistance: number; // in km
    onProgressChange: (newProgress: number) => void;
    speed: number;
    onSpeedChange: (newSpeed: number) => void;
    onExit: () => void;
    visibleMetrics: Set<string>;
    onToggleMetric: (metric: string) => void;
}

const AnimationControls: React.FC<AnimationControlsProps> = ({
    isPlaying,
    onTogglePlay,
    progress,
    totalDistance,
    onProgressChange,
    speed,
    onSpeedChange,
    onExit,
    visibleMetrics,
    onToggleMetric
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const metricsList = [
        { id: 'time', label: 'Tempo' },
        { id: 'pace', label: 'Ritmo' },
        { id: 'elevation', label: 'Elevazione' },
        { id: 'hr', label: 'Freq. Cardiaca' },
    ];

    return (
        <div className="absolute bottom-0 left-0 right-0 rounded-t-xl pb-6 sm:pb-4 sm:bottom-4 sm:left-4 sm:right-4 bg-slate-800/95 sm:bg-slate-800/80 backdrop-blur-sm p-4 sm:rounded-lg shadow-2xl flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 z-[1000] border-t sm:border-t-0 border-slate-700">
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4 flex-grow">
                <button onClick={onTogglePlay} className="text-white hover:text-cyan-400 shrink-0">
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
                <div className="flex-grow flex items-center space-x-3">
                    <input
                        type="range"
                        min="0"
                        max={totalDistance}
                        step="0.01"
                        value={progress}
                        onChange={(e) => onProgressChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <span className="text-sm font-mono text-slate-300 w-24 text-right shrink-0">{progress.toFixed(2)} / {totalDistance.toFixed(2)} km</span>
                </div>
                <button onClick={onExit} className="text-white hover:text-red-500 sm:hidden shrink-0" title="Esci dall'animazione">
                    <CloseIcon />
                </button>
            </div>
            
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end space-x-4">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-400 shrink-0">Velocità</span>
                    <input
                        type="range"
                        min="1"
                        max="500"
                        step="1"
                        value={speed}
                        onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                        className="w-24 sm:w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <span className="text-sm font-mono text-slate-300 w-10 text-right shrink-0">{speed.toFixed(0)}x</span>
                </div>

                <div className="relative">
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)} 
                        className={`p-2 rounded-full transition-colors ${isMenuOpen ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        title="Personalizza metriche visibili"
                    >
                        <EyeIcon />
                    </button>
                    
                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 z-20 animate-fade-in-up">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Metriche Visibili</h4>
                                <div className="space-y-1">
                                    <div className="flex items-center px-2 py-1.5 text-sm text-slate-400 cursor-not-allowed opacity-70">
                                        <div className="w-4 h-4 mr-2 bg-cyan-500 rounded flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                        </div>
                                        Distanza (Fissa)
                                    </div>
                                    {metricsList.map(metric => (
                                        <button
                                            key={metric.id}
                                            onClick={() => onToggleMetric(metric.id)}
                                            className="w-full flex items-center px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-700 rounded transition-colors"
                                        >
                                            <div className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${visibleMetrics.has(metric.id) ? 'bg-cyan-600 border-cyan-600' : 'border-slate-500'}`}>
                                                {visibleMetrics.has(metric.id) && (
                                                    <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                )}
                                            </div>
                                            {metric.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
                
                <button onClick={onExit} className="hidden sm:block text-white hover:text-red-500" title="Esci dall'animazione">
                    <CloseIcon />
                </button>
            </div>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default AnimationControls;
