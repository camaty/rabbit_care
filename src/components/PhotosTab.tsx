import React, { useState, useEffect, useRef } from 'react';
import { PhotoEntry } from '../types';
import { getStorageData, appendStorageData, deleteStorageItem } from '../utils/database';

interface PhotosTabProps {
  onDataChange: () => void;
  refreshTrigger: number;
}

const PhotosTab: React.FC<PhotosTabProps> = ({ onDataChange, refreshTrigger }) => {
  const [currentPhotoType, setCurrentPhotoType] = useState<'fur' | 'poop'>('fur');
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'fur' | 'poop'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPhotos();
  }, [refreshTrigger]);

  const loadPhotos = async () => {
    const photoData = await getStorageData<PhotoEntry>('photos');
    setPhotos(photoData);
  };

  const selectPhotoType = (type: 'fur' | 'poop') => {
    setCurrentPhotoType(type);
  };

  const uploadPhoto = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      if (!e.target?.result) return;

      const photoEntry: PhotoEntry = {
        id: Date.now(),
        type: currentPhotoType,
        dataUrl: e.target.result as string,
        date: new Date().toISOString(),
        dateStr: new Date().toLocaleDateString('ja-JP'),
        timeStr: new Date().toLocaleTimeString('ja-JP')
      };

      await appendStorageData('photos', photoEntry);
      await loadPhotos();
      onDataChange();
      alert('写真を保存しました');
    };

    reader.readAsDataURL(file);
  };

  const deletePhoto = async (id: number) => {
    if (window.confirm('この写真を削除しますか？')) {
      await deleteStorageItem('photos', id);
      await loadPhotos();
      onDataChange();
    }
  };

  const filteredPhotos = photos.filter(photo => {
    if (filter === 'all') return true;
    return photo.type === filter;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="photos-section">
      <h2>写真記録</h2>
      
      <div className="photo-types">
        <button 
          className={`photo-type-btn ${currentPhotoType === 'fur' ? 'active' : ''}`}
          onClick={() => selectPhotoType('fur')}
        >
          <span className="icon">🐰</span>
          毛並み
        </button>
        <button 
          className={`photo-type-btn ${currentPhotoType === 'poop' ? 'active' : ''}`}
          onClick={() => selectPhotoType('poop')}
        >
          <span className="icon">💩</span>
          うんち
        </button>
      </div>
      
      <div className="photo-upload">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handlePhotoUpload}
        />
        <button id="photo-upload-btn" onClick={uploadPhoto}>
          写真を撮る
        </button>
        <div id="photo-type-display">
          {currentPhotoType === 'fur' ? '毛並みの写真を撮影します' : 'うんちの写真を撮影します'}
        </div>
      </div>

      <div className="photo-gallery">
        <h3>写真ギャラリー</h3>
        <div className="photo-filter">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            すべて
          </button>
          <button 
            className={`filter-btn ${filter === 'fur' ? 'active' : ''}`}
            onClick={() => setFilter('fur')}
          >
            毛並み
          </button>
          <button 
            className={`filter-btn ${filter === 'poop' ? 'active' : ''}`}
            onClick={() => setFilter('poop')}
          >
            うんち
          </button>
        </div>
        
        <div className="photo-gallery-grid">
          {filteredPhotos.length === 0 ? (
            <p>写真がありません</p>
          ) : (
            filteredPhotos.map(photo => (
              <div key={photo.id} className="photo-item" data-type={photo.type}>
                <img 
                  src={photo.dataUrl} 
                  alt={photo.type === 'fur' ? '毛並み' : 'うんち'}
                />
                <div className="photo-info">
                  <div>{photo.type === 'fur' ? '毛並み' : 'うんち'}</div>
                  <div>{photo.dateStr} {photo.timeStr}</div>
                </div>
                <button 
                  onClick={() => deletePhoto(photo.id)}
                  className="delete-btn"
                  style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    background: 'rgba(255,255,255,0.8)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '25px',
                    height: '25px',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotosTab;