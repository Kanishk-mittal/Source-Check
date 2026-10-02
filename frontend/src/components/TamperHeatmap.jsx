import React, { useState, useRef, useEffect } from 'react';
import { Eye, Layers, ZoomIn, Info, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';
import { getImageFileUrl } from '../api';

export default function TamperHeatmap({
  queryImageSrc,
  registeredImageId,
  tamperedBoxes = [],
  dimensions,
  drilldownNodes = []
}) {
  const [selectedBox, setSelectedBox] = useState(null);
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side' | 'query' | 'registered'
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showAllNodes, setShowAllNodes] = useState(false);

  // Fallback dimensions if not provided
  const imgWidth = dimensions?.width || 800;
  const imgHeight = dimensions?.height || 600;

  const registeredUrl = registeredImageId ? getImageFileUrl(registeredImageId) : null;

  return (
    <div className="bg-dust_grey-800 border border-dry_sage-600/40 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-dry_sage-600/30">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-fern" />
          <h4 className="text-sm font-bold text-pine_teal-100">
            Forensic Tamper Heatmap & Spatial Localization
          </h4>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-dust_grey-900 p-1 rounded-lg border border-dry_sage-600/50 flex">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-2.5 py-1 rounded font-semibold transition ${
                viewMode === 'side-by-side' ? 'bg-fern text-white' : 'text-pine_teal-300 hover:text-pine_teal-100'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setViewMode('query')}
              className={`px-2.5 py-1 rounded font-semibold transition ${
                viewMode === 'query' ? 'bg-fern text-white' : 'text-pine_teal-300 hover:text-pine_teal-100'
              }`}
            >
              Query Image
            </button>
            {registeredUrl && (
              <button
                onClick={() => setViewMode('registered')}
                className={`px-2.5 py-1 rounded font-semibold transition ${
                  viewMode === 'registered' ? 'bg-fern text-white' : 'text-pine_teal-300 hover:text-pine_teal-100'
                }`}
              >
                Registered Master
              </button>
            )}
          </div>

          <label className="flex items-center gap-1.5 px-2 py-1 bg-dust_grey-900 rounded-lg border border-dry_sage-600/40 text-pine_teal-200 cursor-pointer">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="accent-red-500 rounded"
            />
            <span>Tamper Overlay</span>
          </label>
        </div>
      </div>

      {/* Main Image Viewer Area */}
      <div className={`grid gap-4 ${viewMode === 'side-by-side' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* Query Image with Heatmap Overlay */}
        {(viewMode === 'side-by-side' || viewMode === 'query') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-pine_teal-300">
              <span className="font-bold text-pine_teal-100">Query Image (Inspected)</span>
              <span className="font-mono text-[10px] text-red-400">
                {tamperedBoxes.length} Tampered Quadrant{tamperedBoxes.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-dry_sage-600 bg-dust_grey-900 flex items-center justify-center max-h-[460px] group">
              <img
                src={queryImageSrc}
                alt="Query under test"
                className="max-h-[460px] w-full object-contain select-none"
              />

              {/* SVG Heatmap Overlay scaled to natural dimensions */}
              {showHeatmap && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${imgWidth} ${imgHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {tamperedBoxes.map((box, idx) => {
                    const isSelected = selectedBox?.quadrant_path === box.quadrant_path;
                    return (
                      <g key={idx} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedBox(box)}>
                        <rect
                          x={box.bounds.x}
                          y={box.bounds.y}
                          width={box.bounds.w}
                          height={box.bounds.h}
                          fill="rgba(239, 68, 68, 0.35)"
                          stroke={isSelected ? '#ffffff' : '#ef4444'}
                          strokeWidth={isSelected ? 3 : 2}
                          strokeDasharray={isSelected ? 'none' : '4 2'}
                          className="transition-all hover:fill-red-500/50"
                        />
                        {/* Label */}
                        <rect
                          x={box.bounds.x + 4}
                          y={box.bounds.y + 4}
                          width={Math.min(95, box.bounds.w - 8)}
                          height={20}
                          rx={4}
                          fill="rgba(0, 0, 0, 0.75)"
                        />
                        <text
                          x={box.bounds.x + 8}
                          y={box.bounds.y + 18}
                          fill="#f87171"
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          Δ={box.hamming_distance} ({box.quadrant_path.replace('root.', '')})
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Registered Master Image */}
        {(viewMode === 'side-by-side' || viewMode === 'registered') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-pine_teal-300">
              <span className="font-bold text-pine_teal-100">Registered Provenance Master</span>
              <span className="font-mono text-[10px] text-fern font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Authenticated Baseline
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-dry_sage-600 bg-dust_grey-900 flex items-center justify-center max-h-[460px]">
              {registeredUrl ? (
                <img
                  src={registeredUrl}
                  alt="Registered original"
                  className="max-h-[460px] w-full object-contain select-none"
                />
              ) : (
                <div className="p-12 text-center text-xs text-pine_teal-300">
                  Registered master preview unavailable
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Selected Box Inspector Panel */}
      {selectedBox && (
        <div className="p-3 bg-red-950/30 border border-red-500/40 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="font-bold text-red-300">
              Selected Sector: <span className="font-mono">{selectedBox.quadrant_path}</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-pine_teal-200 font-mono text-[11px]">
            <span>Level: {selectedBox.level}</span>
            <span>Hamming Distance: <strong className="text-red-400">{selectedBox.hamming_distance} bits</strong></span>
            <span>Bounds: [x:{selectedBox.bounds.x}, y:{selectedBox.bounds.y}, w:{selectedBox.bounds.w}, h:{selectedBox.bounds.h}]</span>
          </div>
          <button
            onClick={() => setSelectedBox(null)}
            className="text-[11px] text-pine_teal-300 hover:text-white underline"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Heatmap Legend */}
      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-dry_sage-600/30 text-[11px] text-pine_teal-300">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-red-500/40 border border-red-500 rounded"></span>
            <span>Tampered Sub-Quadrant (Distance &gt; 3)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-fern/30 border border-fern rounded"></span>
            <span>Authentic Sub-Tree (Pruned early via $O(\log N)$)</span>
          </div>
        </div>
        <p className="italic">
          Tip: Click on any red bounding box to view exact quadrant metrics.
        </p>
      </div>

    </div>
  );
}
