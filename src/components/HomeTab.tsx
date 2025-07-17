import React, { useState, useEffect } from 'react';
import { Tab, WeightEntry, PhotoEntry } from '../types';
import { getStorageData } from '../utils/database';

interface HomeTabProps {
  onTabChange: (tab: Tab) => void;
  onHealthCheck: () => void;
  refreshTrigger: number;
}

const HomeTab: React.FC<HomeTabProps> = ({ onTabChange, onHealthCheck, refreshTrigger }) => {
  const [recentEntries, setRecentEntries] = useState<string[]>([]);

  useEffect(() => {
    const loadRecentEntries = async () => {
      const weights = await getStorageData<WeightEntry>('weights');
      const photos = await getStorageData<PhotoEntry>('photos');
      
      const allEntries = [
        ...weights.map(w => ({ ...w, entryType: 'weight' as const })),
        ...photos.map(p => ({ ...p, entryType: 'photo' as const }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const recentEntries = allEntries.slice(0, 5);
      
      const entryStrings = recentEntries.map(entry => {
        if (entry.entryType === 'weight') {
          return `📊 体重: ${entry.weight}g (${entry.dateStr})`;
        } else {
          const typeText = entry.type === 'fur' ? '毛並み' : 'うんち';
          return `📸 ${typeText}の写真 (${entry.dateStr})`;
        }
      });
      
      setRecentEntries(entryStrings);
    };

    loadRecentEntries();
  }, [refreshTrigger]);

  const quickActions = [
    {
      icon: '⚖️',
      label: '体重記録',
      action: () => onTabChange('weight')
    },
    {
      icon: '📸',
      label: '写真撮影',
      action: () => onTabChange('photos')
    },
    {
      icon: '🔍',
      label: '健康チェック',
      action: onHealthCheck
    }
  ];

  return (
    <div className="welcome-section">
      <h2>今日のウサギの様子</h2>
      <div className="quick-actions">
        {quickActions.map((action, index) => (
          <button
            key={index}
            className="action-btn"
            onClick={action.action}
          >
            <span className="icon">{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
      
      <div className="recent-records">
        <h3>最近の記録</h3>
        <div id="recent-entries">
          {recentEntries.length === 0 ? (
            <p>最近の記録がありません</p>
          ) : (
            recentEntries.map((entry, index) => (
              <div key={index} className="recent-entry">
                {entry}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeTab;