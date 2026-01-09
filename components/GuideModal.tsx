import React, { useEffect, useState } from 'react';

// Added missing interface for GuideModalProps
interface GuideModalProps {
    onClose: () => void;
}

interface GuideSectionProps {
    title: string;
    children: React.ReactNode;
    icon: string;
    isOpen: boolean;
    onToggle: () => void;
}

const GuideSection: React.FC<GuideSectionProps> = ({ title, children, icon, isOpen, onToggle }) => (
    <div className="mb-3 border border-slate-700 rounded-xl overflow-hidden bg-slate-800/40 transition-all duration-300">
        <button 
            onClick={onToggle}
            className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isOpen ? 'bg-slate-700/60' : 'hover:bg-slate-700/30'}`}
        >
            <div className="flex items-center">
                <span className="text-xl mr-3">{icon}</span>
                <span className={`font-black uppercase tracking-tight text-sm ${isOpen ? 'text-cyan-400' : 'text-slate-200'}`}>{title}</span>
            </div>
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor" 
                className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            >
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
        </button>
        <div 
            className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[800px] opacity-100 p-5' : 'max-h-0 opacity-0 overflow-hidden'}`}
        >
            <div className="text-slate-300 text-sm leading-relaxed space-y-3 font-medium">
                {children}
            </div>
        </div>
    </div>
);

const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
    const [openSection, setOpenSection] = useState<string | null>('hub');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const toggle = (id: string) => setOpenSection(openSection === id ? null : id);

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[8000] flex items-center justify-center p-2 sm:p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 text-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-700/50 ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
                
                <header className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
                            <span className="text-2xl">📖</span>
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tighter uppercase">Guida Galattica</h2>
                            <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Manuale di Volo GPX VIZ v1.17</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all text-2xl">&times;</button>
                </header>

                <div className="flex-grow overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-slate-900/30">
                    
                    <GuideSection title="Dashboard Atleta" icon="🏠" isOpen={openSection === 'hub'} onToggle={() => toggle('hub')}>
                        <p>All'avvio verrai accolto dall'<strong>Hub di Benvenuto</strong>. Da qui puoi saltare velocemente al tuo <strong>Diario</strong>, esplorare l'<strong>Archivio</strong> delle corse o gestire i tuoi <strong>Backup</strong>.</p>
                        <p>Usa il tasto <span className="text-cyan-400 font-bold">Accedi alla Mappa</span> per entrare nel cockpit principale e iniziare l'analisi visiva.</p>
                    </GuideSection>

                    <GuideSection title="Importa le tue corse" icon="🚀" isOpen={openSection === 'import'} onToggle={() => toggle('import')}>
                        <p>Trascina i tuoi file <strong>.gpx</strong> o <strong>.tcx</strong> nel widget "Carica" della barra laterale. L'app rileverà automaticamente doppioni e assegnerà <strong>Titoli Intelligenti</strong> basati su orario e difficoltà.</p>
                        <p>Puoi rinominare qualsiasi corsa con un <strong>doppio clic</strong> sul nome o assegnarla a una cartella per tenerle organizzate.</p>
                    </GuideSection>

                    <GuideSection title="Colora i tuoi sforzi" icon="🎨" isOpen={openSection === 'heatmaps'} onToggle={() => toggle('heatmaps')}>
                        <p>Usa il selettore <strong>Heatmap</strong> (Mappa: Standard, Altitudine, Passo, FC) per cambiare il colore del tracciato.</p>
                        <p>Ogni colore rappresenta un'intensità differente: visualizza istantaneamente dove hai dato il massimo o dove la pendenza ti ha rallentato.</p>
                    </GuideSection>

                    <GuideSection title="Rivivi ogni KM" icon="🎬" isOpen={openSection === 'replay'} onToggle={() => toggle('replay')}>
                        <p>Seleziona una corsa e clicca su <strong>Replay</strong>. Entrerai in modalità <strong>Cinema</strong>: la mappa seguirà il tuo movimento originale, mostrando statistiche in tempo reale, FC e pendenza.</p>
                        <p>Al termine, il tuo <strong>Coach AI</strong> genererà un debriefing completo della sessione.</p>
                    </GuideSection>

                    <GuideSection title="Gara Virtuale Live" icon="🏁" isOpen={openSection === 'race'} onToggle={() => toggle('race')}>
                        <p>Seleziona 2 o più corse simili e clicca su <strong>Gara</strong>. Gli avatar virtuali si sfideranno sulla mappa sincronizzati nel tempo.</p>
                        <p>Mentre osservi la sfida, un <strong>Telecronista AI</strong> commenterà sorpassi, distacchi e prestazioni live nella parte bassa dello schermo.</p>
                    </GuideSection>

                    <GuideSection title="Il tuo Diario AI" icon="📖" isOpen={openSection === 'diary'} onToggle={() => toggle('diary')}>
                        <p>Accedi al <strong>Diario</strong> per vedere lo storico delle tue corse su un calendario interattivo. L'IA analizzerà il tuo carico di lavoro e ti proporrà i <strong>prossimi due allenamenti</strong> ideali.</p>
                        <p>Puoi salvare questi suggerimenti come promemoria direttamente nel diario cliccando su "Aggiungi a Calendario".</p>
                    </GuideSection>

                    <GuideSection title="Coach AI Globale" icon="🧠" isOpen={openSection === 'coach'} onToggle={() => toggle('coach')}>
                        <p>Clicca sul pulsante fluttuante <strong>Coach AI</strong> per parlare con un assistente che conosce tutto il tuo storico. Chiedigli consigli sulla preparazione, analisi dello stato di forma o curiosità tecniche.</p>
                        <p>Il Coach ha memoria: ricorda le conversazioni passate per offrirti un supporto sempre più personalizzato.</p>
                    </GuideSection>

                    <GuideSection title="Metriche da Pro" icon="📊" isOpen={openSection === 'metrics'} onToggle={() => toggle('metrics')}>
                        <p>Nella vista <strong>Dettagli</strong> trovi strumenti avanzati:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            <li><strong>PR:</strong> Rilevamento automatico record su 1k, 5k, 10k, Mezza e Maratona.</li>
                            <li><strong>Zone FC:</strong> Analisi del tempo passato in ogni zona cardio (Z1-Z5).</li>
                            <li><strong>Segmenti AI:</strong> L'IA trova automaticamente salite dure o tratti veloci per te.</li>
                        </ul>
                    </GuideSection>

                    <GuideSection title="Editor Chirurgico" icon="✂️" isOpen={openSection === 'editor'} onToggle={() => toggle('editor')}>
                        <p>Entra in <strong>Edit</strong> per modificare i dati. Trascina sul grafico per selezionare un tratto e:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            <li><strong>Taglia:</strong> Rimuovi pause o tratti registrati per errore.</li>
                            <li><strong>Trim:</strong> Isola una parte specifica della corsa.</li>
                            <li><strong>Gps Fix:</strong> Corregge istantaneamente salti di segnale impossibili.</li>
                        </ul>
                    </GuideSection>

                    <GuideSection title="Sicurezza & Backup" icon="💾" isOpen={openSection === 'backup'} onToggle={() => toggle('backup')}>
                        <p>I tuoi dati sono <strong>solo sul tuo dispositivo</strong>. Non carichiamo nulla sui server (tranne i dati anonimi per le query AI).</p>
                        <p>Usa regolarmente la funzione <strong>Backup</strong> per scaricare un file <code>.json</code> e non perdere mai le tue analisi.</p>
                    </GuideSection>

                </div>

                <footer className="p-6 bg-slate-900 border-t border-slate-800 text-center shrink-0">
                    <button 
                        onClick={onClose}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-widest text-xs py-3 px-10 rounded-xl transition-all shadow-lg active:scale-95"
                    >
                        Ricevuto, Capitano!
                    </button>
                </footer>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default GuideModal;