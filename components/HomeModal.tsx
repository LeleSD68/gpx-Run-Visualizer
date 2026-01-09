import React, { useRef } from 'react';

interface HomeModalProps {
    onOpenDiary: () => void;
    onOpenExplorer: () => void;
    onOpenHelp: () => void;
    onImportBackup: (file: File) => void;
    onClose: () => void;
    trackCount: number;
}

const HomeModal: React.FC<HomeModalProps> = ({ onOpenDiary, onOpenExplorer, onOpenHelp, onImportBackup, onClose, trackCount }) => {
    const backupInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImportBackup(e.target.files[0]);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[8000] flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-hidden">
            <div className="max-w-4xl w-full bg-slate-800 border border-slate-700 rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-full max-h-[96vh] md:h-auto lg:max-h-[550px] ring-1 ring-white/10">
                
                {/* Left Side: Branding & Stats */}
                <div className="w-full md:w-1/3 bg-slate-900 p-4 sm:p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-700/50 shrink-0">
                    <div className="text-center md:text-left">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-cyan-400 tracking-tighter mb-1 italic">GPX VIZ</h1>
                        <p className="text-slate-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em]">Dashboard Atleta</p>
                    </div>
                    
                    <div className="hidden md:flex flex-col space-y-4 my-4">
                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 shadow-inner text-center">
                            <span className="block text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Attività Totali</span>
                            <span className="text-3xl font-black text-white">{trackCount}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 leading-relaxed italic border-l-2 border-cyan-500 pl-3 py-1">
                            "La tua corsa, i tuoi dati, la tua evoluzione."
                        </div>
                    </div>

                    <div className="md:hidden flex items-center justify-center gap-4 my-2">
                        <div className="bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-700/50">
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mr-2">Attività:</span>
                            <span className="text-base font-black text-white">{trackCount}</span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose} 
                        className="w-full py-2.5 sm:py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black uppercase tracking-widest text-[9px] sm:text-xs rounded-xl border border-slate-700 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 group mt-2"
                    >
                        Accedi alla Mappa 
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 group-hover:translate-x-1 transition-transform">
                            <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Right Side: Navigation Grid */}
                <div className="w-full md:w-2/3 p-4 sm:p-6 flex flex-col justify-center overflow-y-auto custom-scrollbar">
                    <h2 className="text-sm sm:text-lg font-black text-white uppercase tracking-tighter mb-4 flex items-center gap-3 justify-center md:justify-start">
                        <span className="hidden md:block w-6 h-0.5 bg-cyan-500 rounded-full"></span>
                        Cosa desideri fare?
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-grow pb-2">
                        <button onClick={onOpenExplorer} className="flex flex-col items-center justify-center p-4 sm:p-5 bg-cyan-600/5 hover:bg-cyan-600/10 border-2 border-cyan-500/20 hover:border-cyan-400 rounded-2xl transition-all group active:scale-95 shadow-xl min-h-[100px] sm:min-h-0">
                            <div className="text-3xl sm:text-4xl mb-2 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300">👟</div>
                            <span className="text-sm sm:text-base font-black text-white uppercase tracking-tight">Le Mie Corse</span>
                            <span className="text-[7px] sm:text-[9px] text-cyan-400 font-bold uppercase tracking-widest mt-1 opacity-60">Esplora Archivio</span>
                        </button>

                        <button onClick={onOpenDiary} className="flex flex-col items-center justify-center p-4 sm:p-5 bg-purple-600/5 hover:bg-purple-600/10 border-2 border-purple-500/20 hover:border-purple-400 rounded-2xl transition-all group active:scale-95 shadow-xl min-h-[100px] sm:min-h-0">
                            <div className="text-3xl sm:text-4xl mb-2 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">📖</div>
                            <span className="text-sm sm:text-base font-black text-white uppercase tracking-tight">Il Mio Diario</span>
                            <span className="text-[7px] sm:text-[9px] text-purple-400 font-bold uppercase tracking-widest mt-1 opacity-60">Attività & AI</span>
                        </button>

                        <button onClick={onOpenHelp} className="flex flex-col items-center justify-center p-4 sm:p-5 bg-amber-600/5 hover:bg-amber-600/10 border-2 border-amber-500/20 hover:border-amber-400 rounded-2xl transition-all group active:scale-95 shadow-xl min-h-[100px] sm:min-h-0">
                            <div className="text-3xl sm:text-4xl mb-2 group-hover:scale-110 transition-all duration-300">💡</div>
                            <span className="text-sm sm:text-base font-black text-white uppercase tracking-tight">Aiuto</span>
                            <span className="text-[7px] sm:text-[9px] text-amber-400 font-bold uppercase tracking-widest mt-1 opacity-60">Guida & Tutorial</span>
                        </button>

                        <button onClick={() => backupInputRef.current?.click()} className="flex flex-col items-center justify-center p-4 sm:p-5 bg-slate-700/20 hover:bg-slate-700/40 border-2 border-slate-600/40 hover:border-slate-500 rounded-2xl transition-all group active:scale-95 shadow-xl relative overflow-hidden min-h-[100px] sm:min-h-0">
                            <div className="text-3xl sm:text-4xl mb-2 group-hover:scale-110 transition-all duration-300">💾</div>
                            <span className="text-sm sm:text-base font-black text-white uppercase tracking-tight text-center leading-tight">Carica Backup</span>
                            <span className="text-[7px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60">Ripristina Dati</span>
                            <input 
                                type="file" 
                                ref={backupInputRef} 
                                accept=".json" 
                                className="hidden" 
                                onChange={handleFileChange} 
                            />
                        </button>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .animate-fade-in { animation: fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }

                @media (max-width: 350px) {
                    .grid-cols-2 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
                }
            `}</style>
        </div>
    );
};

export default HomeModal;