import React, { useState, useEffect } from 'react';
import { Tab } from './types';
import { initDatabase } from './utils/database';
import Header from './components/Header';
import TabNavigation from './components/TabNavigation';
import HomeTab from './components/HomeTab';
import WeightTab from './components/WeightTab';
import PhotosTab from './components/PhotosTab';
import SettingsTab from './components/SettingsTab';
import HealthCheckModal from './components/HealthCheckModal';
import './App.css';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isHealthCheckModalOpen, setIsHealthCheckModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const initApp = async () => {
      await initDatabase();
      // Register service worker
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('./sw.js');
          console.log('ServiceWorker registration successful');
        } catch (err) {
          console.log('ServiceWorker registration failed');
        }
      }
    };

    initApp();
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  const handleDataChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const openHealthCheck = () => {
    setIsHealthCheckModalOpen(true);
  };

  const closeHealthCheck = () => {
    setIsHealthCheckModalOpen(false);
  };

  return (
    <div className="app-container">
      <Header />
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      
      <main className="app-main">
        <div className={`tab-content ${activeTab === 'home' ? 'active' : ''}`}>
          {activeTab === 'home' && (
            <HomeTab 
              onTabChange={handleTabChange} 
              onHealthCheck={openHealthCheck}
              refreshTrigger={refreshTrigger}
            />
          )}
        </div>
        
        <div className={`tab-content ${activeTab === 'weight' ? 'active' : ''}`}>
          {activeTab === 'weight' && (
            <WeightTab 
              onDataChange={handleDataChange}
              refreshTrigger={refreshTrigger}
            />
          )}
        </div>
        
        <div className={`tab-content ${activeTab === 'photos' ? 'active' : ''}`}>
          {activeTab === 'photos' && (
            <PhotosTab 
              onDataChange={handleDataChange}
              refreshTrigger={refreshTrigger}
            />
          )}
        </div>
        
        <div className={`tab-content ${activeTab === 'settings' ? 'active' : ''}`}>
          {activeTab === 'settings' && (
            <SettingsTab 
              onDataChange={handleDataChange}
              refreshTrigger={refreshTrigger}
            />
          )}
        </div>
      </main>

      {isHealthCheckModalOpen && (
        <HealthCheckModal 
          isOpen={isHealthCheckModalOpen} 
          onClose={closeHealthCheck} 
        />
      )}
    </div>
  );
};

export default App;