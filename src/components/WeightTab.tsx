import React, { useState, useEffect, useRef } from 'react';
import { WeightEntry } from '../types';
import { getStorageData, appendStorageData, deleteStorageItem } from '../utils/database';

interface WeightTabProps {
  onDataChange: () => void;
  refreshTrigger: number;
}

const WeightTab: React.FC<WeightTabProps> = ({ onDataChange, refreshTrigger }) => {
  const [weightValue, setWeightValue] = useState('');
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadWeights();
  }, [refreshTrigger]);

  useEffect(() => {
    drawWeightChart();
  }, [weights]);

  const loadWeights = async () => {
    const weightData = await getStorageData<WeightEntry>('weights');
    setWeights(weightData);
  };

  const saveWeight = async () => {
    const weight = parseFloat(weightValue);
    
    if (!weight || weight <= 0) {
      alert('有効な体重を入力してください');
      return;
    }
    
    const weightEntry: WeightEntry = {
      id: Date.now(),
      weight: weight,
      date: new Date().toISOString(),
      dateStr: new Date().toLocaleDateString('ja-JP')
    };
    
    await appendStorageData('weights', weightEntry);
    setWeightValue('');
    await loadWeights();
    onDataChange();
    
    alert('体重を記録しました');
  };

  const deleteWeight = async (id: number) => {
    if (window.confirm('この体重記録を削除しますか？')) {
      await deleteStorageItem('weights', id);
      await loadWeights();
      onDataChange();
    }
  };

  const drawWeightChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (weights.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#999';
      ctx.fillText('体重データがありません', canvas.width / 2, canvas.height / 2);
      return;
    }

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const sortedWeights = [...weights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const maxWeight = Math.max(...sortedWeights.map(w => w.weight));
    const minWeight = Math.min(...sortedWeights.map(w => w.weight));
    const weightRange = maxWeight - minWeight || 100;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i++) {
      const x = (canvas.width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let i = 0; i <= 5; i++) {
      const y = (canvas.height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw weight line
    if (sortedWeights.length > 1) {
      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 2;
      ctx.beginPath();

      sortedWeights.forEach((weight, index) => {
        const x = (canvas.width / (sortedWeights.length - 1)) * index;
        const y = canvas.height - ((weight.weight - minWeight) / weightRange * canvas.height);

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }

    // Draw weight points
    ctx.fillStyle = '#667eea';
    sortedWeights.forEach((weight, index) => {
      const x = (canvas.width / (sortedWeights.length - 1)) * index;
      const y = canvas.height - ((weight.weight - minWeight) / weightRange * canvas.height);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const sortedWeights = [...weights].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="weight-section">
      <h2>体重記録</h2>
      
      <div className="weight-input">
        <label htmlFor="weight-value">体重 (g)</label>
        <input
          type="number"
          id="weight-value"
          value={weightValue}
          onChange={(e) => setWeightValue(e.target.value)}
          placeholder="例: 1500"
          step="1"
        />
        <button onClick={saveWeight}>記録</button>
      </div>
      
      <div className="weight-chart">
        <canvas 
          ref={canvasRef}
          id="weight-chart-canvas"
          style={{ width: '100%', height: '250px' }}
        />
      </div>
      
      <div className="weight-history">
        <h3>体重履歴</h3>
        <div id="weight-list">
          {sortedWeights.length === 0 ? (
            <p>体重の記録がありません</p>
          ) : (
            sortedWeights.map(entry => (
              <div key={entry.id} className="weight-entry">
                <div className="weight-value">{entry.weight}g</div>
                <div className="weight-date">{entry.dateStr}</div>
                <button 
                  onClick={() => deleteWeight(entry.id)}
                  className="delete-btn"
                >
                  削除
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WeightTab;