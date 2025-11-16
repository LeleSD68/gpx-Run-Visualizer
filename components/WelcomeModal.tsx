
import React, { useEffect } from 'react';

interface WelcomeModalProps {
    onClose: () => void;
}

const Feature: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 text-3xl">{icon}</div>
        <div>
            <h4 className="font-semibold text-slate-100">{title}</h4>
            <p className="text-sm text-slate-400">{children}</p>
        </div>
    </div>
);

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
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
                aria-labelledby="welcome-modal-title"
                className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-6 text-center border-b border-slate-700">
                    <h2 id="welcome-modal-title" className="text-2xl font-bold text-cyan-400">Welcome to GPX Race Visualizer!</h2>
                    <p className="text-slate-300 mt-1">Your advanced running analysis tool.</p>
                </header>

                <div className="p-6 space-y-6">
                    <Feature icon="🗺️" title="Visualize Your Runs">
                        Upload GPX or TCX files to see your activities on an interactive map. I've pre-loaded a sample track for you to explore!
                    </Feature>
                    <Feature icon="🏁" title="Simulate Races">
                        Select multiple similar tracks to race them against each other in a real-time simulation.
                    </Feature>
                    <Feature icon="📊" title="Analyze Performance">
                        Dive deep into your stats with detailed charts, split analysis, personal record tracking, and AI-powered insights.
                    </Feature>
                </div>

                <footer className="p-6 mt-auto">
                    <button 
                        onClick={onClose} 
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-md transition-colors"
                    >
                        Get Started
                    </button>
                </footer>
            </div>
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default WelcomeModal;
