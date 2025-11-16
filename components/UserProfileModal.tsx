



import React, { useState, useEffect } from 'react';
import { UserProfile, PersonalRecord } from '../types';
import { getStoredPRs } from '../services/prService';

interface UserProfileModalProps {
    onClose: () => void;
    onSave: (profile: UserProfile) => void;
    currentProfile: UserProfile;
}

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

const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose, onSave, currentProfile }) => {
    const [profile, setProfile] = useState<UserProfile>(currentProfile);
    const [personalRecords, setPersonalRecords] = useState<Record<string, PersonalRecord>>({});

    useEffect(() => {
        setProfile(currentProfile);
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value ? Number(value) : undefined }));
    };
    
    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
         const { name, value } = e.target;
         const finalValue = value === "" ? undefined : value;
         setProfile(prev => ({ ...prev, [name]: finalValue as UserProfile['gender'] }));
    }

    const handleAutoMaxHr = () => {
        if (profile.age) {
            setProfile(prev => ({ ...prev, maxHr: 220 - prev.age! }));
        }
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
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                    <h2 id="profile-modal-title" className="text-xl font-bold text-cyan-400">Profilo Utente</h2>
                    <button onClick={onClose} className="text-2xl leading-none p-1 rounded-full hover:bg-slate-700" aria-label="Close profile modal">&times;</button>
                </header>

                <div className="flex-grow overflow-y-auto">
                    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="flex flex-col h-full">
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-400">Questi dati aiuteranno a fornire analisi più personalizzate. Vengono salvati solo nel tuo browser.</p>
                            
                            <div>
                                <label htmlFor="age" className="block text-sm font-medium text-slate-300">Età</label>
                                <input type="number" name="age" id="age" value={profile.age || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500" />
                            </div>

                            <div>
                                <label htmlFor="weight" className="block text-sm font-medium text-slate-300">Peso (kg)</label>
                                <input type="number" name="weight" id="weight" step="0.1" value={profile.weight || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500" />
                            </div>

                            <div>
                                <label htmlFor="gender" className="block text-sm font-medium text-slate-300">Sesso</label>
                                <select name="gender" id="gender" value={profile.gender || ''} onChange={handleSelectChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500">
                                    <option value="">Non specificato</option>
                                    <option value="male">Uomo</option>
                                    <option value="female">Donna</option>
                                    <option value="other">Altro</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="maxHr" className="block text-sm font-medium text-slate-300">FC Massima (bpm)</label>
                                <div className="flex items-center space-x-2 mt-1">
                                    <input type="number" name="maxHr" id="maxHr" value={profile.maxHr || ''} onChange={handleChange} className="block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500" />
                                    <button type="button" onClick={handleAutoMaxHr} disabled={!profile.age} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-3 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed">Auto</button>
                                </div>
                            </div>
                            
                            <div>
                                <label htmlFor="restingHr" className="block text-sm font-medium text-slate-300">FC a Riposo (bpm)</label>
                                <input type="number" name="restingHr" id="restingHr" value={profile.restingHr || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500" />
                            </div>
                        </div>

                        {sortedPRs.length > 0 && (
                             <div className="p-6 border-t border-slate-700">
                                <h3 className="text-lg font-semibold text-slate-200 mb-2">Record Personali</h3>
                                <div className="space-y-2">
                                    {sortedPRs.map((pr: PersonalRecord) => (
                                        <div key={pr.distance} className="flex justify-between items-center bg-slate-700/50 p-2 rounded-md">
                                            <span className="font-semibold text-slate-300">{formatPRDistance(pr.distance)}</span>
                                            <div className="text-right">
                                                <span className="font-mono text-white">{formatPRTime(pr.time)}</span>
                                                <p className="text-xs text-slate-400 truncate" title={pr.trackName}>on {new Date(pr.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <footer className="p-4 border-t border-slate-700 flex justify-end space-x-3 flex-shrink-0 mt-auto">
                            <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Annulla</button>
                            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md">Salva</button>
                        </footer>
                    </form>
                </div>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default UserProfileModal;