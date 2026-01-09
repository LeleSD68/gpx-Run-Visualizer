
import React from 'react';
import { Commentary } from '../types';

// Removed duplicate local interface Commentary, now using it from ../types

interface LiveCommentaryProps {
    messages: Commentary[];
    isLoading: boolean;
}

const LiveCommentary: React.FC<LiveCommentaryProps> = ({ messages, isLoading }) => {
    return (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xl z-[1500] pointer-events-none">
            <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden pointer-events-auto">
                <div className="bg-cyan-900/40 px-3 py-1 flex justify-between items-center border-b border-cyan-500/20">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></span>
                        Cronaca Live AI
                    </span>
                    {isLoading && <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>}
                </div>
                <div className="h-20 overflow-y-auto p-3 custom-scrollbar flex flex-col-reverse">
                    {messages.length === 0 ? (
                        <p className="text-slate-500 text-sm italic text-center">In attesa dei primi rilevamenti...</p>
                    ) : (
                        messages.map((msg, i) => (
                            <div key={i} className={`mb-2 animate-fade-in ${i === 0 ? 'text-white font-medium' : 'text-slate-400 text-xs'}`}>
                                {msg.text}
                            </div>
                        )).reverse()
                    )}
                </div>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default LiveCommentary;
