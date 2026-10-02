import React, { useState, useRef } from 'react';
import { Download, Copy, Check, AlertTriangle, X, LogIn, UserPlus, Upload, ShieldCheck } from 'lucide-react';
import { loginUser, registerUser } from '../api';
import { storeVaultKey } from '../services/vault';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login' }) {
  const [activeTab, setActiveTab] = useState(initialMode); // 'login' | 'register'
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPrivateKey, setLoginPrivateKey] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [vaultPin, setVaultPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [createdData, setCreatedData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const keyFileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleKeyFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLoginPrivateKey(event.target.result || '');
      };
      reader.readAsText(file);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginUsername.trim()) {
      setError('Please enter your username.');
      return;
    }
    if (!loginPrivateKey.trim()) {
      setError('Please provide your private key.');
      return;
    }
    if (rememberMe) {
      if (!vaultPin || vaultPin.length < 4) {
        setError('PIN must be at least 4 digits/characters.');
        return;
      }
      if (vaultPin !== confirmPin) {
        setError('PINs do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      const result = await loginUser(loginUsername, loginPrivateKey);
      let vaultSaved = false;

      if (rememberMe) {
        await storeVaultKey(result.user.id, result.user.username, loginPrivateKey, vaultPin);
        vaultSaved = true;
      }

      setLoginPrivateKey('');
      setVaultPin('');
      setConfirmPin('');

      onAuthSuccess(result.user, vaultSaved);
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Please check your username and private key.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await registerUser(regUsername.trim(), regEmail.trim());
      setCreatedData(data);
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
    a.download = `${createdData.user.username}_private_key.pem`;
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

  const handleProceedToLogin = () => {
    if (!createdData) return;
    setLoginUsername(createdData.user.username);
    setLoginPrivateKey(createdData.private_key_pem);
    setCreatedData(null);
    setActiveTab('login');
  };

  const resetAndClose = () => {
    setError('');
    setCreatedData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pine_teal-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-dust_grey-800 border border-dry_sage-600 rounded-xl shadow-2xl max-w-md w-full p-6 text-pine_teal-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={resetAndClose}
          className="absolute top-4 right-4 text-pine_teal-400 hover:text-pine_teal-100 p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!createdData ? (
          <div>
            {/* Simple Clean Tabs */}
            <div className="flex border-b border-dry_sage-600/40 mb-5">
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setError(''); }}
                className={`flex-1 text-center pb-2.5 text-sm font-bold transition border-b-2 ${
                  activeTab === 'login'
                    ? 'border-hunter_green-400 text-hunter_green-300'
                    : 'border-transparent text-pine_teal-300 hover:text-pine_teal-100'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setError(''); }}
                className={`flex-1 text-center pb-2.5 text-sm font-bold transition border-b-2 ${
                  activeTab === 'register'
                    ? 'border-hunter_green-400 text-hunter_green-300'
                    : 'border-transparent text-pine_teal-300 hover:text-pine_teal-100'
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-xs text-red-200 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* SIGN IN FORM */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-pine_teal-200 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-3 py-2 bg-dust_grey-900 border border-dry_sage-600 rounded-lg text-pine_teal-100 placeholder-pine_teal-400 focus:outline-none focus:border-hunter_green-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-pine_teal-200">
                      Private Key
                    </label>
                    <button
                      type="button"
                      onClick={() => keyFileInputRef.current?.click()}
                      className="text-fern hover:text-fern-400 font-semibold flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> Upload .pem file
                    </button>
                    <input
                      ref={keyFileInputRef}
                      type="file"
                      accept=".pem,.txt"
                      onChange={handleKeyFileUpload}
                      className="hidden"
                    />
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={loginPrivateKey}
                    onChange={(e) => setLoginPrivateKey(e.target.value)}
                    placeholder="Paste your private key (.pem) here..."
                    className="w-full p-2.5 bg-dust_grey-900 border border-dry_sage-600 rounded-lg font-mono text-[11px] text-pine_teal-100 placeholder-pine_teal-400 focus:outline-none focus:border-hunter_green-400 resize-none"
                  />
                </div>

                {/* Remember Me Option */}
                <div className="p-3 bg-pine_teal-800/30 border border-dry_sage-600/30 rounded-lg space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="mt-0.5 accent-fern rounded"
                    />
                    <div>
                      <span className="font-semibold text-pine_teal-100 block">
                        Remember me on this device
                      </span>
                      <span className="text-[11px] text-pine_teal-300 block mt-0.5">
                        Not recommended on public devices. If unchecked, you will need to enter your private key every time you sign an image.
                      </span>
                    </div>
                  </label>

                  {rememberMe && (
                    <div className="pt-2 border-t border-dry_sage-600/30 space-y-2">
                      <p className="text-[11px] text-dry_sage-300">
                        Create a PIN to protect your key locally:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="password"
                            maxLength={8}
                            required
                            value={vaultPin}
                            onChange={(e) => setVaultPin(e.target.value)}
                            placeholder="PIN (min 4 digits)"
                            className="w-full px-2.5 py-1.5 bg-dust_grey-900 border border-dry_sage-600 rounded text-pine_teal-100 font-mono text-xs focus:outline-none focus:border-fern"
                          />
                        </div>
                        <div>
                          <input
                            type="password"
                            maxLength={8}
                            required
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value)}
                            placeholder="Confirm PIN"
                            className="w-full px-2.5 py-1.5 bg-dust_grey-900 border border-dry_sage-600 rounded text-pine_teal-100 font-mono text-xs focus:outline-none focus:border-fern"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="px-4 py-2 text-pine_teal-300 hover:text-pine_teal-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-fern hover:bg-fern-400 text-dust_grey-900 font-bold rounded-lg shadow-md transition disabled:opacity-50"
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>
                </div>
              </form>
            )}

            {/* CREATE ACCOUNT FORM */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-pine_teal-200 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full px-3 py-2 bg-dust_grey-900 border border-dry_sage-600 rounded-lg text-pine_teal-100 placeholder-pine_teal-400 focus:outline-none focus:border-hunter_green-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-pine_teal-200 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 bg-dust_grey-900 border border-dry_sage-600 rounded-lg text-pine_teal-100 placeholder-pine_teal-400 focus:outline-none focus:border-hunter_green-400"
                  />
                </div>

                <div className="p-3 bg-pine_teal-800/30 border border-dry_sage-600/30 rounded-lg text-[11px] text-pine_teal-300">
                  An RSA 2048-bit keypair will be generated for you. Your private key will only be given to you and is never stored on the server.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="px-4 py-2 text-pine_teal-300 hover:text-pine_teal-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-hunter_green-500 hover:bg-hunter_green-600 text-dust_grey-900 font-bold rounded-lg shadow-md transition disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* REGISTRATION SUCCESS: DOWNLOAD KEY */
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-pine_teal-100">Save Your Private Key</h3>
              <p className="text-xs text-pine_teal-300 mt-0.5">
                Download your private key now. We do not store your private key on the server.
              </p>
            </div>

            <div className="relative">
              <div className="flex justify-between items-center bg-dust_grey-900 px-3 py-1.5 border border-dry_sage-600 rounded-t-lg text-[11px] text-pine_teal-300 font-mono">
                <span>RSA PRIVATE KEY</span>
                <button
                  onClick={handleCopyKey}
                  className="flex items-center gap-1 hover:text-white transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-fern-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <textarea
                readOnly
                rows={6}
                value={createdData.private_key_pem}
                className="w-full bg-dust_grey-900/80 border-x border-b border-dry_sage-600 rounded-b-lg p-2.5 text-[11px] font-mono text-dry_sage-300 select-all focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                onClick={handleDownloadKey}
                className="flex items-center gap-2 px-4 py-2 bg-fern-500 hover:bg-fern-600 text-dust_grey-900 text-xs font-bold rounded-lg shadow-md transition"
              >
                <Download className="w-4 h-4" /> Download Key (.pem)
              </button>
              <button
                onClick={handleProceedToLogin}
                className="px-4 py-2 bg-hunter_green hover:bg-hunter_green-600 text-dust_grey-900 text-xs font-bold rounded-lg transition"
              >
                Continue to Sign In &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
