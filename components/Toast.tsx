import React, { useEffect } from 'react';
import { Icons } from './Icons';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border ${
        type === 'success' ? 'bg-white border-green-100 text-green-700' : 
        type === 'error' ? 'bg-white border-red-100 text-red-700' : 
        'bg-gray-800 text-white'
      }`}>
        {type === 'success' && <div className="bg-green-100 p-1 rounded-full"><Icons.Check size={14} /></div>}
        {type === 'error' && <div className="bg-red-100 p-1 rounded-full"><Icons.Alert size={14} /></div>}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
};
