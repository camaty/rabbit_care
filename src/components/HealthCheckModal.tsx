import React, { useState } from 'react';
import { WeightEntry, PhotoEntry, HealthCheckOptions } from '../types';
import { getStorageData, getSettingsData } from '../utils/database';

interface HealthCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HealthCheckModal: React.FC<HealthCheckModalProps> = ({ isOpen, onClose }) => {
  const [options, setOptions] = useState<HealthCheckOptions>({
    checkWeight: false,
    checkFur: false,
    checkPoop: false,
    question: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [showResult, setShowResult] = useState(false);

  const handleOptionChange = (field: keyof HealthCheckOptions, value: boolean | string) => {
    setOptions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const performHealthCheck = async () => {
    if (!options.checkWeight && !options.checkFur && !options.checkPoop) {
      alert('分析したい項目を選択してください');
      return;
    }

    const settings = await getSettingsData();
    if (!settings.openaiApiKey) {
      alert('健康チェックを使用するには、設定でOpenAI APIキーを入力してください');
      return;
    }

    setIsLoading(true);
    setShowResult(true);
    setResult('');

    try {
      let analysisData = '';

      if (options.checkWeight) {
        const weights = await getStorageData<WeightEntry>('weights');
        const recentWeights = weights.slice(-5);
        analysisData += `体重データ: ${recentWeights.map(w => `${w.dateStr}: ${w.weight}g`).join(', ')}\n`;
      }

      if (options.checkFur) {
        const photos = await getStorageData<PhotoEntry>('photos');
        const furPhotos = photos.filter(p => p.type === 'fur').slice(-3);
        analysisData += `毛並み写真: ${furPhotos.length}枚の最新写真があります\n`;
      }

      if (options.checkPoop) {
        const photos = await getStorageData<PhotoEntry>('photos');
        const poopPhotos = photos.filter(p => p.type === 'poop').slice(-3);
        analysisData += `うんち写真: ${poopPhotos.length}枚の最新写真があります\n`;
      }

      if (options.question) {
        analysisData += `追加の質問: ${options.question}\n`;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'あなたは獣医師のアシスタントです。ウサギの健康状態について、提供されたデータを基に分析し、日本語で回答してください。医学的な診断は行わず、一般的な健康管理のアドバイスに留めてください。'
            },
            {
              role: 'user',
              content: `以下のウサギの健康データを分析してください：\n${analysisData}`
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const analysis = data.choices[0].message.content;
      
      setResult(analysis);
    } catch (error) {
      console.error('Health check error:', error);
      setResult('健康チェックでエラーが発生しました。APIキーを確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setOptions({
      checkWeight: false,
      checkFur: false,
      checkPoop: false,
      question: ''
    });
    setShowResult(false);
    setResult('');
    setIsLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>健康チェック</h2>
          <button className="close-btn" onClick={handleClose}>
            &times;
          </button>
        </div>
        
        <div className="modal-body">
          {!showResult ? (
            <div id="health-check-form">
              <h3>分析したい項目を選択してください</h3>
              <div className="health-check-options">
                <label>
                  <input
                    type="checkbox"
                    checked={options.checkWeight}
                    onChange={(e) => handleOptionChange('checkWeight', e.target.checked)}
                  />
                  体重の変化
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={options.checkFur}
                    onChange={(e) => handleOptionChange('checkFur', e.target.checked)}
                  />
                  毛並みの状態
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={options.checkPoop}
                    onChange={(e) => handleOptionChange('checkPoop', e.target.checked)}
                  />
                  うんちの状態
                </label>
              </div>
              <textarea
                id="health-question"
                value={options.question}
                onChange={(e) => handleOptionChange('question', e.target.value)}
                placeholder="気になることがあれば詳しく記入してください..."
              />
              <button onClick={performHealthCheck}>健康チェック開始</button>
            </div>
          ) : (
            <div id="health-check-result">
              <h3>分析結果</h3>
              <div id="health-analysis">
                {isLoading ? (
                  <div>
                    <div className="loading"></div> 分析中...
                  </div>
                ) : (
                  <div style={{ 
                    background: 'rgba(255, 255, 255, 0.8)',
                    padding: '1.5rem',
                    borderRadius: '15px',
                    borderLeft: '4px solid #667eea',
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    color: '#333'
                  }}>
                    {result}
                  </div>
                )}
              </div>
              {!isLoading && (
                <button onClick={resetModal} style={{ marginTop: '1rem' }}>
                  新しい健康チェック
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthCheckModal;