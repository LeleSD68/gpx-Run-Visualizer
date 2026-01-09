
import React, { useRef } from 'react';

interface InitialChoiceModalProps {
    onImportBackup: (file: File) => void;
    onStartNew: () => void;
    onClose: () => void;
}

const BackupIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-3 text-purple-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

const NewFileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-3 text-cyan-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const InitialChoiceModal: React.FC<InitialChoiceModalProps> = ({ onImportBackup, onStartNew, onClose }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImportBackup(e.target.files[0]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[6000] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-800 text-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-700 overflow-hidden relative">
                {/* Close Button X */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-2 z-10"
                    aria-label="Chiudi"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                </button>

                <header className="p-6 text-center border-b border-slate-700 bg-slate-900">
                    <h2 className="text-2xl font-bold text-white">Come vuoi iniziare?</h2>
                    <p className="text-slate-400 mt-1">Non abbiamo trovato corse salvate in memoria.</p>
                </header>
                
                <div className="p-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center p-6 bg-slate-700/50 hover:bg-slate-700 border-2 border-slate-600 hover:border-purple-500 rounded-xl transition-all group"
                        >
                            <div className="group-hover:scale-110 transition-transform duration-300">
                                <BackupIcon />
                            </div>
                            <h3 className="text-lg font-bold text-slate-200 group-hover:text-white">Carica Backup</h3>
                            <p className="text-xs text-slate-400 text-center mt-2">Ripristina un file .json salvato in precedenza con tutti i tuoi dati.</p>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                accept="application/json,.json" 
                                className="hidden" 
                                onChange={handleFileChange} 
                            />
                        </button>

                        <button 
                            onClick={onStartNew}
                            className="flex flex-col items-center justify-center p-6 bg-slate-700/50 hover:bg-slate-700 border-2 border-slate-600 hover:border-cyan-500 rounded-xl transition-all group"
                        >
                            <div className="group-hover:scale-110 transition-transform duration-300">
                                <NewFileIcon />
                            </div>
                            <h3 className="text-lg font-bold text-slate-200 group-hover:text-white">Nuovi File</h3>
                            <p className="text-xs text-slate-400 text-center mt-2">Inizia da zero caricando i tuoi file GPX o TCX dal dispositivo.</p>
                        </button>
                    </div>

                    <div className="flex justify-center">
                        <button 
                            onClick={onClose}
                            className="text-slate-400 hover:text-cyan-400 text-sm font-medium underline underline-offset-4 transition-colors"
                        >
                            Entra ed esplora senza caricare dati
                        </button>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default InitialChoiceModal;
