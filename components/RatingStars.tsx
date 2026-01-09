import React, { useState, useRef, useEffect } from 'react';

interface RatingStarsProps {
    rating?: number;
    reason?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    onDetailClick?: (e: React.MouseEvent) => void;
}

const RatingStars: React.FC<RatingStarsProps> = ({ rating, reason, size = 'sm', onDetailClick }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);

    if (rating === undefined) return null;

    const starSizes = {
        xs: 'w-2 h-2',
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-6 h-6'
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                setShowTooltip(false);
            }
        };
        if (showTooltip) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showTooltip]);

    const displayReason = reason && reason.trim() !== "" 
        ? reason 
        : "Valutazione basata sulle tue performance atletiche globali.";

    const handleContainerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDetailClick) {
            onDetailClick(e);
        } else {
            setShowTooltip(!showTooltip);
        }
    };

    return (
        <div 
            className="relative flex items-center gap-0.5 group py-1 select-none cursor-pointer"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={handleContainerClick}
            title="Clicca per il report AI dettagliato"
        >
            {[1, 2, 3, 4, 5].map(star => (
                <svg 
                    key={star} 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill={star <= Math.round(rating) ? "#fbbf24" : "#334155"} 
                    className={`${starSizes[size]} drop-shadow-sm transition-transform group-hover:scale-125 pointer-events-none`}
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" />
                </svg>
            ))}

            {showTooltip && (
                <div 
                    ref={tooltipRef}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 sm:w-72 bg-slate-900 border border-cyan-500/50 p-3.5 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] z-[9999] animate-pop-in pointer-events-none"
                >
                    <div className="flex items-center gap-2 mb-2 border-b border-slate-700 pb-1.5">
                        <span className="text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em]">Coach AI</span>
                        <div className="flex items-center gap-0.5 ml-auto">
                            {[1, 2, 3, 4, 5].map(s => (
                                <div key={s} className={`w-1.5 h-1.5 rounded-full ${s <= Math.round(rating) ? 'bg-amber-400' : 'bg-slate-700'}`}></div>
                            ))}
                        </div>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-100 font-bold italic mb-2">
                        "{displayReason}"
                    </p>
                    <p className="text-[9px] text-cyan-500 uppercase font-black tracking-widest animate-pulse">
                        Clicca per l'analisi profonda &rarr;
                    </p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-slate-900"></div>
                </div>
            )}
            <style>{`
                @keyframes pop-in {
                    from { opacity: 0; transform: translate(-50%, 10px) scale(0.95); }
                    to { opacity: 1; transform: translate(-50%, 0) scale(1); }
                }
                .animate-pop-in { 
                    animation: pop-in 0.2s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; 
                }
            `}</style>
        </div>
    );
};

export default RatingStars;