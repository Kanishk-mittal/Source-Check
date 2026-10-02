import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import RegisterImage from './components/RegisterImage';
import VerifyImage from './components/VerifyImage';
import MyImages from './components/MyImages';
import { listImages, getStats } from './api';
import { deleteVaultKey } from './services/vault';

export default function App() {
  // Authentication state: check sessionStorage for existing session
  const [activeUser, setActiveUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('provenance_active_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = !!activeUser;

  // View state: 'verify' | 'my_images' | 'register_image'
  // Unauthenticated users ALWAYS default to 'verify'. Authenticated users default to 'my_images'.
  const [currentView, setCurrentView] = useState(() => {
    const stored = sessionStorage.getItem('provenance_active_user');
    return stored ? 'my_images' : 'verify';
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [registeredImages, setRegisteredImages] = useState([]);
  const [stats, setStats] = useState(null);

  const fetchRegistryData = async () => {
    try {
      const [imagesData, statsData] = await Promise.all([
        listImages().catch(() => []),
        getStats().catch(() => null),
      ]);
      setRegisteredImages(imagesData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load registry data:', err);
    }
  };

  useEffect(() => {
    fetchRegistryData();
  }, []);

  const handleAuthSuccess = (user, vaultSaved) => {
    const userWithVault = { ...user, isRemembered: !!vaultSaved };
    setActiveUser(userWithVault);
    sessionStorage.setItem('provenance_active_user', JSON.stringify(userWithVault));
    setCurrentView('my_images');
    setIsAuthModalOpen(false);
    fetchRegistryData();
  };

  const handleLogout = async () => {
    if (activeUser?.id) {
      try {
        await deleteVaultKey(activeUser.id);
      } catch (err) {
        console.error('Error clearing vault on logout:', err);
      }
    }
    setActiveUser(null);
    sessionStorage.removeItem('provenance_active_user');
    setCurrentView('verify');
  };

  const handleImageRegistered = (newRecord) => {
    setRegisteredImages((prev) => [newRecord, ...prev]);
    fetchRegistryData();
  };

  return (
    <div className="min-h-screen bg-dust_grey-900 flex flex-col font-sans">
      
      {/* Dynamic Header */}
      <Header
        isAuthenticated={isAuthenticated}
        activeUser={activeUser}
        currentView={currentView}
        onNavigateHome={() => setCurrentView(isAuthenticated ? 'my_images' : 'verify')}
        onNavigateVerify={() => setCurrentView('verify')}
        onNavigateUpload={() => setCurrentView('register_image')}
        onOpenAuthModal={() => {
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        stats={stats}
      />

      {/* Main App Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* 1. PUBLIC / FORENSIC VERIFICATION VIEW */}
        {currentView === 'verify' && (
          <VerifyImage
            registeredImages={registeredImages}
          />
        )}

        {/* 2. AUTHENTICATED "MY IMAGES" DASHBOARD VIEW */}
        {currentView === 'my_images' && isAuthenticated && (
          <MyImages
            registeredImages={registeredImages}
            activeUser={activeUser}
            onNavigateToUpload={() => setCurrentView('register_image')}
          />
        )}

        {/* 3. UPLOAD / REGISTER IMAGE VIEW */}
        {currentView === 'register_image' && isAuthenticated && (
          <RegisterImage
            activeUser={activeUser}
            onImageRegistered={handleImageRegistered}
            onBackToMyImages={() => setCurrentView('my_images')}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Auth Modal (Login / Register / Remember Me Vault) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Footer */}
      <footer className="bg-pine_teal-900 border-t border-pine_teal-700/50 py-6 text-center text-xs text-dust_grey-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Quadtree pHash & RSA Provenance Registry &bull; Earth-tone Forensic Suite</span>
          <span>FastAPI 3.14 &bull; MongoDB &bull; Web Crypto &bull; Vite</span>
        </div>
      </footer>
    </div>
  );
}
