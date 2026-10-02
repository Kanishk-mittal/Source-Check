import React from 'react';
import { KeyRound, Image as ImageIcon, Search, Database, User } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, onOpenKeyModal, activeUser, stats }) {
  const tabs = [
    { id: 'register', label: 'Register Image', icon: ImageIcon },
    { id: 'verify', label: 'Forensic Verification', icon: Search },
    { id: 'ledger', label: 'Registry Ledger', icon: Database },
  ];

  return (
    <header className="bg-pine_teal text-dust_grey-800 border-b border-pine_teal-600/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-dust_grey-800">
                  Source Check
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-pine_teal-900/60 p-1.5 rounded-xl border border-pine_teal-400/20">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${isActive
                      ? 'bg-fern text-white shadow-md'
                      : 'text-dust_grey-500 hover:text-dust_grey-800 hover:bg-pine_teal-800/50'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-dry_sage-600' : 'text-dust_grey-500'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* User & Key Management */}
          <div className="flex items-center gap-3">
            {stats && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-pine_teal-900/40 border border-dry_sage/20 rounded-lg text-[11px] font-mono text-dust_grey-500">
                <span className="inline-block w-2 h-2 rounded-full bg-dry_sage animate-pulse"></span>
                <span>BK-Tree: {stats.registered_images_count} indexed</span>
              </div>
            )}

            <button
              onClick={onOpenKeyModal}
              className="flex items-center gap-2 px-3.5 py-2 bg-hunter_green hover:bg-hunter_green-400 text-dust_grey-800 text-xs font-bold rounded-lg border border-dry_sage shadow-sm transition group"
            >
              <KeyRound className="w-4 h-4 text-dry_sage group-hover:rotate-12 transition-transform" />
              {activeUser ? (
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-dry_sage" />
                  <span className="max-w-[100px] truncate">{activeUser.username}</span>
                </span>
              ) : (
                'Identity / RSA Keys'
              )}
            </button>
          </div>

        </div>

        {/* Mobile Nav */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-pine_teal-600/30">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${isActive ? 'bg-fern text-white' : 'text-dust_grey-500'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}
