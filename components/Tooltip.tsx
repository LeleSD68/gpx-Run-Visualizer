
import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  subtext?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({ 
  children, 
  text, 
  subtext, 
  position = 'top', 
  delay = 3000 // 3 secondi di sosta richiesti per attivazione via mouse
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const autoCloseTimerRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    // Avvia il timer quando il mouse entra nell'area
    timerRef.current = window.setTimeout(() => {
      showTooltip();
    }, delay);
  };

  const showTooltip = () => {
    setIsVisible(true);
    // Auto-chiusura dopo 2 secondi (richiesto per mobile/interazione rapida)
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, 2000);
  };

  const handleMouseLeave = () => {
    // Annulla tutto se il mouse esce prima dello scadere del tempo
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
  };

  const handleClick = () => {
    // Su mobile spesso si usa il click per i tooltip
    showTooltip();
  };

  // Pulizia dei timer allo smontaggio del componente
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative flex items-center justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      
      {/* 
        Utilizziamo pointer-events-none per garantire che il tooltip 
        non interferisca MAI con i click sugli elementi sottostanti.
      */}
      <div 
        className={`absolute ${positionClasses[position]} z-[9000] pointer-events-none transition-all duration-300 ease-out
          ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-95 invisible'}`}
      >
        <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 p-3 rounded-lg shadow-2xl min-w-[180px] max-w-[240px] ring-1 ring-white/10">
          <p className="text-cyan-400 font-bold text-[11px] uppercase tracking-wider mb-1.5 leading-tight">
            {text}
          </p>
          {subtext && (
            <p className="text-slate-300 text-[10px] leading-relaxed font-medium italic">
              {subtext}
            </p>
          )}
          
          {/* Freccia decorativa */}
          <div className={`absolute w-2 h-2 bg-slate-900 border-r border-b border-cyan-500/40 rotate-45 
            ${position === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2' : ''}
            ${position === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 rotate-[225deg]' : ''}
            ${position === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 rotate-[-45deg]' : ''}
            ${position === 'right' ? 'left-[-5px] top-1/2 -translate-y-1/2 rotate-[135deg]' : ''}
          `}></div>
        </div>
      </div>
    </div>
  );
};

export default Tooltip;
