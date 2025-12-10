
import React, { useState, useEffect, useRef } from 'react';
import { AppTheme } from '../types';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  actionLabel?: string;
  appTheme?: AppTheme;
}

export const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose, onSuccess, title = "Enter PIN", actionLabel = "Unlock", appTheme = 'glass' }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234') {
      onSuccess();
      onClose();
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  if (!isOpen) return null;

  const isPastel = appTheme === 'pastel';
  const isHybrid = appTheme === 'hybrid';

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-xs p-6 rounded-3xl shadow-2xl transform transition-all scale-100 ${isPastel ? 'bg-white text-gray-900' : isHybrid ? 'bg-slate-900/90 backdrop-blur-xl border border-white/10 text-white shadow-hybrid' : 'bg-gray-900 border border-white/10 text-white'}`}>
        <div className="text-center mb-6">
          <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${isPastel ? 'bg-purple-100 text-purple-600' : isHybrid ? 'bg-white/5 text-cyan-400 shadow-neon-cyan' : 'bg-white/10 text-emerald-400'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
          <p className={`text-sm mt-1 ${isPastel ? 'text-gray-500' : 'text-gray-400'}`}>Default PIN: 1234</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6 relative">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/[^0-9]/g, ''));
                setError('');
              }}
              className={`w-full text-center text-3xl tracking-[0.5em] font-bold py-3 bg-transparent border-b-2 outline-none transition-colors ${error ? 'border-red-500 text-red-500' : 'border-gray-500 focus:border-emerald-500'}`}
              placeholder="••••"
            />
            {error && <p className="text-red-500 text-xs text-center mt-2 font-medium animate-pulse">{error}</p>}
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 rounded-xl font-medium transition ${isPastel ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pin.length < 4}
              className={`flex-1 py-3 rounded-xl font-bold text-white transition shadow-lg ${pin.length === 4 ? 'bg-emerald-500 hover:bg-emerald-600 transform hover:scale-105' : 'bg-gray-600 cursor-not-allowed opacity-50'}`}
            >
              {actionLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
