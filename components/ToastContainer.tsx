
import React from 'react';
import { Toast as ToastType } from '../types';
import Toast from './Toast';

interface ToastContainerProps {
  toasts: ToastType[];
  setToasts: React.Dispatch<React.SetStateAction<ToastType[]>>;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, setToasts }) => {
  const handleClose = (id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };

  return (
    <>
        <div className="fixed top-4 right-4 z-[5000] w-full max-w-sm space-y-3">
        {toasts.map(toast => (
            <Toast key={toast.id} toast={toast} onClose={handleClose} />
        ))}
        </div>
        <style>{`
            @keyframes toast-in {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            .animate-toast-in {
                animation: toast-in 0.3s ease-out forwards;
            }

            @keyframes toast-out {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }
            .animate-toast-out {
                animation: toast-out 0.3s ease-in forwards;
            }

            @keyframes toast-progress {
                from {
                    width: 100%;
                }
                to {
                    width: 0%;
                }
            }
            .animate-toast-progress {
                animation: toast-progress linear forwards;
            }
        `}</style>
    </>
  );
};

export default ToastContainer;
