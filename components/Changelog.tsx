

import React, { useEffect } from 'react';

interface ChangelogProps {
    onClose: () => void;
}

const changelogData = [
     {
        version: 'v1.11',
        date: '2024-08-05',
        changes: [
            'Introdotta una nuova, elegante modalità di benvenuto per i nuovi utenti, che illustra le funzionalità principali.',
            'Aggiunto un tracciato di esempio pre-caricato (una corsa intorno al Colosseo) per consentire agli utenti di esplorare immediatamente l\'app.',
            'Sostituiti tutti gli avvisi del browser (`alert`) con un sistema di notifiche "toast" moderno e non bloccante.',
            'Tutto il parsing dei file GPX/TCX è stato spostato in un Web Worker in background per evitare il blocco dell\'interfaccia utente con file di grandi dimensioni.',
            'Migliorata l\'accessibilità con l\'aggiunta di attributi ARIA e la possibilità di chiudere le finestre modali con il tasto \'Esc\'.',
        ]
    },
    {
        version: 'v1.10',
        date: '2024-08-04',
        changes: [
            'Aggiunto il pannello di analisi della zona di frequenza cardiaca nella vista dettagliata dell\'attività.',
            'Introdotto il tracciamento automatico dei Record Personali (PR) per distanze standard (1k, 5k, 10k, ecc.).',
            'I nuovi PR vengono evidenziati nella vista dettagliata e tutti i record vengono salvati e visualizzati nel Profilo Utente.',
            'L\'analisi AI ora utilizza i dati del profilo utente (età, FC massima) per fornire approfondimenti più personalizzati.'
        ]
    },
    {
        version: 'v1.9',
        date: '2024-08-03',
        changes: [
            'L\'Assistente AI è ora un pannello globale accessibile da qualsiasi schermata tramite un pulsante fluttuante.',
            'Il contesto del chatbot AI si aggiorna automaticamente in base alle tracce selezionate o alla vista corrente (editor/dettagli).',
            'Aggiunta la nuova funzione "Segmenti Chiave (AI)" nella vista dettagli, che identifica e analizza le parti più importanti di una corsa.',
            'I segmenti identificati dall\'AI possono essere cliccati per evidenziarli istantaneamente sulla mappa e sul grafico della timeline.',
        ]
    },
     {
        version: 'v1.8',
        date: '2024-08-02',
        changes: [
            'L\'applicazione ora rileva e impedisce il caricamento di file di tracciati duplicati.',
            'Viene mostrato un avviso se alcuni file vengono saltati durante il caricamento perché sono duplicati.',
        ]
    },
     {
        version: 'v1.7',
        date: '2024-08-01',
        changes: [
            'L\'interfaccia ora passa a una visualizzazione a schermo intero per l\'editor e i dettagli della traccia, nascondendo la dashboard principale per una maggiore concentrazione.',
        ]
    },
     {
        version: 'v1.6',
        date: '2024-07-31',
        changes: [
            'È ora possibile ridimensionare il pannello laterale e la visualizzazione della mappa trascinando il divisore.',
            'La barra laterale ora entra in una "modalità focus", nascondendo i controlli non necessari quando si visualizzano i dettagli o si modifica una traccia.',
        ]
    },
     {
        version: 'v1.5',
        date: '2024-07-30',
        changes: [
            'Il grafico della timeline ora mostra un riempimento e una linea colorati a gradiente quando è attiva una metrica di visualizzazione della mappa (es. altitudine, passo).',
        ]
    },
     {
        version: 'v1.4',
        date: '2024-07-29',
        changes: [
            'Aggiunta la possibilità di sovrapporre più metriche (passo, altitudine, velocità, FC) sul grafico della timeline per un confronto diretto.',
            'Aggiunto un indicatore sulla legenda della mappa che si sincronizza con il mouse sul grafico o sulla mappa.'
        ]
    },
    {
        version: 'v1.3',
        date: '2024-07-28',
        changes: [
            'Le visualizzazioni heatmap (per altitudine, passo, ecc.) sono ora applicate anche al grafico della timeline, colorando sia la linea che l\'area sottostante.',
        ]
    },
     {
        version: 'v1.2',
        date: '2024-07-27',
        changes: [
            'Aggiunta la sezione "Profilo Utente" per inserire dati personali (età, peso, FC, ecc.).',
            'I dati del profilo e i tracciati caricati vengono ora salvati in memoria per le sessioni future.',
        ]
    },
    {
        version: 'v1.1',
        date: '2024-07-26',
        changes: [
            'Aggiunta la finestra "Registro Modifiche" per visualizzare la cronologia degli aggiornamenti.',
        ]
    },
    {
        version: 'v1.0',
        date: '2024-07-25',
        changes: [
            'Creazione del punto di ripristino iniziale.',
            'Aggiunto il numero di versione accanto al titolo dell\'applicazione.',
        ]
    }
];

const Changelog: React.FC<ChangelogProps> = ({ onClose }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[3000] p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                role="dialog"
                aria-modal="true"
                aria-labelledby="changelog-title"
                className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                    <h2 id="changelog-title" className="text-xl font-bold text-cyan-400">Registro Modifiche</h2>
                    <button onClick={onClose} className="text-2xl leading-none p-1 rounded-full hover:bg-slate-700" aria-label="Close changelog">&times;</button>
                </header>

                <div className="flex-grow p-6 overflow-y-auto space-y-6">
                    {changelogData.map(entry => (
                        <div key={entry.version} className="relative pl-6 border-l-2 border-slate-700">
                            <div className="absolute -left-[9px] top-1 w-4 h-4 bg-cyan-500 rounded-full border-4 border-slate-800"></div>
                            <h3 className="text-lg font-bold text-slate-100">{entry.version}</h3>
                            <p className="text-xs text-slate-500 mb-2">{entry.date}</p>
                            <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                                {entry.changes.map((change, index) => (
                                    <li key={index}>{change}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default Changelog;