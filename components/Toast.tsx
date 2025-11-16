
import React, { useState, useEffect } from 'react';
import { Toast } from '../types';

interface ToastProps {
  toast: Toast;
  onClose: (id: number) => void;
}

const SuccessIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
    </svg>
);

const ErrorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-2.92-5.42a.75.75 0 0 1 1.06 0L10 14.44l1.86-1.86a.75.75 0 1 1 1.06 1.06L11.06 15.5l1.86 1.86a.75.75 0 1 1-1.06 1.06L10 16.56l-1.86 1.86a.75.75 0 0 1-1.06-1.06L8.94 15.5l-1.86-1.86a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
);

const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A.75.75 0 0 0 10 12.5a.75.75 0 0 0 .75-.75v-.105a.25.25 0 0 1 .244-.304l.46-2.067a.75.75 0 0 0-.67-1.03Z" clipRule="evenodd" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
);

const toastConfig = {
    success: { icon: <SuccessIcon />, baseColor: 'bg-green-500', iconColor: 'text-green-500' },
    error: { icon: <ErrorIcon />, baseColor: 'bg-red-500', iconColor: 'text-red-500' },
    info: { icon: <InfoIcon />, baseColor: 'bg-cyan-500', iconColor: 'text-cyan-500' },
};

const DURATION = 5000; // 5 seconds

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    const [exiting, setExiting] = useState(false);
    const timerRef = React.useRef<number | null>(null);

    useEffect(() => {
        timerRef.current = window.setTimeout(() => {
            setExiting(true);
        }, DURATION);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const handleAnimationEnd = () => {
        if (exiting) {
            onClose(toast.id);
        }
    };

    const config = toastConfig[toast.type];

    return (
        <div
            className={`toast-item w-full max-w-sm bg-slate-800 border border-slate-700 rounded-lg shadow-2xl flex overflow-hidden ${exiting ? 'animate-toast-out' : 'animate-toast-in'}`}
            onAnimationEnd={handleAnimationEnd}
        >
            <div className="flex items-center justify-center w-12 p-3">
                <span className={config.iconColor}>{config.icon}</span>
            </div>
            <div className="flex-1 p-3 pr-4">
                <p className="text-sm text-slate-200">{toast.message}</p>
            </div>
            <button onClick={() => setExiting(true)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-700">
                <CloseIcon />
            </button>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700/50">
                <div 
                    className={`h-full ${config.baseColor} animate-toast-progress`}
                    style={{ animationDuration: `${DURATION}ms` }}
                ></div>
            </div>
        </div>
    );
};

export default Toast;
