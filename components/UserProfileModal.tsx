
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, PersonalRecord, RunningGoal, AiPersonality, Track } from '../types';
import { getStoredPRs } from '../services/prService';
import Tooltip from './Tooltip';

interface UserProfileModalProps {
    onClose: () => void;
    onSave: (profile: UserProfile) => void;
    currentProfile: UserProfile;
    isWelcomeMode?: boolean; 
    tracks?: Track[];
}

const goalLabels: Record<RunningGoal, string> = {
    'none': 'Nessun obiettivo specifico',
    '5k': 'Migliorare sui 5km',
    '10k': 'Migliorare sui 10km',
    'half_marathon': 'Preparazione Mezza Maratona',
    'marathon': 'Preparazione Maratona',
    'speed': 'Aumentare la Velocità',
    'endurance': 'Aumentare la Resistenza',
    'weight_loss': 'Perdita di peso / Salute'
};

const personalityLabels: Record<AiPersonality, { label: string, desc: string }> = {
    'pro_balanced': { label: 'Coach Professionista', desc: 'Feedback realistici ed equilibrati. Dice quello che c\'è da dire con professionalità, senza eccessi.' },
    'strict': { label: 'Severo ma Giusto', desc: 'Analisi critica, tecnica e senza sconti. Punta alla perfezione.' },
    'motivator': { label: 'Motivatore', desc: 'Incoraggiante, focalizzato sulla crescita e sul non mollare mai.' },
    'enthusiast': { label: 'Entusiasta', desc: 'Pieno di energia! Celebra ogni progresso come una vittoria epica.' },
    'analytic': { label: 'Analitico', desc: 'Freddo e basato sui dati. Solo fatti e statistiche, senza emozioni.' }
};

const formatPRTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let timeString = '';
    if (hours > 0) timeString += `${hours}:`;
    timeString += `${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
    return timeString;
};

const formatPRDistance = (meters: number): string => {
    if (meters === 1000) return '1 km';
    if (meters === 5000) return '5 km';
    if (meters === 10000) return '10 km';
    if (meters === 21097.5) return 'Half Marathon';
    if (meters === 42195) return 'Marathon';
    return `${(meters / 1000).toFixed(2)} km`;
};

const ShoeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-cyan-400">
        <path d="M2.273 5.625A4.483 4.483 0 0 1 5.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 3H5.25a3 3 0 0 0-2.977 2.625ZM2.273 8.625A4.483 4.483 0 0 1 5.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 6H5.25a3 3 0 0 0-2.977 2.625ZM5.25 9a3 3 0 0 0-3 3v2.25a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3V12a3 3 0 0 0-3-3H5.25Z" />
    </svg>
);

const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose, onSave, currentProfile, isWelcomeMode = false, tracks = [] }) => {
    const [profile, setProfile] = useState<UserProfile>({ ...currentProfile });
    const [personalRecords, setPersonalRecords] = useState<Record<string, PersonalRecord>>({});
    const [newShoe, setNewShoe] = useState('');

    useEffect(() => {
        setProfile({ ...currentProfile });
        setPersonalRecords(getStoredPRs());
    }, [currentProfile]);

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

    const shoeMileageMap = useMemo(() => {
        const map: Record<string, number> = {};
        tracks.forEach(t => {
            if (t.shoe) {
                map[t.shoe] = (map[t.shoe] || 0) + t.distance;
            }
        });
        return map;
    }, [tracks]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value ? (['gender', 'aiPersonality', 'personalNotes'].includes(name) ? value : Number(value)) : undefined }));
    };

    const toggleGoal = (goal: RunningGoal) => {
        setProfile(prev => {
            const currentGoals = prev.goals || [];
            if (goal === 'none') return { ...prev, goals: ['none'] };
            
            let nextGoals = currentGoals.filter(g => g !== 'none');
            if (nextGoals.includes(goal)) {
                nextGoals = nextGoals.filter(g => g !== goal);
            } else {
                nextGoals = [...nextGoals, goal];
            }

            if (nextGoals.length === 0) nextGoals = ['none'];
            return { ...prev, goals: nextGoals };
        });
    };

    const handleAddShoe = () => {
        if (!newShoe.trim()) return;
        setProfile(prev => ({
            ...prev,
            shoes: [...(prev.shoes || []), newShoe.trim()]
        }));
        setNewShoe('');
    };

    const handleRemoveShoe = (indexToRemove: number) => {
        setProfile(prev => ({
            ...prev,
            shoes: (prev.shoes || []).filter((_, i) => i !== indexToRemove)
        }));
    };
    
    const handleSave = () => {
        onSave(profile);
        onClose();
    };
    
    const sortedPRs = Object.values(personalRecords).sort((a: PersonalRecord, b: PersonalRecord) => a.distance - b.distance);

    return (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[3000] p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-modal-title"
                className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex flex-col p-4 border-b border-slate-700 flex-shrink-0 bg-slate-900">
                    <div className="flex justify-between items-center w-full">
                        <h2 id="profile-modal-title" className="text-xl font-bold text-cyan-400">
                            {isWelcomeMode ? 'Configurazione Atleta' : 'Profilo & Impostazioni'}
                        </h2>
                        {!isWelcomeMode && (
                            <button onClick={onClose} className="text-2xl leading-none p-1 rounded-full hover:bg-slate-700" aria-label="Close profile modal">&times;</button>
                        )}
                    </div>
                </header>

                <div className="flex-grow overflow-y-auto custom-scrollbar">
                    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="flex flex-col h-full">
                        <div className="p-6 space-y-6">
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="age" className="block text-sm font-medium text-slate-300">Età <span className="text-slate-500 text-xs">(opzionale)</span></label>
                                    <input type="number" name="age" id="age" value={profile.age || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-500" placeholder="Es. 30" />
                                </div>
                                <div>
                                    <label htmlFor="maxHr" className="block text-sm font-medium text-slate-300">FC Max (bpm) <span className="text-cyan-400">*</span></label>
                                    <input type="number" name="maxHr" id="maxHr" value={profile.maxHr || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-500" placeholder="Es. 190" />
                                </div>
                            </div>

                            <div className="border-t border-slate-700 pt-6">
                                <label className="block text-sm font-bold text-cyan-500 uppercase tracking-widest mb-3 flex items-center">
                                    <ShoeIcon />
                                    Gestione Scarpe
                                </label>
                                <div className="flex space-x-2 mb-3">
                                    <input 
                                        type="text" 
                                        value={newShoe}
                                        onChange={(e) => setNewShoe(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddShoe())}
                                        placeholder="Nuovo modello"
                                        className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-sm text-white focus:ring-cyan-500 focus:border-cyan-500"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleAddShoe}
                                        disabled={!newShoe.trim()}
                                        className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold px-3 rounded-md transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar bg-slate-700/30 p-2 rounded-md border border-slate-700/50">
                                    {(!profile.shoes || profile.shoes.length === 0) ? (
                                        <p className="text-xs text-slate-500 italic text-center py-2">Nessuna scarpa aggiunta.</p>
                                    ) : (
                                        profile.shoes.map((shoe, index) => {
                                            const mileage = shoeMileageMap[shoe] || 0;
                                            return (
                                                <div key={index} className="flex justify-between items-center bg-slate-800 p-2 rounded text-sm group">
                                                    <span className="truncate">
                                                        {shoe} <span className="text-xs text-slate-400 font-mono ml-1">({mileage.toFixed(1)} km)</span>
                                                    </span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveShoe(index)}
                                                        className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity px-1"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-cyan-500 uppercase tracking-widest mb-3">Obiettivo Principale</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {(Object.entries(goalLabels) as [RunningGoal, string][]).map(([key, label]) => {
                                        const isSelected = (profile.goals || ['none']).includes(key);
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => toggleGoal(key)}
                                                className={`flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                                                    isSelected 
                                                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_-2px_rgba(34,211,238,0.3)]' 
                                                        : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'
                                                }`}
                                            >
                                                <span>{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="border-t border-slate-700 pt-6">
                                <label htmlFor="aiPersonality" className="block text-sm font-bold text-cyan-500 uppercase tracking-widest mb-2">Tono del Coach AI</label>
                                <select 
                                    name="aiPersonality" 
                                    id="aiPersonality" 
                                    value={profile.aiPersonality || 'pro_balanced'} 
                                    onChange={handleChange} 
                                    className="block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
                                >
                                    {Object.entries(personalityLabels).map(([key, { label }]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="border-t border-slate-700 pt-6">
                                <label htmlFor="personalNotes" className="block text-sm font-bold text-cyan-500 uppercase tracking-widest mb-2">Note Personali</label>
                                <textarea 
                                    name="personalNotes" 
                                    id="personalNotes" 
                                    value={profile.personalNotes || ''} 
                                    onChange={handleChange} 
                                    placeholder="Es: Recupero da infortunio, obiettivo 10km in 50 minuti..."
                                    className="block w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-sm text-white focus:ring-cyan-500 focus:border-cyan-500 h-24 resize-none"
                                />
                            </div>
                        </div>

                        {sortedPRs.length > 0 && !isWelcomeMode && (
                             <div className="p-6 border-t border-slate-700 bg-slate-900/30">
                                <h3 className="text-lg font-semibold text-slate-200 mb-2">Record Personali</h3>
                                <div className="space-y-2">
                                    {sortedPRs.map((pr: PersonalRecord) => (
                                        <div key={pr.distance} className="flex justify-between items-center bg-slate-700/50 p-2 rounded-md border border-slate-600/50">
                                            <span className="font-semibold text-slate-300 text-sm">{formatPRDistance(pr.distance)}</span>
                                            <span className="font-mono text-white text-sm font-bold">{formatPRTime(pr.time)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <footer className="p-4 border-t border-slate-700 flex justify-end space-x-3 flex-shrink-0 mt-auto bg-slate-800">
                            {!isWelcomeMode && (
                                <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md text-sm">Annulla</button>
                            )}
                            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-md text-sm shadow-lg shadow-cyan-900/20">
                                {isWelcomeMode ? 'Completa Setup' : 'Salva Impostazioni'}
                            </button>
                        </footer>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
