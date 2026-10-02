import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import KeyModal from './components/KeyModal';
import RegisterImage from './components/RegisterImage';
import VerifyImage from './components/VerifyImage';
import RegistryExplorer from './components/RegistryExplorer';
import { listUsers, listImages, getStats } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('register');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [activePrivateKey, setActivePrivateKey] = useState('');
  const [registeredImages, setRegisteredImages] = useState([]);
  const [stats, setStats] = useState(null);

  // Load initial users, images, and stats
  const fetchData = async () => {
    try {
      const [usersData, imagesData, statsData] = await Promise.all([
        listUsers().catch(() => []),
        listImages().catch(() => []),
        getStats().catch(() => null),
      ]);
      setUsers(usersData);
      setRegisteredImages(imagesData);
      setStats(statsData);

      // Auto-select first user if none selected
      if (!activeUser && usersData.length > 0) {
        setActiveUser(usersData[0]);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUserCreated = (newUser, privateKeyPem) => {
    setUsers((prev) => [newUser, ...prev]);
    setActiveUser(newUser);
    setActivePrivateKey(privateKeyPem);
  };

  const handleSelectUser = (user) => {
    setActiveUser(user);
    // Clear private key if switching to another user so user enters/uploads their own key
    if (user.id !== activeUser?.id) {
      setActivePrivateKey('');
    }
  };

  const handleImageRegistered = (newRecord) => {
    setRegisteredImages((prev) => [newRecord, ...prev]);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-dust_grey-900 flex flex-col font-sans">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        activeUser={activeUser}
        stats={stats}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'register' && (
          <RegisterImage
            activeUser={activeUser}
            activePrivateKey={activePrivateKey}
            onImageRegistered={handleImageRegistered}
            onOpenKeyModal={() => setIsKeyModalOpen(true)}
          />
        )}

        {activeTab === 'verify' && (
          <VerifyImage
            registeredImages={registeredImages}
          />
        )}

        {activeTab === 'ledger' && (
          <RegistryExplorer
            registeredImages={registeredImages}
            onSelectForVerify={() => setActiveTab('verify')}
          />
        )}
      </main>

      {/* RSA Key Management Modal */}
      <KeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onUserCreated={handleUserCreated}
        users={users}
        activeUser={activeUser}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
}
