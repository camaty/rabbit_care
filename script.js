// Global variables
let currentPhotoType = 'fur';
let openaiApiKey = '';
let db = null;

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

// Initialize the application
async function initApp() {
    await initDatabase();
    await loadSettings();
    await displayRecentEntries();
    await displayWeightHistory();
    await displayPhotoGallery();
    setupTabNavigation();
    setupPhotoInput();
    
    // Load weight chart
    await drawWeightChart();
}

// IndexedDB Database Management
async function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('RabbitCareDB', 1);
        
        request.onerror = () => {
            console.error('Database failed to open');
            // Fallback to localStorage if IndexedDB fails
            console.log('Falling back to localStorage');
            resolve();
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('Database opened successfully');
            resolve();
        };
        
        request.onupgradeneeded = (e) => {
            db = e.target.result;
            
            // Create object stores
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
}

// Tab navigation
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            openTab(tabName);
        });
    });
}

function openTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to selected button
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Refresh content based on tab
    switch(tabName) {
        case 'weight':
            displayWeightHistory();
            drawWeightChart();
            break;
        case 'photos':
            displayPhotoGallery();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Storage Management (IndexedDB with localStorage fallback)
async function getStorageData(storeName) {
    if (db) {
        try {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result || []);
            });
        } catch (error) {
            console.error('IndexedDB error, falling back to localStorage:', error);
            return getLocalStorageData(storeName);
        }
    } else {
        return getLocalStorageData(storeName);
    }
}

