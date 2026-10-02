import React, { useState } from 'react';
import { Database, ShieldCheck, KeyRound, ExternalLink, Layers, PlusCircle, UploadCloud, X, Filter } from 'lucide-react';
import { getImageFileUrl, getImageDetails } from '../api';

export default function MyImages({
  registeredImages = [],
  activeUser,
  onNavigateToUpload,
}) {
  const [filterMode, setFilterMode] = useState('mine'); // 'mine' | 'all'
  const [selectedImage, setSelectedImage] = useState(null);
  const [detailedDoc, setDetailedDoc] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Filter images: default to currently authenticated user's images
  const myImagesList = registeredImages.filter(
    (img) => activeUser?.id && (img.owner_id === activeUser.id || img.owner_username === activeUser.username)
  );

  const displayedImages = filterMode === 'mine' ? myImagesList : registeredImages;

  const handleInspect = async (img) => {
    setSelectedImage(img);
    setLoadingDetail(true);
    try {
      const doc = await getImageDetails(img.id);
      setDetailedDoc(doc);
    } catch (err) {
      console.error('Failed to load image details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Intro Header Banner */}
      <div className="bg-dry_sage-900 border border-dry_sage-600/40 rounded-xl p-6 text-pine_teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-pine_teal-100 flex items-center gap-2">
            <Database className="w-6 h-6 text-fern" />
            My Registered Images
          </h2>
          <p className="text-xs text-pine_teal-300 mt-1 max-w-xl">
            Cryptographic provenance records authored by <strong className="text-fern font-bold">{activeUser?.username}</strong>. Each record binds your RSA-2048 identity to a deterministic Quadtree pHash digest.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter toggle: Mine vs All */}
          <div className="bg-dust_grey-900 p-1 rounded-lg border border-dry_sage-600/50 flex text-xs">
            <button
              onClick={() => setFilterMode('mine')}
              className={`px-3 py-1.5 rounded font-bold transition ${
                filterMode === 'mine' ? 'bg-fern text-white shadow-sm' : 'text-pine_teal-300 hover:text-pine_teal-100'
              }`}
            >
              My Images ({myImagesList.length})
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded font-bold transition ${
                filterMode === 'all' ? 'bg-fern text-white shadow-sm' : 'text-pine_teal-300 hover:text-pine_teal-100'
              }`}
            >
              All Registry ({registeredImages.length})
            </button>
          </div>

          <button
            onClick={onNavigateToUpload}
            className="flex items-center gap-1.5 px-4 py-2 bg-fern hover:bg-fern-400 text-dust_grey-900 text-xs font-bold rounded-lg shadow-md transition whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Upload New Image</span>
          </button>
        </div>
      </div>

      {/* Images Grid with Bottom Upload Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedImages.map((img) => (
          <div
            key={img.id}
            className="bg-dust_grey-800 border border-dry_sage-600/40 rounded-xl overflow-hidden shadow-sm hover:border-fern transition-all flex flex-col justify-between group"
          >
            <div>
              {/* Thumbnail Header */}
              <div className="relative h-48 bg-dust_grey-900 border-b border-dry_sage-600/30 flex items-center justify-center overflow-hidden">
                <img
                  src={getImageFileUrl(img.id)}
                  alt={img.filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-dust_grey-900/90 backdrop-blur-sm rounded text-[10px] font-mono font-bold text-fern border border-fern/40">
                  Depth {img.quadtree_depth} ({img.total_nodes} nodes)
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-dust_grey-900/90 backdrop-blur-sm rounded text-[10px] font-mono text-pine_teal-200">
                  {img.dimensions.width}×{img.dimensions.height}
                </div>
              </div>

              {/* Body Content */}
              <div className="p-4 space-y-3 text-xs">
                <div>
                  <h4 className="font-bold text-pine_teal-100 text-sm truncate" title={img.filename}>
                    {img.filename}
                  </h4>
                  <p className="text-[11px] text-pine_teal-300">
                    Author: <strong className="text-fern">{img.owner_username}</strong>
                  </p>
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center bg-dust_grey-900 p-1.5 rounded border border-dry_sage-600/30">
                    <span className="text-pine_teal-400 text-[10px]">ROOT pHASH:</span>
                    <span className="text-fern font-bold">0x{img.level_0_phash}</span>
                  </div>

                  <div className="bg-dust_grey-900 p-1.5 rounded border border-dry_sage-600/30">
                    <span className="text-pine_teal-400 text-[10px] block">TREE SHA-256:</span>
                    <span className="text-dry_sage-300 text-[10px] truncate block">
                      {img.serialized_tree_hash}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 pt-0 border-t border-dry_sage-600/30 flex items-center justify-between gap-2 mt-2">
              <button
                onClick={() => handleInspect(img)}
                className="px-3 py-1.5 bg-dust_grey-900 hover:bg-dust_grey-700 text-pine_teal-100 rounded-lg text-xs font-semibold border border-dry_sage-600/40 transition flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-fern" />
                Inspect Tree
              </button>

              <a
                href={getImageFileUrl(img.id)}
                target="_blank"
                rel="noreferrer"
                title="View Original File"
                className="p-1.5 bg-dust_grey-900 hover:bg-dust_grey-700 text-pine_teal-300 rounded-lg border border-dry_sage-600/40 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}

        {/* BOTTOM CARD: Same size as image cards to upload new image */}
        <div
          onClick={onNavigateToUpload}
          className="border-2 border-dashed border-dry_sage-500/60 hover:border-fern hover:bg-dust_grey-800/80 bg-dust_grey-900/60 rounded-xl min-h-[340px] flex flex-col items-center justify-center text-center p-6 cursor-pointer transition group shadow-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-fern/20 text-fern flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-9 h-9" />
          </div>
          <h4 className="font-bold text-pine_teal-100 text-base group-hover:text-fern transition-colors">
            Upload New Image
          </h4>
          <p className="text-xs text-pine_teal-300 mt-1 max-w-xs">
            Generate hierarchical Quadtree pHash and sign with RSA Private Key
          </p>
          <span className="mt-4 px-3.5 py-1.5 bg-dust_grey-800 border border-dry_sage-600/60 rounded-lg text-[11px] font-bold text-fern group-hover:bg-fern group-hover:text-dust_grey-900 transition-colors">
            + Select Image File
          </span>
        </div>
      </div>

      {/* Inspect Tree Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pine_teal-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-dust_grey-800 border border-dry_sage-600 rounded-xl shadow-2xl max-w-3xl w-full p-6 text-pine_teal-100 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => {
                setSelectedImage(null);
                setDetailedDoc(null);
              }}
              className="absolute top-4 right-4 text-pine_teal-400 hover:text-pine_teal-100 p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-fern/20 text-fern rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-pine_teal-100">
                  Quadtree Forensic Specification & Proof
                </h3>
                <p className="text-xs text-pine_teal-300">
                  {selectedImage.filename} &bull; Registered by {selectedImage.owner_username}
                </p>
              </div>
            </div>

            {loadingDetail ? (
              <div className="p-12 text-center text-xs text-pine_teal-300 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-fern border-t-transparent rounded-full animate-spin" />
                <span>Loading Quadtree nodes from MongoDB...</span>
              </div>
            ) : detailedDoc ? (
              <div className="overflow-y-auto space-y-4 pr-1 text-xs">
                {/* Meta details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                  <div className="p-2 bg-dust_grey-900 rounded border border-dry_sage-600/40">
                    <span className="text-[10px] text-pine_teal-400 block">RECORD ID:</span>
                    <span className="truncate block font-bold">{detailedDoc.id}</span>
                  </div>
                  <div className="p-2 bg-dust_grey-900 rounded border border-dry_sage-600/40">
                    <span className="text-[10px] text-pine_teal-400 block">DEPTH / NODES:</span>
                    <span className="truncate block font-bold">D={detailedDoc.quadtree_depth} ({detailedDoc.quadtree_nodes?.length} nodes)</span>
                  </div>
                  <div className="p-2 bg-dust_grey-900 rounded border border-dry_sage-600/40">
                    <span className="text-[10px] text-pine_teal-400 block">DIMENSIONS:</span>
                    <span className="truncate block font-bold">{detailedDoc.dimensions.width}×{detailedDoc.dimensions.height}</span>
                  </div>
                  <div className="p-2 bg-dust_grey-900 rounded border border-dry_sage-600/40">
                    <span className="text-[10px] text-pine_teal-400 block">ROOT pHASH:</span>
                    <span className="truncate block font-bold text-fern">0x{detailedDoc.level_0_phash}</span>
                  </div>
                </div>

                {/* Nodes List */}
                <div>
                  <h5 className="font-bold text-pine_teal-200 mb-1.5 flex items-center justify-between">
                    <span>Hierarchical Quadtree Nodes ({detailedDoc.quadtree_nodes?.length})</span>
                    <span className="text-[10px] font-mono text-pine_teal-400">Canonical deterministic order</span>
                  </h5>
                  <div className="max-h-60 overflow-y-auto border border-dry_sage-600/40 rounded-lg">
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead className="bg-dust_grey-900 text-pine_teal-300 sticky top-0 border-b border-dry_sage-600/40">
                        <tr>
                          <th className="p-2">Path</th>
                          <th className="p-2">Level</th>
                          <th className="p-2">Bounds [x,y,w,h]</th>
                          <th className="p-2">64-bit pHash</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dry_sage-600/20 text-pine_teal-200">
                        {detailedDoc.quadtree_nodes?.map((node, idx) => (
                          <tr key={idx} className="hover:bg-dust_grey-900/40">
                            <td className="p-2 font-bold text-pine_teal-100">{node.quadrant_path}</td>
                            <td className="p-2 text-pine_teal-300">{node.level}</td>
                            <td className="p-2 text-pine_teal-400">
                              [{node.bounds.x},{node.bounds.y},{node.bounds.w},{node.bounds.h}]
                            </td>
                            <td className="p-2 text-fern">0x{node.phash}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cryptographic Signature */}
                <div className="p-3 bg-dust_grey-900 rounded-lg border border-dry_sage-600/40 space-y-1 font-mono text-[11px]">
                  <span className="text-pine_teal-400 text-[10px] block font-bold">RSA DIGITAL SIGNATURE (PKCS#1 v1.5 / SHA-256)</span>
                  <div className="max-h-16 overflow-y-auto text-dry_sage-300 break-all select-all text-[10px]">
                    {detailedDoc.rsa_signature_base64}
                  </div>
                </div>

              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}
