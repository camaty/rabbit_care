import React, { useState, useEffect } from 'react';
import { Settings, WeightEntry, PhotoEntry } from '../types';
import { getSettingsData, setSettingsData, clearAllData, getStorageData, setStorageData } from '../utils/database';

interface SettingsTabProps {
  onDataChange: () => void;
  refreshTrigger: number;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ onDataChange, refreshTrigger }) => {
  const [settings, setSettings] = useState<Settings>({
    rabbitName: '',
    rabbitBreed: '',
    rabbitBirthday: '',
    openaiApiKey: ''
  });

  useEffect(() => {
    loadSettings();
  }, [refreshTrigger]);

  const loadSettings = async () => {
    const settingsData = await getSettingsData();
    setSettings(settingsData);
  };

  const saveSettings = async () => {
    await setSettingsData(settings);
    onDataChange();
    alert('設定を保存しました');
  };

  const handleInputChange = (field: keyof Settings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testApiKey = async () => {
    if (!settings.openaiApiKey) {
      alert('APIキーを入力してください');
      return;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${settings.openaiApiKey}`
        }
      });

      if (response.ok) {
        alert('APIキーの接続テストに成功しました');
      } else {
        alert('APIキーが無効です');
      }
    } catch (error) {
      alert('接続テストでエラーが発生しました');
    }
  };

  const exportData = async () => {
    const data = {
      weights: await getStorageData<WeightEntry>('weights'),
      photos: await getStorageData<PhotoEntry>('photos'),
      settings: await getSettingsData()
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `rabbit-health-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);

          if (data.weights) await setStorageData('weights', data.weights);
          if (data.photos) await setStorageData('photos', data.photos);
          if (data.settings) await setSettingsData(data.settings);

          alert('データをインポートしました');
          await loadSettings();
          onDataChange();
        } catch (error) {
          alert('無効なファイル形式です');
        }
      };

      reader.readAsText(file);
    };

    input.click();
  };

  const clearAll = async () => {
    if (window.confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
      if (window.confirm('本当にすべてのデータを削除しますか？')) {
        await clearAllData();
        alert('すべてのデータを削除しました');
        await loadSettings();
        onDataChange();
      }
    }
  };

  return (
    <div className="settings-section">
      <h2>設定</h2>
      
      <div className="setting-group">
        <h3>ウサギ情報</h3>
        <div className="setting-item">
          <label htmlFor="rabbit-name">名前</label>
          <input
            type="text"
            id="rabbit-name"
            value={settings.rabbitName}
            onChange={(e) => handleInputChange('rabbitName', e.target.value)}
            onBlur={saveSettings}
            placeholder="ウサギの名前"
          />
        </div>
        <div className="setting-item">
          <label htmlFor="rabbit-breed">品種</label>
          <input
            type="text"
            id="rabbit-breed"
            value={settings.rabbitBreed}
            onChange={(e) => handleInputChange('rabbitBreed', e.target.value)}
            onBlur={saveSettings}
            placeholder="例: ネザーランドドワーフ"
          />
        </div>
        <div className="setting-item">
          <label htmlFor="rabbit-birthday">誕生日</label>
          <input
            type="date"
            id="rabbit-birthday"
            value={settings.rabbitBirthday}
            onChange={(e) => handleInputChange('rabbitBirthday', e.target.value)}
            onBlur={saveSettings}
          />
        </div>
      </div>

      <div className="setting-group">
        <h3>ChatGPT設定</h3>
        <div className="setting-item">
          <label htmlFor="openai-api-key">OpenAI API Key</label>
          <input
            type="password"
            id="openai-api-key"
            value={settings.openaiApiKey}
            onChange={(e) => handleInputChange('openaiApiKey', e.target.value)}
            onBlur={saveSettings}
            placeholder="sk-..."
          />
          <small>健康チェック機能を使用するにはOpenAI APIキーが必要です</small>
        </div>
        <button onClick={testApiKey}>接続テスト</button>
      </div>

      <div className="setting-group">
        <h3>データ管理</h3>
        <button onClick={exportData}>データをエクスポート</button>
        <button onClick={importData}>データをインポート</button>
        <button onClick={clearAll} className="danger-btn">
          すべてのデータを削除
        </button>
      </div>
    </div>
  );
};

export default SettingsTab;