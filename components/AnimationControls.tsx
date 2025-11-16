

import React from 'react';

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


interface AnimationControlsProps {
    isPlaying: boolean;
    onTogglePlay: () => void;
    progress: number; // in km
    totalDistance: number; // in km
    onProgressChange: (newProgress: number) => void;
    speed: number;
    onSpeedChange: (newSpeed: number) => void;
    onExit: () => void;
}

const AnimationControls: React.FC<AnimationControlsProps> = ({
    isPlaying,
    onTogglePlay,
    progress,
    totalDistance,
    onProgressChange,
    speed,
    onSpeedChange,
    onExit
}) => {
    return (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-800/80 backdrop-blur-sm p-4 rounded-lg shadow-2xl flex items-center space-x-4 z-[1000]">
            <button onClick={onTogglePlay} className="text-white hover:text-cyan-400">
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
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-mono text-slate-300 w-24 text-right">{progress.toFixed(2)} / {totalDistance.toFixed(2)} km</span>
            </div>
            <div className="flex items-center space-x-2 w-48">
                <span className="text-sm text-slate-400">Velocità</span>
                <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={speed}
                    onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                />
                 <span className="text-sm font-mono text-slate-300 w-10 text-right">{speed.toFixed(1)}x</span>
            </div>
             <button onClick={onExit} className="text-white hover:text-red-500" title="Esci dall'animazione">
                <CloseIcon />
            </button>
        </div>
    );
};

export default AnimationControls;