import React, { useState } from 'react';
import { Lock, X, KeyRound, AlertCircle, ShieldCheck } from 'lucide-react';

export default function PinPromptModal({ isOpen, onClose, onUnlock, username }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin) {
      setError('Please enter your Vault PIN');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onUnlock(pin);
      setPin('');
      onClose();
    } catch (err) {
      setError(err.message || 'Incorrect PIN. Unable to unlock key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pine_teal-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-dust_grey-800 border border-dry_sage-600 rounded-xl shadow-2xl max-w-sm w-full p-5 text-pine_teal-100 relative">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-pine_teal-400 hover:text-pine_teal-100 p-1 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-fern/20 text-fern rounded-xl">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-pine_teal-100">Unlock Cryptographic Vault</h4>
            <p className="text-xs text-pine_teal-300">Author: <span className="font-bold text-fern">{username}</span></p>
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-red-900/30 border border-red-500/50 rounded-lg text-xs text-red-200 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-pine_teal-300 uppercase tracking-wider mb-1">
              Enter Vault PIN / Password
            </label>
            <input
              type="password"
              autoFocus
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN"
              className="w-full px-3 py-2 bg-dust_grey-900 border border-dry_sage-600 rounded-lg text-pine_teal-100 font-mono text-sm focus:outline-none focus:border-fern"
            />
            <p className="text-[10px] text-pine_teal-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-fern" /> Key is decrypted momentarily into memory for signing.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-pine_teal-300 hover:text-pine_teal-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-fern hover:bg-fern-400 text-dust_grey-900 text-xs font-bold rounded-lg shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Unlocking...' : 'Authorize Signature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
