
import React, { useEffect } from 'react';

interface GuideModalProps {
    onClose: () => void;
}

const GuideSection: React.FC<{ title: string; children: React.ReactNode; icon: string }> = ({ title, children, icon }) => (
    <section className="mb-8">
        <h3 className="text-lg font-bold text-cyan-400 flex items-center mb-3">
            <span className="text-2xl mr-3">{icon}</span>
            {title}
        </h3>
        <div className="pl-11 text-slate-300 text-sm leading-relaxed space-y-2">
            {children}
        </div>
    </section>
);

const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[6000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 text-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-700" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Guida Galattica per Runner</h2>
                        <p className="text-cyan-500 text-xs font-mono uppercase tracking-widest mt-1">Manuale Utente GPX Viz</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl">&times;</button>
                </header>

                <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
                    <GuideSection icon="🚀" title="Primi Passi: Caricare e Organizzare">
                        <p>Inizia trascinando i tuoi file <strong>.gpx</strong> o <strong>.tcx</strong> nella barra a sinistra. Una volta caricati, puoi fare <strong>doppio clic</strong> sul nome per rinominarli (es. "Corsa al tramonto").</p>
                        <p>Usa il campo <strong>Folder</strong> per creare categorie: puoi dividere le corse per scarpe usate, per località o per mese. Cliccando sulla stella, aggiungerai la corsa ai tuoi <strong>Preferiti</strong>.</p>
                    </GuideSection>

                    <GuideSection icon="📊" title="Legenda Rapida: Metriche Avanzate">
                        <div className="bg-slate-700/30 p-3 rounded-lg border-l-2 border-amber-400">
                            <ul className="list-none space-y-3">
                                <li>
                                    <span className="text-amber-400 font-bold font-mono text-xs block mb-1">dec% (Decoupling Aerobico)</span>
                                    <span>Stima della deriva cardiaca. Se <strong>&gt; +5%</strong>, stavi "pagando" lo sforzo nella seconda metà (la frequenza cardiaca sale a parità di passo).</span>
                                </li>
                                <li>
                                    <span className="text-amber-400 font-bold font-mono text-xs block mb-1">Spesso-medio</span>
                                    <span>Uscita con passo ≤ alla mediana del periodo e FC ≥ alla mediana. Indica un pattern di lavoro "medio/steady" (impegno moderato), non rigenerante.</span>
                                </li>
                                <li>
                                    <span className="text-amber-400 font-bold font-mono text-xs block mb-1">Easy-probabile</span>
                                    <span>Uscita significativamente più lenta della mediana (circa <strong>+24s/km</strong>). Indica un probabile vero recupero (regola euristica).</span>
                                </li>
                            </ul>
                        </div>
                    </GuideSection>

                    <GuideSection icon="🎨" title="Visualizzazione Avanzata (Heatmaps)">
                        <p>Guarda il menu a tendina in alto a destra: selezionando <strong>Passo</strong> o <strong>Frequenza Cardiaca</strong>, la traccia sulla mappa cambierà colore in base alla tua intensità. Il grafico in basso si colorerà di conseguenza, permettendoti di individuare a colpo d'occhio dove hai dato il massimo.</p>
                    </GuideSection>

                    <GuideSection icon="🏁" title="Gare Virtuali e Simulazioni">
                        <p>Vuoi sfidare te stesso? Seleziona due o più corse dalla lista laterale e clicca sul pulsante <strong>Gara</strong>. L'app sincronizzerà i tempi e farà partire dei runner virtuali sulla mappa.</p>
                        <p>Durante la gara, l'<strong>Intelligenza Artificiale</strong> genererà una cronaca live nell'angolo in basso, commentando distacchi e sorpassi!</p>
                    </GuideSection>

                    <GuideSection icon="✂️" title="L'Editor: Chirurgia del Tracciato">
                        <p>Selezionando una corsa e cliccando su <strong>Edit</strong>, entrerai in modalità officina. Qui puoi trascinare il mouse sul grafico per selezionare una parte della corsa. Puoi:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            <li><strong>Tagliare:</strong> Rimuovi la parte selezionata (utile se hai dimenticato l'orologio acceso in auto).</li>
                            <li><strong>Trim:</strong> Tieni solo la selezione e butta il resto.</li>
                            <li><strong>Fix GPS:</strong> Corregge automaticamente i punti in cui il segnale è "impazzito".</li>
                        </ul>
                    </GuideSection>

                    <GuideSection icon="🧠" title="Il Tuo Coach AI Personale">
                        <p>L'app integra <strong>Gemini</strong>, l'IA di Google. Nella vista <strong>Dettagli</strong>, clicca su "Genera Analisi" per avere un report tecnico sulla tua performance. L'IA analizzerà anche i tuoi <strong>Record Personali</strong> (PR) e ti dirà se stai migliorando la tua resistenza o velocità.</p>
                        <p>Le finestre dell'IA sono <strong>flessibili</strong>: trascina i bordi per ingrandirle o usa l'icona "Tutto Schermo" per leggere i report comodamente.</p>
                    </GuideSection>

                    <GuideSection icon="💾" title="Backup e Sicurezza">
                        <p>Tutti i tuoi dati risiedono solo nel tuo browser per la massima privacy. Ti consigliamo di usare il tasto <strong>Esporta Backup</strong> regolarmente: scaricherai un file che potrai ricaricare su qualsiasi computer per riavere tutte le tue corse e analisi.</p>
                    </GuideSection>
                </div>

                <footer className="p-4 bg-slate-900 border-t border-slate-700 text-center text-xs text-slate-500">
                    GPX Race Visualizer - Progettato per chi ama correre.
                </footer>
            </div>
        </div>
    );
};

export default GuideModal;
