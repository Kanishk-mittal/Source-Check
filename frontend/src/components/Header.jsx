import React from 'react';
import { ShieldCheck, PlusCircle, Search, LogOut, LogIn, User, Sparkles } from 'lucide-react';

export default function Header({
  isAuthenticated,
  activeUser,
  currentView,
  onNavigateHome,
  onNavigateVerify,
  onNavigateUpload,
  onOpenAuthModal,
  onLogout,
  stats
}) {
  return (
    <header className="bg-pine_teal text-dust_grey-800 border-b border-pine_teal-600/50 shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & App Title: Clicking navigates to My Images (or Verify if unauthenticated) */}
          <div
            onClick={onNavigateHome}
            className="flex items-center gap-3.5 cursor-pointer group select-none"
            title={isAuthenticated ? 'Go to My Images' : 'Home'}
          >
            <div className="w-11 h-11 rounded-xl bg-hunter_green flex items-center justify-center border border-dry_sage shadow-inner group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 text-dry_sage" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-dust_grey-800 group-hover:text-white transition-colors">
                  QUADTREE FORENSICS
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-hunter_green/80 text-dry_sage rounded-full border border-dry_sage/30">
                  pHash + RSA
                </span>
              </div>
              <p className="text-xs text-dust_grey-500 font-medium">
                Cryptographic Multimedia Provenance & Tamper Localization
              </p>
            </div>
          </div>

          {/* Right Action Header Buttons */}
          <div className="flex items-center gap-3">
            
            {/* If UNAUTHENTICATED: Simple, prominent Login / Register button */}
            {!isAuthenticated ? (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-2 px-5 py-2.5 bg-hunter_green hover:bg-hunter_green-400 text-dust_grey-800 hover:text-white text-xs font-bold rounded-xl border border-dry_sage shadow-md transition-all transform hover:-translate-y-0.5"
              >
                <LogIn className="w-4 h-4 text-dry_sage" />
                <span>Login / Register</span>
              </button>
            ) : (
              /* If AUTHENTICATED: Verify Image, + Upload Image, User chip, and Logout button */
              <div className="flex items-center gap-2 sm:gap-3">
                
                {/* Verify Button (allows logged-in author to switch to verify query images) */}
                <button
                  onClick={onNavigateVerify}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${
                    currentView === 'verify'
                      ? 'bg-fern text-white shadow'
                      : 'text-dust_grey-500 hover:text-dust_grey-800 hover:bg-pine_teal-800/60'
                  }`}
                  title="Verify Query Image"
                >
                  <Search className="w-4 h-4 text-dry_sage" />
                  <span className="hidden sm:inline">Verify Image</span>
                </button>

                {/* + Add New Image Button */}
                <button
                  onClick={onNavigateUpload}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-sm ${
                    currentView === 'register_image'
                      ? 'bg-fern text-white'
                      : 'bg-hunter_green hover:bg-hunter_green-400 text-dust_grey-800 border border-dry_sage'
                  }`}
                  title="Upload & Sign New Image"
                >
                  <PlusCircle className="w-4 h-4 text-dry_sage" />
                  <span>+ Add New Image</span>
                </button>

                {/* User Identity Chip */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-pine_teal-900/60 border border-dry_sage/30 rounded-lg text-xs font-mono text-dust_grey-800">
                  <User className="w-3.5 h-3.5 text-fern" />
                  <span className="max-w-[120px] truncate font-bold text-dry_sage">{activeUser?.username}</span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-950/60 hover:bg-red-900 text-red-200 text-xs font-bold rounded-lg border border-red-500/40 shadow-sm transition"
                  title="Sign out of author session"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-300" />
                  <span className="hidden sm:inline">Logout</span>
                </button>

              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