async function setStorageData(storeName, data) {
    if (db) {
        try {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                // Clear existing data
                const clearRequest = store.clear();
                clearRequest.onsuccess = () => {
                    // Add new data
                    const promises = data.map(item => {
                        return new Promise((itemResolve, itemReject) => {
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
}

async function appendStorageData(storeName, newData) {
    if (db) {
        try {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.add(newData);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        } catch (error) {
            console.error('IndexedDB error, falling back to localStorage:', error);
            const existingData = getLocalStorageData(storeName) || [];
            existingData.push(newData);
            setLocalStorageData(storeName, existingData);
        }
    } else {
        const existingData = getLocalStorageData(storeName) || [];
        existingData.push(newData);
        setLocalStorageData(storeName, existingData);
    }
}

async function deleteStorageItem(storeName, id) {
    if (db) {
        try {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(id);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        } catch (error) {
            console.error('IndexedDB error, falling back to localStorage:', error);
            const existingData = getLocalStorageData(storeName) || [];
            const filteredData = existingData.filter(item => item.id !== id);
            setLocalStorageData(storeName, filteredData);
        }
    } else {
        const existingData = getLocalStorageData(storeName) || [];
        const filteredData = existingData.filter(item => item.id !== id);
        setLocalStorageData(storeName, filteredData);
    }
}

// Settings management for IndexedDB
async function getSettingsData() {
    if (db) {
        try {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['settings'], 'readonly');
                const store = transaction.objectStore('settings');
                const request = store.getAll();
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const settingsArray = request.result || [];
                    const settingsObject = {};
                    settingsArray.forEach(item => {
                        settingsObject[item.key] = item.value;
                    });
                    resolve(settingsObject);
                };
            });
        } catch (error) {
            console.error('IndexedDB error, falling back to localStorage:', error);
            return getLocalStorageData('settings') || {};
        }
    } else {
        return getLocalStorageData('settings') || {};
    }
}

async function setSettingsData(settings) {
    if (db) {
        try {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['settings'], 'readwrite');
                const store = transaction.objectStore('settings');
                
                // Clear existing settings
                const clearRequest = store.clear();
                clearRequest.onsuccess = () => {
                    // Add new settings
                    const promises = Object.keys(settings).map(key => {
                        return new Promise((itemResolve, itemReject) => {
                            const addRequest = store.add({ key, value: settings[key] });
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
}

// localStorage fallback functions
function getLocalStorageData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

function setLocalStorageData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Weight Management
async function saveWeight() {
    const weightInput = document.getElementById('weight-value');
    const weight = parseFloat(weightInput.value);
    
    if (!weight || weight <= 0) {
        alert('有効な体重を入力してください');
        return;
    }
    
    const weightEntry = {
        id: Date.now(),
        weight: weight,
        date: new Date().toISOString(),
        dateStr: new Date().toLocaleDateString('ja-JP')
    };
    
    await appendStorageData('weights', weightEntry);
    weightInput.value = '';
    
    await displayWeightHistory();
    await drawWeightChart();
    await displayRecentEntries();
    
    alert('体重を記録しました');
}

async function displayWeightHistory() {
    const weights = await getStorageData('weights') || [];
    const weightList = document.getElementById('weight-list');
    
    if (weights.length === 0) {
        weightList.innerHTML = '<p>体重の記録がありません</p>';
        return;
    }
    
    const sortedWeights = weights.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    weightList.innerHTML = sortedWeights.map(entry => `
        <div class="weight-entry">
            <div class="weight-value">${entry.weight}g</div>
            <div class="weight-date">${entry.dateStr}</div>
            <button onclick="deleteWeight(${entry.id})" class="delete-btn">削除</button>
        </div>
    `).join('');
}

async function deleteWeight(id) {
    if (confirm('この体重記録を削除しますか？')) {
        await deleteStorageItem('weights', id);
        await displayWeightHistory();
        await drawWeightChart();
        await displayRecentEntries();
    }
}

async function drawWeightChart() {
    const canvas = document.getElementById('weight-chart-canvas');
    const ctx = canvas.getContext('2d');
    const weights = await getStorageData('weights') || [];
    
    if (weights.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#999';
        ctx.fillText('体重データがありません', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const sortedWeights = weights.sort((a, b) => new Date(a.date) - new Date(b.date));
    const maxWeight = Math.max(...sortedWeights.map(w => w.weight));
    const minWeight = Math.min(...sortedWeights.map(w => w.weight));
    const weightRange = maxWeight - minWeight || 100;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let i = 0; i <= 10; i++) {
        const x = (canvas.width / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Horizontal lines
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
}

// Photo Management
function setupPhotoInput() {
    const photoInput = document.getElementById('photo-input');
    photoInput.addEventListener('change', handlePhotoUpload);
}

function selectPhotoType(type) {
    currentPhotoType = type;
    
    // Update button states
    document.querySelectorAll('.photo-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.photo-type-btn').classList.add('active');
    
    // Update display
    document.getElementById('photo-type-display').textContent = 
        type === 'fur' ? '毛並みの写真を撮影します' : 'うんちの写真を撮影します';
}

function uploadPhoto() {
    if (!currentPhotoType) {
        alert('写真の種類を選択してください');
        return;
    }
    
    document.getElementById('photo-input').click();
}

async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const photoEntry = {
            id: Date.now(),
            type: currentPhotoType,
            dataUrl: e.target.result,
            date: new Date().toISOString(),
            dateStr: new Date().toLocaleDateString('ja-JP'),
            timeStr: new Date().toLocaleTimeString('ja-JP')
        };
        
        await appendStorageData('photos', photoEntry);
        await displayPhotoGallery();
        await displayRecentEntries();
        alert('写真を保存しました');
    };
    
    reader.readAsDataURL(file);
}

async function displayPhotoGallery() {
    const photos = await getStorageData('photos') || [];
    const gallery = document.getElementById('photo-gallery-grid');
    
    if (photos.length === 0) {
        gallery.innerHTML = '<p>写真がありません</p>';
        return;
    }
    
    const sortedPhotos = photos.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    gallery.innerHTML = sortedPhotos.map(photo => `
        <div class="photo-item" data-type="${photo.type}">
            <img src="${photo.dataUrl}" alt="${photo.type === 'fur' ? '毛並み' : 'うんち'}">
            <div class="photo-info">
                <div>${photo.type === 'fur' ? '毛並み' : 'うんち'}</div>
                <div>${photo.dateStr} ${photo.timeStr}</div>
            </div>
            <button onclick="deletePhoto(${photo.id})" class="delete-btn" style="position: absolute; top: 5px; right: 5px; background: rgba(255,255,255,0.8); border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer;">×</button>
        </div>
    `).join('');
}

function filterPhotos(type) {
    const photos = document.querySelectorAll('.photo-item');
    
    // Update filter button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter photos
    photos.forEach(photo => {
        if (type === 'all' || photo.dataset.type === type) {
            photo.style.display = 'block';
        } else {
            photo.style.display = 'none';
        }
    });
}

async function deletePhoto(id) {
    if (confirm('この写真を削除しますか？')) {
        await deleteStorageItem('photos', id);
        await displayPhotoGallery();
        await displayRecentEntries();
    }
}

// Settings Management
async function loadSettings() {
    const settings = await getSettingsData();
    
    document.getElementById('rabbit-name').value = settings.rabbitName || '';
    document.getElementById('rabbit-breed').value = settings.rabbitBreed || '';
    document.getElementById('rabbit-birthday').value = settings.rabbitBirthday || '';
    document.getElementById('openai-api-key').value = settings.openaiApiKey || '';
    
    openaiApiKey = settings.openaiApiKey || '';
}

async function saveSettings() {
    const settings = {
        rabbitName: document.getElementById('rabbit-name').value,
        rabbitBreed: document.getElementById('rabbit-breed').value,
        rabbitBirthday: document.getElementById('rabbit-birthday').value,
        openaiApiKey: document.getElementById('openai-api-key').value
    };
    
    await setSettingsData(settings);
    openaiApiKey = settings.openaiApiKey;
    alert('設定を保存しました');
}

// Auto-save settings on input change
document.addEventListener('DOMContentLoaded', function() {
    const settingsInputs = ['rabbit-name', 'rabbit-breed', 'rabbit-birthday', 'openai-api-key'];
    
    settingsInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', saveSettings);
        }
    });
});

// Health Check functionality
function openHealthCheck() {
    if (!openaiApiKey) {
        alert('健康チェックを使用するには、設定でOpenAI APIキーを入力してください');
        openTab('settings');
        return;
    }
    
    document.getElementById('health-check-modal').style.display = 'block';
}

function closeHealthCheck() {
    document.getElementById('health-check-modal').style.display = 'none';
    document.getElementById('health-check-form').style.display = 'block';
    document.getElementById('health-check-result').style.display = 'none';
}

async function performHealthCheck() {
    const checkWeight = document.getElementById('check-weight').checked;
    const checkFur = document.getElementById('check-fur').checked;
    const checkPoop = document.getElementById('check-poop').checked;
    const question = document.getElementById('health-question').value;
    
    if (!checkWeight && !checkFur && !checkPoop) {
        alert('分析したい項目を選択してください');
        return;
    }
    
    // Gather data
    let analysisData = '';
    
    if (checkWeight) {
        const weights = await getStorageData('weights') || [];
        const recentWeights = weights.slice(-5);
        analysisData += `体重データ: ${recentWeights.map(w => `${w.dateStr}: ${w.weight}g`).join(', ')}\n`;
    }
    
    if (checkFur) {
        const photos = await getStorageData('photos') || [];
        const furPhotos = photos.filter(p => p.type === 'fur').slice(-3);
        analysisData += `毛並み写真: ${furPhotos.length}枚の最新写真があります\n`;
    }
    
    if (checkPoop) {
        const photos = await getStorageData('photos') || [];
        const poopPhotos = photos.filter(p => p.type === 'poop').slice(-3);
        analysisData += `うんち写真: ${poopPhotos.length}枚の最新写真があります\n`;
    }
    
    if (question) {
        analysisData += `追加の質問: ${question}\n`;
    }
    
    // Show loading
    document.getElementById('health-check-form').style.display = 'none';
    document.getElementById('health-check-result').style.display = 'block';
    document.getElementById('health-analysis').innerHTML = '<div class="loading"></div> 分析中...';
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`
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
        
        document.getElementById('health-analysis').textContent = analysis;
        
    } catch (error) {
        console.error('Health check error:', error);
        document.getElementById('health-analysis').innerHTML = 
            '<div class="text-danger">健康チェックでエラーが発生しました。APIキーを確認してください。</div>';
    }
}

async function testApiKey() {
    const apiKey = document.getElementById('openai-api-key').value;
    
    if (!apiKey) {
        alert('APIキーを入力してください');
        return;
    }
    
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
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
}

// Recent Entries Display
async function displayRecentEntries() {
    const weights = await getStorageData('weights') || [];
    const photos = await getStorageData('photos') || [];
    
    const allEntries = [
        ...weights.map(w => ({...w, entryType: 'weight'})),
        ...photos.map(p => ({...p, entryType: 'photo'}))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const recentEntries = allEntries.slice(0, 5);
    const container = document.getElementById('recent-entries');
    
    if (recentEntries.length === 0) {
        container.innerHTML = '<p>最近の記録がありません</p>';
        return;
    }
    
    container.innerHTML = recentEntries.map(entry => {
        if (entry.entryType === 'weight') {
            return `<div class="recent-entry">📊 体重: ${entry.weight}g (${entry.dateStr})</div>`;
        } else {
            const typeText = entry.type === 'fur' ? '毛並み' : 'うんち';
            return `<div class="recent-entry">📸 ${typeText}の写真 (${entry.dateStr})</div>`;
        }
    }).join('');
}

// Data Management
async function exportData() {
    const data = {
        weights: await getStorageData('weights') || [],
        photos: await getStorageData('photos') || [],
        settings: await getSettingsData()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `rabbit-health-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
}

async function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.weights) await setStorageData('weights', data.weights);
                if (data.photos) await setStorageData('photos', data.photos);
                if (data.settings) await setSettingsData(data.settings);
                
                alert('データをインポートしました');
                await initApp();
            } catch (error) {
                alert('無効なファイル形式です');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

async function clearAllData() {
    if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
        if (confirm('本当にすべてのデータを削除しますか？')) {
            if (db) {
                // Clear IndexedDB
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
            alert('すべてのデータを削除しました');
            await initApp();
        }
    }
}

// Modal close on background click
document.addEventListener('click', function(event) {
    const modal = document.getElementById('health-check-modal');
    if (event.target === modal) {
        closeHealthCheck();
    }
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            }, function(err) {
                console.log('ServiceWorker registration failed');
            });
    });
}