import React, { useState } from 'react';
import { GitBranch, ChevronDown, ChevronRight, CheckCircle2, AlertOctagon, Scissors } from 'lucide-react';

export default function DrilldownTrace({ nodes = [] }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'tampered' | 'pruned'

  const filteredNodes = nodes.filter((n) => {
    if (filter === 'tampered') return n.is_tampered;
    if (filter === 'pruned') return n.pruned;
    return true;
  });

  return (
    <div className="bg-dust_grey-800 border border-dry_sage-600/40 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-dry_sage-600/30">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-fern" />
          <div>
            <h4 className="text-sm font-bold text-pine_teal-100">
              Top-Down Quadtree Pruning Trace ($O(\log N)$ Complexity)
            </h4>
            <p className="text-[11px] text-pine_teal-300">
              Sub-trees with Hamming distance $\le 3$ are pruned immediately, skipping unnecessary leaf comparisons.
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex bg-dust_grey-900 p-1 rounded-lg border border-dry_sage-600/50 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded font-semibold transition ${
              filter === 'all' ? 'bg-fern text-white' : 'text-pine_teal-300 hover:text-pine_teal-100'
            }`}
          >
            All Traversed ({nodes.length})
          </button>
          <button
            onClick={() => setFilter('tampered')}
            className={`px-2.5 py-1 rounded font-semibold transition ${
              filter === 'tampered' ? 'bg-red-500 text-white' : 'text-pine_teal-300 hover:text-pine_teal-100'
            }`}
          >
            Tampered ({nodes.filter(n => n.is_tampered).length})
          </button>
          <button
            onClick={() => setFilter('pruned')}
            className={`px-2.5 py-1 rounded font-semibold transition ${
              filter === 'pruned' ? 'bg-hunter_green text-white' : 'text-pine_teal-300 hover:text-pine_teal-100'
            }`}
          >
            Pruned / Authentic ({nodes.filter(n => n.pruned).length})
          </button>
        </div>
      </div>

      {/* Nodes Table */}
      <div className="max-h-72 overflow-y-auto border border-dry_sage-600/40 rounded-lg">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-dust_grey-900 text-pine_teal-300 sticky top-0 border-b border-dry_sage-600/40">
            <tr>
              <th className="p-2.5">Quadrant Path</th>
              <th className="p-2.5">Level</th>
              <th className="p-2.5">Stored pHash</th>
              <th className="p-2.5">Query pHash</th>
              <th className="p-2.5">Hamming Dist</th>
              <th className="p-2.5">Verdict / Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dry_sage-600/20 text-pine_teal-200">
            {filteredNodes.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-pine_teal-300 italic">
                  No nodes match selected filter.
                </td>
              </tr>
            ) : (
              filteredNodes.map((n, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-dust_grey-900/40 transition ${
                    n.is_tampered ? 'bg-red-950/20' : n.pruned ? 'bg-emerald-950/10' : ''
                  }`}
                >
                  <td className="p-2.5 font-bold text-pine_teal-100 flex items-center gap-1.5">
                    <span className="text-pine_teal-400">{'—'.repeat(n.level)}</span>
                    <span>{n.quadrant_path}</span>
                  </td>
                  <td className="p-2.5 text-pine_teal-300">{n.level}</td>
                  <td className="p-2.5 text-dry_sage-300">0x{n.stored_phash}</td>
                  <td className="p-2.5 text-dry_sage-300">0x{n.query_phash}</td>
                  <td className="p-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        n.hamming_distance > 3
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-fern/20 text-fern border border-fern/30'
                      }`}
                    >
                      {n.hamming_distance}
                    </span>
                  </td>
                  <td className="p-2.5">
                    {n.pruned ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-fern font-bold">
                        <Scissors className="w-3.5 h-3.5 text-fern" /> Pruned (Authentic)
                      </span>
                    ) : n.is_tampered ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-red-400 font-bold">
                        <AlertOctagon className="w-3.5 h-3.5 text-red-400" /> Tampered (Drill Down)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-dry_sage-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-dry_sage-300" /> Root / Neutral
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
