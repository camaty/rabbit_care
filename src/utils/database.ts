import { WeightEntry, PhotoEntry, Settings } from '../types';

let db: IDBDatabase | null = null;

export const initDatabase = async (): Promise<void> => {
  return new Promise((resolve) => {
    const request = indexedDB.open('RabbitCareDB', 1);
    
    request.onerror = () => {
      console.error('Database failed to open');
      console.log('Falling back to localStorage');
      resolve();
    };
    
    request.onsuccess = () => {
      db = request.result;
      console.log('Database opened successfully');
      resolve();
    };
    
    request.onupgradeneeded = (e) => {
      db = (e.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('weights')) {
        const weightStore = db.createObjectStore('weights', { keyPath: 'id' });
        weightStore.createIndex('date', 'date', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('type', 'type', { unique: false });
        photoStore.createIndex('date', 'date', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      
      console.log('Database setup complete');
    };
  });
};

export const getStorageData = async <T>(storeName: string): Promise<T[]> => {
  if (db) {
    try {
      return new Promise((resolve, reject) => {
        const transaction = db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
      });
    } catch (error) {
      console.error('IndexedDB error, falling back to localStorage:', error);
      return getLocalStorageData<T>(storeName);
    }
  } else {
    return getLocalStorageData<T>(storeName);
  }
};

export const setStorageData = async <T>(storeName: string, data: T[]): Promise<void> => {
  if (db) {
    try {
      return new Promise((resolve, reject) => {
        const transaction = db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
          const promises = data.map(item => {
            return new Promise<void>((itemResolve, itemReject) => {
              const addRequest = store.add(item);
              addRequest.onsuccess = () => itemResolve();
              addRequest.onerror = () => itemReject(addRequest.error);
            });
          });
          
          Promise.all(promises)
            .then(() => resolve())
            .catch(reject);
        };
        clearRequest.onerror = () => reject(clearRequest.error);
      });
    } catch (error) {
      console.error('IndexedDB error, falling back to localStorage:', error);
      setLocalStorageData(storeName, data);
    }
  } else {
    setLocalStorageData(storeName, data);
  }
};

export const appendStorageData = async <T>(storeName: string, newData: T): Promise<void> => {
  if (db) {
    try {
      return new Promise((resolve, reject) => {
        const transaction = db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(newData);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB error, falling back to localStorage:', error);
      const existingData = getLocalStorageData<T>(storeName) || [];
      existingData.push(newData);
      setLocalStorageData(storeName, existingData);
    }
  } else {
    const existingData = getLocalStorageData<T>(storeName) || [];
    existingData.push(newData);
    setLocalStorageData(storeName, existingData);
  }
};

export const deleteStorageItem = async (storeName: string, id: number): Promise<void> => {
  if (db) {
    try {
      return new Promise((resolve, reject) => {
        const transaction = db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('IndexedDB error, falling back to localStorage:', error);
      const existingData = getLocalStorageData<WeightEntry | PhotoEntry>(storeName) || [];
      const filteredData = existingData.filter(item => item.id !== id);
      setLocalStorageData(storeName, filteredData);
    }
  } else {
    const existingData = getLocalStorageData<WeightEntry | PhotoEntry>(storeName) || [];
    const filteredData = existingData.filter(item => item.id !== id);
    setLocalStorageData(storeName, filteredData);
  }
};

export const getSettingsData = async (): Promise<Settings> => {
  if (db) {
    try {
      return new Promise((resolve, reject) => {
        const transaction = db!.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.getAll();
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const settingsArray = request.result || [];
          const settingsObject = {} as Settings;
          settingsArray.forEach((item: { key: string; value: string }) => {
            (settingsObject as any)[item.key] = item.value;
          });
          resolve(settingsObject);
        };
      });
    } catch (error) {
      console.error('IndexedDB error, falling back to localStorage:', error);
      return getLocalStorageSettingsData();
    }
  } else {
    return getLocalStorageSettingsData();
  }
};

export const setSettingsData = async (settings: Settings): Promise<void> => {
  if (db) {
    try {
      return new Promise((resolve, reject) => {
        const transaction = db!.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
          const promises = Object.keys(settings).map(key => {
            return new Promise<void>((itemResolve, itemReject) => {
              const addRequest = store.add({ key, value: (settings as any)[key] });
              addRequest.onsuccess = () => itemResolve();
              addRequest.onerror = () => itemReject(addRequest.error);
            });
          });
          
          Promise.all(promises)
            .then(() => resolve())
            .catch(reject);
        };
        clearRequest.onerror = () => reject(clearRequest.error);
      });
    } catch (error) {
      console.error('IndexedDB error, falling back to localStorage:', error);
      setLocalStorageData('settings', settings);
    }
  } else {
    setLocalStorageData('settings', settings);
  }
};

export const clearAllData = async (): Promise<void> => {
  if (db) {
    try {
      const transaction = db.transaction(['weights', 'photos', 'settings'], 'readwrite');
      await Promise.all([
        transaction.objectStore('weights').clear(),
        transaction.objectStore('photos').clear(),
        transaction.objectStore('settings').clear()
      ]);
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
    }
  }
  // Also clear localStorage as fallback
  localStorage.clear();
};

// localStorage fallback functions
function getLocalStorageData<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function getLocalStorageSettingsData(): Settings {
  const data = localStorage.getItem('settings');
  return data ? JSON.parse(data) : {} as Settings;
}

function setLocalStorageData<T>(key: string, data: T | T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}