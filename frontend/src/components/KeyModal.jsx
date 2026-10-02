import React, { useState } from 'react';
import { KeyRound, Download, Copy, Check, AlertTriangle, X, ShieldAlert, UserPlus, UserCheck } from 'lucide-react';
import { registerUser } from '../api';

export default function KeyModal({ isOpen, onClose, onUserCreated, users = [], activeUser, onSelectUser }) {
  const [mode, setMode] = useState('create'); // 'create' | 'switch'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [createdData, setCreatedData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await registerUser(username.trim(), email.trim());
      setCreatedData(data);
      if (onUserCreated) {
        onUserCreated(data.user, data.private_key_pem);
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadKey = () => {
    if (!createdData?.private_key_pem) return;
    const blob = new Blob([createdData.private_key_pem], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${createdData.user.username}_rsa_private_key.pem`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyKey = () => {
    if (!createdData?.private_key_pem) return;
    navigator.clipboard.writeText(createdData.private_key_pem);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setCreatedData(null);
    setUsername('');
    setEmail('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pine_teal-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-dust_grey-800 border border-dry_sage-600 rounded-xl shadow-2xl max-w-xl w-full p-6 text-pine_teal-100 relative">
        <button
          onClick={resetForm}
          className="absolute top-4 right-4 text-pine_teal-400 hover:text-pine_teal-100 p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!createdData ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-dry_sage-500/20 text-hunter_green-400 rounded-xl">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-pine_teal-100">Cryptographic Identity Management</h3>
                <p className="text-xs text-pine_teal-300">Generate RSA-2048 identity or switch active author key</p>
              </div>
            </div>

            {/* Mode switch */}
            <div className="flex border-b border-dry_sage-600/40 mb-5">
              <button
                type="button"
                onClick={() => setMode('create')}
                className={`flex items-center gap-2 pb-2 px-3 text-sm font-semibold transition border-b-2 ${
                  mode === 'create'
                    ? 'border-hunter_green-400 text-hunter_green-300'
                    : 'border-transparent text-pine_teal-300 hover:text-pine_teal-100'
                }`}
              >
                <UserPlus className="w-4 h-4" /> New RSA Keypair
              </button>
              <button
                type="button"
                onClick={() => setMode('switch')}
                className={`flex items-center gap-2 pb-2 px-3 text-sm font-semibold transition border-b-2 ${
                  mode === 'switch'
                    ? 'border-hunter_green-400 text-hunter_green-300'
                    : 'border-transparent text-pine_teal-300 hover:text-pine_teal-100'
                }`}
              >
                <UserCheck className="w-4 h-4" /> Select Author ({users.length})
              </button>
            </div>

            {mode === 'create' ? (
              <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-xs text-red-200">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-pine_teal-300 uppercase tracking-wider mb-1">
                    Author Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. alice_photographer"
                    className="w-full px-3 py-2 bg-dust_grey-900 border border-dry_sage-600 rounded-lg text-sm text-pine_teal-100 placeholder-pine_teal-300 focus:outline-none focus:border-hunter_green-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-pine_teal-300 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alice@provenance.org"
                    className="w-full px-3 py-2 bg-dust_grey-900 border border-dry_sage-600 rounded-lg text-sm text-pine_teal-100 placeholder-pine_teal-300 focus:outline-none focus:border-hunter_green-400"
                  />
                </div>

                <div className="p-3 bg-pine_teal-800/40 border border-dry_sage-600/30 rounded-lg text-xs text-pine_teal-200">
                  <p className="font-semibold text-dry_sage-400 mb-1">Zero-Knowledge Key Generation Policy:</p>
                  A 2048-bit RSA keypair will be generated on the fly. The Public Key will be published to the registry, while your Private Key is provided exclusively to you and NEVER stored on the server.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-xs font-medium text-pine_teal-300 hover:text-pine_teal-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-hunter_green-500 hover:bg-hunter_green-600 text-dust_grey-900 text-xs font-bold rounded-lg shadow-md transition disabled:opacity-50"
                  >
                    {loading ? 'Generating 2048-bit Keypair...' : 'Generate & Register Keypair'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-pine_teal-300 mb-2">
                  Select a registered identity to use for image provenance registration:
                </p>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {users.length === 0 ? (
                    <p className="text-xs text-pine_teal-300 italic py-4 text-center">No users registered yet. Generate an RSA keypair to start.</p>
                  ) : (
                    users.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          onSelectUser(u);
                          onClose();
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                          activeUser?.id === u.id
                            ? 'bg-fern-500/20 border-fern-400 text-pine_teal-100'
                            : 'bg-dust_grey-900 border-dry_sage-600/40 hover:border-dry_sage-400'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-bold">{u.username}</p>
                          <p className="text-xs text-pine_teal-300">{u.email}</p>
                          <p className="text-[10px] font-mono text-pine_teal-400 mt-1 truncate max-w-xs">
                            ID: {u.id}
                          </p>
                        </div>
                        {activeUser?.id === u.id && (
                          <span className="text-xs font-semibold px-2 py-1 bg-fern-500 text-white rounded">
                            Active
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* RSA Private Key Display Modal */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-300 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-pine_teal-100">Save Your RSA Private Key</h3>
                <p className="text-xs text-pine_teal-300">Identity: <span className="font-bold text-fern-400">{createdData.user.username}</span></p>
              </div>
            </div>

            {/* Warning Prompt */}
            <div className="p-3 bg-red-950/40 border border-red-500/60 rounded-lg flex items-start gap-2 text-xs text-red-200">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-red-300 block mb-0.5">CRITICAL SECURITY WARNING:</span>
                {createdData.security_warning}
              </div>
            </div>

            {/* PEM Code Block */}
            <div className="relative">
              <div className="flex justify-between items-center bg-dust_grey-900 px-3 py-1.5 border border-dry_sage-600 rounded-t-lg text-[11px] text-pine_teal-300 font-mono">
                <span>RSA PRIVATE KEY (2048-BIT PKCS#8)</span>
                <button
                  onClick={handleCopyKey}
                  className="flex items-center gap-1 hover:text-white transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-fern-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy PEM'}
                </button>
              </div>
              <textarea
                readOnly
                rows={7}
                value={createdData.private_key_pem}
                className="w-full bg-dust_grey-900/80 border-x border-b border-dry_sage-600 rounded-b-lg p-2.5 text-[11px] font-mono text-dry_sage-300 select-all focus:outline-none resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleDownloadKey}
                className="flex items-center gap-2 px-4 py-2 bg-fern-500 hover:bg-fern-600 text-dust_grey-900 text-xs font-bold rounded-lg shadow-md transition"
              >
                <Download className="w-4 h-4" /> Download Private Key (.pem)
              </button>
              <button
                onClick={resetForm}
                className="px-5 py-2 bg-pine_teal-600 hover:bg-pine_teal-500 text-dust_grey-900 text-xs font-semibold rounded-lg transition"
              >
                I Have Saved My Key
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
