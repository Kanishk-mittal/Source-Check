import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, Shield, Layers, FileKey, Sparkles, AlertCircle, Copy, Check } from 'lucide-react';
import { registerImage } from '../api';

export default function RegisterImage({ activeUser, activePrivateKey, onImageRegistered, onOpenKeyModal }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [privateKeyPem, setPrivateKeyPem] = useState(activePrivateKey || '');
  const [quadtreeDepth, setQuadtreeDepth] = useState(3);
  const [showGridOverlay, setShowGridOverlay] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredResult, setRegisteredResult] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  const fileInputRef = useRef(null);
  const keyFileInputRef = useRef(null);

  // Sync if activePrivateKey changes
  React.useEffect(() => {
    if (activePrivateKey && !privateKeyPem) {
      setPrivateKeyPem(activePrivateKey);
    }
  }, [activePrivateKey]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setRegisteredResult(null);
      setError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith('image/')) {
      setFile(dropped);
      setPreviewUrl(URL.createObjectURL(dropped));
      setRegisteredResult(null);
      setError('');
    }
  };

  const handleKeyFileUpload = (e) => {
    const keyFile = e.target.files?.[0];
    if (keyFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPrivateKeyPem(event.target.result);
      };
      reader.readAsText(keyFile);
    }
  };

  const calculateTotalNodes = (depth) => {
    // 1 + 4 + 16 + ... + 4^depth
    let total = 0;
    for (let i = 0; i <= depth; i++) {
      total += Math.pow(4, i);
    }
    return total;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select or drop an image file.');
      return;
    }
    if (!activeUser?.id) {
      setError('Please select or generate an author identity first.');
      return;
    }
    if (!privateKeyPem.trim()) {
      setError('RSA Private Key PEM is required to digitally sign the image Quadtree.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('owner_id', activeUser.id);
      formData.append('private_key_pem', privateKeyPem.trim());
      formData.append('quadtree_depth', quadtreeDepth);

      const result = await registerImage(formData);
      setRegisteredResult(result);
      if (onImageRegistered) onImageRegistered(result);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // Helper to render grid divisions for visual feedback
  const renderGridLines = (depth) => {
    if (!showGridOverlay || depth <= 0) return null;
    const divisions = Math.pow(2, depth);
    const lines = [];
    for (let i = 1; i < divisions; i++) {
      const pct = (i / divisions) * 100;
      // Vertical
      lines.push(
        <div
          key={`v-${i}`}
          className="absolute top-0 bottom-0 border-l border-emerald-400/50 pointer-events-none"
          style={{ left: `${pct}%` }}
        />
      );
      // Horizontal
      lines.push(
        <div
          key={`h-${i}`}
          className="absolute left-0 right-0 border-t border-emerald-400/50 pointer-events-none"
          style={{ top: `${pct}%` }}
        />
      );
    }
    return lines;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Intro Banner */}
      <div className="bg-dry_sage-900 border border-dry_sage-600/40 rounded-xl p-6 text-pine_teal-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-pine_teal-100 flex items-center gap-2">
            <Layers className="w-6 h-6 text-fern" />
            Image Ingestion & Quadtree pHash Registration
          </h2>
          <p className="text-xs text-pine_teal-300 mt-1 max-w-2xl">
            Recursively divides image spatial geometry into quadrants up to depth <span className="font-mono font-bold text-fern">D={quadtreeDepth}</span> ({calculateTotalNodes(quadtreeDepth)} nodes). Each node receives a 64-bit perceptual hash (pHash), serialized deterministically and cryptographically signed with your RSA Private Key.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeUser ? (
            <div className="px-3.5 py-2 bg-fern/20 border border-fern/40 rounded-lg text-xs">
              <span className="text-fern font-bold block">Author Identity Active:</span>
              <span className="font-mono text-pine_teal-100">{activeUser.username}</span>
            </div>
          ) : (
            <button
              onClick={onOpenKeyModal}
              className="px-4 py-2 bg-hunter_green hover:bg-hunter_green-600 text-dust_grey-900 text-xs font-bold rounded-lg shadow-md transition"
            >
              Select / Create Author
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Registration Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Image Dropzone & Preview (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-dust_grey-800 border border-dry_sage-600/40 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-pine_teal-300">
                1. Image Upload & Spatial Decomposition Preview
              </span>
              {previewUrl && (
                <label className="flex items-center gap-2 text-xs text-pine_teal-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGridOverlay}
                    onChange={(e) => setShowGridOverlay(e.target.checked)}
                    className="accent-hunter_green-500 rounded"
                  />
                  Show Quadtree Grid
                </label>
              )}
            </div>

            {/* Dropzone */}
            {!previewUrl ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-dry_sage-500/60 hover:border-fern bg-dust_grey-900 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-dry_sage-500/20 text-hunter_green flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-pine_teal-100">
                  Drop master provenance image here
                </p>
                <p className="text-xs text-pine_teal-300 mt-1">
                  Supports JPEG, PNG, WEBP (Lossless or High Quality)
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Visual Quadtree Overlay Container */}
                <div className="relative rounded-xl overflow-hidden border border-dry_sage-600 bg-dust_grey-900 flex items-center justify-center max-h-[380px]">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-[380px] w-auto object-contain select-none"
                  />
                  {/* Dynamic Quadtree Spatial Grid Lines */}
                  {renderGridLines(quadtreeDepth)}
                </div>

                <div className="flex items-center justify-between text-xs text-pine_teal-300 px-1">
                  <span className="truncate max-w-[280px]">
                    <strong className="text-pine_teal-100">{file?.name}</strong> ({(file?.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl('');
                      setRegisteredResult(null);
                    }}
                    className="text-red-400 hover:text-red-300 underline font-medium"
                  >
                    Remove & choose another
                  </button>
                </div>
              </div>
            )}

            {/* Quadtree Depth Slider */}
            <div className="pt-2 border-t border-dry_sage-600/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-pine_teal-200">Quadtree Partition Depth ($D$):</span>
                <span className="font-mono font-bold text-fern bg-fern/10 px-2 py-0.5 rounded border border-fern/30">
                  Level {quadtreeDepth} ({calculateTotalNodes(quadtreeDepth)} nodes)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                value={quadtreeDepth}
                onChange={(e) => setQuadtreeDepth(parseInt(e.target.value))}
                className="w-full accent-fern cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-pine_teal-400 font-mono">
                <span>D=1 (5 nodes)</span>
                <span>D=2 (21 nodes)</span>
                <span>D=3 (85 nodes - Recommended)</span>
                <span>D=4 (341 nodes)</span>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Signing Key & Action (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-dust_grey-800 border border-dry_sage-600/40 rounded-xl p-5 shadow-sm space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-pine_teal-300 block">
              2. Digital Author Signing Key (RSA-2048)
            </span>

            {/* Author Status */}
            <div>
              <label className="block text-xs font-semibold text-pine_teal-300 mb-1">
                Owner / Author
              </label>
              {activeUser ? (
                <div className="p-2.5 bg-dust_grey-900 border border-dry_sage-600 rounded-lg text-xs flex items-center justify-between">
                  <div>
                    <p className="font-bold text-pine_teal-100">{activeUser.username}</p>
                    <p className="text-[10px] font-mono text-pine_teal-400">{activeUser.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenKeyModal}
                    className="text-[11px] text-dry_sage-400 hover:text-fern underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div
                  onClick={onOpenKeyModal}
                  className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200 cursor-pointer hover:bg-amber-500/20 transition flex items-center gap-2"
                >
                  <FileKey className="w-4 h-4 text-amber-400" />
                  <span>No author identity active. Click to select or generate one.</span>
                </div>
              )}
            </div>

            {/* RSA Private Key Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-pine_teal-300">
                  RSA Private Key (PEM)
                </label>
                <button
                  type="button"
                  onClick={() => keyFileInputRef.current?.click()}
                  className="text-[11px] text-hunter_green-400 hover:text-hunter_green-300 underline"
                >
                  Upload .pem file
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
                rows={6}
                value={privateKeyPem}
                onChange={(e) => setPrivateKeyPem(e.target.value)}
                placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...&#10;-----END PRIVATE KEY-----"
                className="w-full p-2.5 bg-dust_grey-900 border border-dry_sage-600 rounded-lg text-[11px] font-mono text-pine_teal-100 placeholder-pine_teal-400 focus:outline-none focus:border-fern resize-none"
              />
              <p className="text-[10px] text-pine_teal-400">
                Your private key signs the canonical SHA-256 tree hash client-side/in-flight and is never stored on the server.
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={loading || !file || !activeUser}
              className="w-full py-3 bg-fern hover:bg-fern-400 text-dust_grey-900 text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-dust_grey-900 border-t-transparent rounded-full animate-spin" />
                  <span>Partitioning & Signing Quadtree...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-dust_grey-900" />
                  <span>Digitally Sign & Register In Provenance Ledger</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Registration Success Certificate */}
      {registeredResult && (
        <div className="bg-dry_sage-900/60 border border-fern/50 rounded-xl p-6 shadow-md animate-fade-in space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-fern/20 text-fern flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-pine_teal-100">
                Provenance Record Created Successfully!
              </h3>
              <p className="text-xs text-pine_teal-300">
                Image indexed in MongoDB with root pHash in BK-Tree and RSA signature validated.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-dust_grey-800 rounded-lg border border-dry_sage-600/40">
              <span className="text-[10px] text-pine_teal-400 uppercase font-mono block">Registry Record ID</span>
              <span className="font-mono font-bold text-pine_teal-100 truncate block mt-0.5">{registeredResult.id}</span>
            </div>
            <div className="p-3 bg-dust_grey-800 rounded-lg border border-dry_sage-600/40">
              <span className="text-[10px] text-pine_teal-400 uppercase font-mono block">Level-0 Root pHash</span>
              <span className="font-mono font-bold text-fern truncate block mt-0.5">0x{registeredResult.level_0_phash}</span>
            </div>
            <div className="p-3 bg-dust_grey-800 rounded-lg border border-dry_sage-600/40">
              <span className="text-[10px] text-pine_teal-400 uppercase font-mono block">Quadtree Nodes</span>
              <span className="font-mono font-bold text-pine_teal-100 truncate block mt-0.5">
                {registeredResult.total_nodes} nodes (Depth {registeredResult.quadtree_depth})
              </span>
            </div>
            <div className="p-3 bg-dust_grey-800 rounded-lg border border-dry_sage-600/40">
              <span className="text-[10px] text-pine_teal-400 uppercase font-mono block">Original Dimensions</span>
              <span className="font-mono font-bold text-pine_teal-100 truncate block mt-0.5">
                {registeredResult.dimensions.width} × {registeredResult.dimensions.height} px
              </span>
            </div>
          </div>

          {/* Cryptographic Proofs */}
          <div className="space-y-2 pt-2 border-t border-dry_sage-600/30 text-xs">
            <div>
              <div className="flex justify-between items-center text-[11px] text-pine_teal-300 font-mono mb-1">
                <span>CANONICAL QUADTREE SHA-256 HASH</span>
                <button
                  onClick={() => copyToClipboard(registeredResult.serialized_tree_hash, 'tree_hash')}
                  className="flex items-center gap-1 hover:text-pine_teal-100"
                >
                  {copiedField === 'tree_hash' ? <Check className="w-3 h-3 text-fern" /> : <Copy className="w-3 h-3" />}
                  {copiedField === 'tree_hash' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-2 bg-dust_grey-900 rounded font-mono text-[11px] text-dry_sage-400 break-all select-all">
                {registeredResult.serialized_tree_hash}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-[11px] text-pine_teal-300 font-mono mb-1">
                <span>RSA-2048 DIGITAL SIGNATURE (BASE64)</span>
                <button
                  onClick={() => copyToClipboard(registeredResult.rsa_signature_base64, 'signature')}
                  className="flex items-center gap-1 hover:text-pine_teal-100"
                >
                  {copiedField === 'signature' ? <Check className="w-3 h-3 text-fern" /> : <Copy className="w-3 h-3" />}
                  {copiedField === 'signature' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-2 bg-dust_grey-900 rounded font-mono text-[10px] text-pine_teal-400 break-all max-h-16 overflow-y-auto select-all">
                {registeredResult.rsa_signature_base64}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
