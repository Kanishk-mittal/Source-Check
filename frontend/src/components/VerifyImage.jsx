import React, { useState, useRef } from 'react';
import { UploadCloud, Search, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, FileQuestion, ArrowRight, UserCheck } from 'lucide-react';
import { verifyImage } from '../api';
import TamperHeatmap from './TamperHeatmap';

export default function VerifyImage({ registeredImages = [] }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setResult(null);
      setError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith('image/')) {
      setFile(dropped);
      setPreviewUrl(URL.createObjectURL(dropped));
      setResult(null);
      setError('');
    }
  };

  const handleVerify = async () => {
    if (!file) {
      setError('Please select or drop an image to verify.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await verifyImage(file);
      setResult(res);
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const getMatchStatusBadge = (status) => {
    switch (status) {
      case 'exact_match':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-fern/20 text-fern border border-fern/40 rounded-full font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" /> EXACT MATCH (100% Authentic)
          </span>
        );
      case 'natural_variant':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" /> NATURAL VARIANT (Compression / Social Re-encode)
          </span>
        );
      case 'tampered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/40 rounded-full font-bold text-xs">
            <ShieldAlert className="w-4 h-4 text-red-400" /> TAMPERING LOCALIZED
          </span>
        );
      case 'moderate_edit':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> MODERATE EDIT DETECTED
          </span>
        );
      case 'rejected':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-950 text-red-300 border border-red-600 rounded-full font-bold text-xs">
            <XCircle className="w-4 h-4 text-red-400" /> REJECTED (Unregistered / Modified &gt; 15)
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload & Inspect Dropzone */}
      <div className="bg-dust_grey-800 border border-dry_sage-600/40 rounded-xl p-5 shadow-sm space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-pine_teal-300 block">
          Select or Drop Query Image to Verify
        </span>

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
              Drop query image to authenticate
            </p>
            <p className="text-xs text-pine_teal-300 mt-1">
              Test social media downloads, cropped variants, or tampered images
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-dust_grey-900 rounded-xl border border-dry_sage-600/40">
              <div className="flex items-center gap-4">
                <img
                  src={previewUrl}
                  alt="Query thumbnail"
                  className="w-16 h-16 object-cover rounded-lg border border-dry_sage-600"
                />
                <div>
                  <p className="text-sm font-bold text-pine_teal-100">{file?.name}</p>
                  <p className="text-xs text-pine_teal-300">{(file?.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl('');
                    setResult(null);
                  }}
                  className="px-3 py-2 text-xs text-red-400 hover:text-red-300 transition"
                >
                  Choose Another
                </button>
                <button
                  onClick={handleVerify}
                  disabled={loading}
                  className="px-6 py-2.5 bg-fern hover:bg-fern-400 text-dust_grey-900 text-xs font-bold rounded-lg shadow-md transition flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-dust_grey-900 border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Cryptography & Forensics...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Run Forensic Verification</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verification Results Section */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Main Verdict Card */}
          <div className={`p-6 rounded-xl border shadow-md space-y-4 ${
            !result.is_registered
              ? 'bg-red-950/30 border-red-500/60'
              : result.tampered_percentage > 0
              ? 'bg-amber-950/20 border-amber-500/50'
              : 'bg-emerald-950/20 border-fern/60'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  {getMatchStatusBadge(result.match_status)}
                  {result.signature_valid && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-fern/20 text-fern border border-fern/40 rounded-full font-mono text-[11px] font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" /> RSA-2048 SIGNATURE VALID
                    </span>
                  )}
                  {result.is_registered && !result.signature_valid && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full font-mono text-[11px] font-bold">
                      <ShieldAlert className="w-3.5 h-3.5" /> SIGNATURE INVALID
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-pine_teal-100 mt-2">
                  {result.message}
                </h3>
              </div>

              {result.is_registered && (
                <div className="text-right">
                  <span className="text-[10px] text-pine_teal-400 uppercase font-mono block">Tampered Surface Area</span>
                  <span className={`text-2xl font-black font-mono ${
                    result.tampered_percentage > 0 ? 'text-red-400' : 'text-fern'
                  }`}>
                    {result.tampered_percentage}%
                  </span>
                </div>
              )}
            </div>

            {/* Metrics Breakdown Cards */}
            {result.is_registered ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-dry_sage-600/30 text-xs">
                
                {/* Owner Identity */}
                <div className="p-3 bg-dust_grey-800 rounded-lg border border-dry_sage-600/40">
                  <span className="text-[10px] text-pine_teal-400 uppercase font-mono block">Authenticated Owner</span>
                  <div className="flex items-center gap-1.5 mt-0.5 font-bold text-pine_teal-100">
                    <UserCheck className="w-3.5 h-3.5 text-fern" />
                    <span>{result.owner_username}</span>
                  </div>
                  <span className="text-[10px] font-mono text-pine_teal-400 truncate block mt-0.5">
                    ID: {result.owner_id}
                  </span>
                </div>

                {/* Root pHash Distance */}
                <div className="p-3 bg-dust_grey-800 rounded-lg border border-dry_sage-600/40">
                  <span className="text-[10px] text-pine_teal-400 uppercase font-mono block">Root Hamming Distance</span>
                  <span className="text-base font-black font-mono text-dry_sage-300 block mt-0.5">
                    {result.root_hamming_distance} bits
                  </span>
                  <span className="text-[10px] text-pine_teal-400 block">
                    {result.root_hamming_distance <= 4 ? 'Within Natural Variance (<=4)' : 'Requires Quadtree Drill-Down'}
                  </span>
                </div>

                {/* Tampered Quadrants Localized */}
                <div className="p-3 bg-dust_grey-800 rounded-lg border border-dry_sage-600/40">
                  <span className="text-[10px] text-pine_teal-400 uppercase font-mono block">Tampered Sectors Found</span>
                  <span className="text-base font-black font-mono text-red-400 block mt-0.5">
                    {result.tampered_bounding_boxes.length} sectors
                  </span>
                  <span className="text-[10px] text-pine_teal-400 block">
                    Pinpointed via recursive drill-down
                  </span>
                </div>

                {/* Master Record Link */}
                <div className="p-3 bg-dust_grey-800 rounded-lg border border-dry_sage-600/40">
                  <span className="text-[10px] text-pine_teal-400 uppercase font-mono block">Matched Master File</span>
                  <span className="font-bold text-pine_teal-100 truncate block mt-0.5">
                    {result.registered_filename}
                  </span>
                  <span className="text-[10px] font-mono text-pine_teal-400 truncate block">
                    {result.dimensions?.width}×{result.dimensions?.height} px
                  </span>
                </div>

              </div>
            ) : (
              <div className="p-4 bg-dust_grey-900 rounded-lg text-xs space-y-2">
                <p className="font-bold text-red-300">Candidate Rejection Explanation:</p>
                <p className="text-pine_teal-200">{result.rejection_reason}</p>
                <div className="text-[11px] text-pine_teal-400 font-mono">
                  Calculated Hamming Distance: {result.root_hamming_distance ?? '>15'} bits (Threshold: &le; 15)
                </div>
              </div>
            )}
          </div>

          {/* Tamper Heatmap Viewer (Only when image is registered) */}
          {result.is_registered && (
            <TamperHeatmap
              queryImageSrc={previewUrl}
              registeredImageId={result.registered_image_id}
              tamperedBoxes={result.tampered_bounding_boxes}
              dimensions={result.dimensions}
              drilldownNodes={result.drilldown_nodes}
            />
          )}

        </div>
      )}

    </div>
  );
}
