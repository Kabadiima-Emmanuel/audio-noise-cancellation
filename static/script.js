// Audio Noise Cancellation Web Interface JavaScript

// State
let selectedFile = null;
const methods = {};
let originalAudioObjectUrl = null;
let spectrumData = null;
let notchBands = [];
let dragStartX = null;
let isDragging = false;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadMethodDescriptions();
    setupDragAndDrop();
});

// Setup event listeners
function setupEventListeners() {
    // File input
    document.getElementById('audioFile').addEventListener('change', handleFileSelect);

    // Slider updates
    document.getElementById('noiseDuration').addEventListener('input', function() {
        document.getElementById('noiseDurationValue').textContent = this.value + 's';
    });

    document.getElementById('spectralAlpha').addEventListener('input', function() {
        document.getElementById('spectralAlphaValue').textContent = this.value;
    });

    document.getElementById('freqMin').addEventListener('input', function() {
        document.getElementById('freqMinValue').textContent = this.value + ' Hz';
    });

    document.getElementById('freqMax').addEventListener('input', function() {
        document.getElementById('freqMaxValue').textContent = this.value + ' Hz';
    });

    // Method selection
    document.getElementById('method').addEventListener('change', updateMethodDescription);
}

// Load method descriptions from server
async function loadMethodDescriptions() {
    try {
        const response = await fetch('/api/methods');
        const data = await response.json();
        
        Object.assign(methods, data);
        updateMethodDescription();
    } catch (error) {
        console.error('Failed to load methods:', error);
    }
}

// Update method description
function updateMethodDescription() {
    const method = document.getElementById('method').value;
    const description = methods[method] || 'Processing method';
    document.getElementById('methodDesc').textContent = description;
}

// Drag and drop functionality
function setupDragAndDrop() {
    const uploadBox = document.getElementById('uploadBox');

    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('drag-over');
    });

    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('drag-over');
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            document.getElementById('audioFile').files = files;
            handleFileSelect();
        }
    });
}

// Handle file selection
function handleFileSelect() {
    const fileInput = document.getElementById('audioFile');
    const file = fileInput.files[0];

    if (file) {
        selectedFile = file;
        if (originalAudioObjectUrl) URL.revokeObjectURL(originalAudioObjectUrl);
        originalAudioObjectUrl = URL.createObjectURL(file);
        const fileName = document.getElementById('fileName');
        fileName.textContent = '✅ ' + file.name + ' (' + formatFileSize(file.size) + ')';
        fileName.style.display = 'block';
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Process audio
async function processAudio() {
    // Validation
    if (!selectedFile) {
        showError('Please select an audio file first');
        return;
    }

    const processBtn = document.getElementById('processBtn');
    processBtn.disabled = true;

    try {
        // Prepare form data
        const formData = new FormData();
        formData.append('audio_file', selectedFile);
        formData.append('noise_duration', document.getElementById('noiseDuration').value);
        formData.append('spectral_sub_alpha', document.getElementById('spectralAlpha').value);
        formData.append('method', document.getElementById('method').value);
        formData.append('freq_min', document.getElementById('freqMin').value);
        formData.append('freq_max', document.getElementById('freqMax').value);
        formData.append('notch_filters', JSON.stringify(notchBands));

        // Show progress
        showProgress();

        // Send request
        const response = await fetch('/api/process', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            showResults(result);
        } else {
            showError(result.error || 'Processing failed');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('An error occurred: ' + error.message);
    } finally {
        processBtn.disabled = false;
    }
}

// Show progress
function showProgress() {
    document.getElementById('progressContainer').style.display = 'block';
    document.getElementById('resultsContainer').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'none';
}

// Draw waveform onto a canvas element
function drawWaveform(canvasId, samples, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const mid = H / 2;
    const peak = Math.max(...samples) || 1;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(W, mid);
    ctx.stroke();

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + 'cc');
    grad.addColorStop(0.5, color + 'ff');
    grad.addColorStop(1, color + 'cc');

    const barW = Math.max(1, W / samples.length);

    ctx.fillStyle = grad;
    samples.forEach((amp, i) => {
        const normalized = (amp / peak) * (mid * 0.88);
        const x = i * barW;
        ctx.fillRect(x, mid - normalized, Math.max(barW - 0.5, 0.5), normalized * 2);
    });
}

// Show results
function showResults(result) {
    const metadata = result.metadata;

    // Update metrics
    document.getElementById('snrImprovement').textContent = metadata.snr_improvement.toFixed(2);
    document.getElementById('usedMethod').textContent = metadata.method.replace('_', ' ').toUpperCase();
    document.getElementById('duration').textContent = metadata.duration_seconds.toFixed(2);
    document.getElementById('sampleRate').textContent = (metadata.sample_rate / 1000).toFixed(1) + 'k';

    // Update download link
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.href = result.download_url;
    downloadBtn.download = metadata.output_file;

    // Detailed metrics
    const detailedMetrics = document.getElementById('detailedMetrics');
    detailedMetrics.innerHTML = `
        <div class="metric-row">
            <span class="metric-label">SNR Before (dB):</span>
            <span class="metric-val">${metadata.snr_before.toFixed(2)}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">SNR After (dB):</span>
            <span class="metric-val">${metadata.snr_after.toFixed(2)}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Improvement (dB):</span>
            <span class="metric-val">${metadata.snr_improvement.toFixed(2)}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Noise Duration:</span>
            <span class="metric-val">${metadata.noise_duration}s</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Noise Reduction:</span>
            <span class="metric-val">${metadata.spectral_sub_alpha}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">Frequency Range:</span>
            <span class="metric-val">${metadata.freq_min} - ${metadata.freq_max} Hz</span>
        </div>
    `;

    // Show results
    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'block';
    document.getElementById('errorContainer').style.display = 'none';

    // Init audio players
    initAudioPlayers(result.download_url);

    // Draw visualizations after layout is visible
    requestAnimationFrame(() => {
        drawWaveform('waveformBefore', metadata.waveform_before, '#667eea');
        drawWaveform('waveformAfter', metadata.waveform_after, '#4caf50');
        spectrumData = { freqs: metadata.spectrum_freqs, power: metadata.spectrum_power };
        drawSpectrum(spectrumData.freqs, spectrumData.power, notchBands);
        setupSpectrumInteraction(spectrumData.freqs, spectrumData.power);
    });
}

// Show error
function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'block';
}

// Reset form
function resetForm() {
    document.getElementById('audioFile').value = '';
    document.getElementById('fileName').style.display = 'none';
    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'none';
    selectedFile = null;
    if (originalAudioObjectUrl) { URL.revokeObjectURL(originalAudioObjectUrl); originalAudioObjectUrl = null; }
    notchBands = [];
    spectrumData = null;
    renderNotchList();
}

// Preset configurations
function setPreset(preset) {
    const presets = {
        speech: {
            noise_duration: 1.0,
            spectral_sub_alpha: 2.0,
            freq_min: 300,
            freq_max: 4000
        },
        music: {
            noise_duration: 1.5,
            spectral_sub_alpha: 1.5,
            freq_min: 100,
            freq_max: 12000
        },
        aggressive: {
            noise_duration: 0.5,
            spectral_sub_alpha: 3.5,
            freq_min: 400,
            freq_max: 7000
        },
        gentle: {
            noise_duration: 2.0,
            spectral_sub_alpha: 1.0,
            freq_min: 200,
            freq_max: 15000
        }
    };

    const config = presets[preset];
    if (config) {
        document.getElementById('noiseDuration').value = config.noise_duration;
        document.getElementById('noiseDurationValue').textContent = config.noise_duration + 's';

        document.getElementById('spectralAlpha').value = config.spectral_sub_alpha;
        document.getElementById('spectralAlphaValue').textContent = config.spectral_sub_alpha;

        document.getElementById('freqMin').value = config.freq_min;
        document.getElementById('freqMinValue').textContent = config.freq_min + ' Hz';

        document.getElementById('freqMax').value = config.freq_max;
        document.getElementById('freqMaxValue').textContent = config.freq_max + ' Hz';
    }
}

// ---- Audio Players ----
function initAudioPlayers(cleanUrl) {
    const before = document.getElementById('playerBefore');
    const after = document.getElementById('playerAfter');
    if (before && originalAudioObjectUrl) {
        before.src = originalAudioObjectUrl;
        before.load();
    }
    if (after && cleanUrl) {
        after.src = cleanUrl;
        after.load();
    }
}

// ---- Frequency Spectrum ----

function freqToX(freq, W, minFreq, maxFreq) {
    const logMin = Math.log10(Math.max(minFreq, 1));
    const logMax = Math.log10(Math.max(maxFreq, 2));
    return ((Math.log10(Math.max(freq, 1)) - logMin) / (logMax - logMin)) * W;
}

function xToFreq(x, W, minFreq, maxFreq) {
    const logMin = Math.log10(Math.max(minFreq, 1));
    const logMax = Math.log10(Math.max(maxFreq, 2));
    return Math.pow(10, logMin + (x / W) * (logMax - logMin));
}

function drawSpectrum(freqs, power, notches) {
    const canvas = document.getElementById('spectrumCanvas');
    if (!canvas || !freqs || !power) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padB = 22;
    const plotH = H - padB;
    const minFreq = Math.max(freqs[0], 20);
    const maxFreq = freqs[freqs.length - 1];
    const minDb = Math.min(...power);
    const maxDb = Math.max(...power);
    const dbRange = maxDb - minDb || 1;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Notch overlays (drawn behind bars)
    (notches || []).forEach(n => {
        const x1 = freqToX(n.freq_min, W, minFreq, maxFreq);
        const x2 = freqToX(n.freq_max, W, minFreq, maxFreq);
        ctx.fillStyle = 'rgba(244, 67, 54, 0.22)';
        ctx.fillRect(x1, 0, x2 - x1, plotH);
        ctx.strokeStyle = 'rgba(244, 67, 54, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x1, 0, x2 - x1, plotH);
    });

    // Bars
    for (let i = 0; i < freqs.length - 1; i++) {
        const x1 = freqToX(freqs[i], W, minFreq, maxFreq);
        const x2 = freqToX(freqs[i + 1], W, minFreq, maxFreq);
        const bw = Math.max(x2 - x1, 0.5);
        const norm = (power[i] - minDb) / dbRange;
        const barH = norm * plotH;
        const hue = 260 - norm * 60;
        ctx.fillStyle = `hsla(${hue}, 75%, ${38 + norm * 28}%, 0.92)`;
        ctx.fillRect(x1, plotH - barH, bw, barH);
    }

    // Axis grid + labels
    const labelFreqs = [50, 100, 200, 500, 1000, 2000, 4000, 8000];
    ctx.font = `${10}px sans-serif`;
    ctx.textAlign = 'center';
    labelFreqs.forEach(f => {
        if (f < minFreq || f > maxFreq) return;
        const x = freqToX(f, W, minFreq, maxFreq);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText(f >= 1000 ? (f / 1000) + 'k' : f, x, H - 5);
    });
}

function setupSpectrumInteraction(freqs, power) {
    const canvas = document.getElementById('spectrumCanvas');
    const tooltip = document.getElementById('spectrumTooltip');
    if (!canvas) return;

    const minFreq = Math.max(freqs[0], 20);
    const maxFreq = freqs[freqs.length - 1];

    canvas.onmousedown = e => {
        const rect = canvas.getBoundingClientRect();
        dragStartX = e.clientX - rect.left;
        isDragging = true;
        e.preventDefault();
    };

    canvas.onmousemove = e => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const freq = xToFreq(x, rect.width, minFreq, maxFreq);
        const label = freq >= 1000 ? (freq / 1000).toFixed(1) + ' kHz' : Math.round(freq) + ' Hz';

        tooltip.style.display = 'block';
        tooltip.style.left = Math.min(x + 10, rect.width - 80) + 'px';
        tooltip.style.top = '6px';
        tooltip.textContent = label;

        if (isDragging && dragStartX !== null) {
            drawSpectrum(freqs, power, notchBands);
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const padB = 22;
            const plotH = (canvas.height / dpr) - padB;
            const selX1 = Math.min(dragStartX, x);
            const selX2 = Math.max(dragStartX, x);
            ctx.fillStyle = 'rgba(244, 67, 54, 0.28)';
            ctx.fillRect(selX1, 0, selX2 - selX1, plotH);
            ctx.strokeStyle = 'rgba(244, 67, 54, 0.85)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(selX1, 0, selX2 - selX1, plotH);
        }
    };

    canvas.onmouseup = e => {
        if (!isDragging) return;
        const rect = canvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        if (Math.abs(endX - dragStartX) > 4) {
            const f1 = xToFreq(Math.min(dragStartX, endX), rect.width, minFreq, maxFreq);
            const f2 = xToFreq(Math.max(dragStartX, endX), rect.width, minFreq, maxFreq);
            notchBands.push({ freq_min: Math.round(f1), freq_max: Math.round(f2) });
            renderNotchList();
        }
        isDragging = false;
        dragStartX = null;
        drawSpectrum(freqs, power, notchBands);
    };

    canvas.onmouseleave = () => {
        tooltip.style.display = 'none';
        if (isDragging) {
            isDragging = false;
            dragStartX = null;
            drawSpectrum(freqs, power, notchBands);
        }
    };
}

// ---- Notch Band Management ----

function renderNotchList() {
    const list = document.getElementById('notchList');
    const actions = document.getElementById('notchActions');
    if (!list || !actions) return;

    list.innerHTML = notchBands.map((b, i) => {
        const lo = b.freq_min >= 1000 ? (b.freq_min / 1000).toFixed(1) + 'k' : b.freq_min;
        const hi = b.freq_max >= 1000 ? (b.freq_max / 1000).toFixed(1) + 'k' : b.freq_max;
        return `<span class="notch-band">${lo} – ${hi} Hz
            <button onclick="removeNotch(${i})" title="Remove">✕</button>
        </span>`;
    }).join('');

    actions.style.display = notchBands.length > 0 ? 'flex' : 'none';

    if (spectrumData) {
        requestAnimationFrame(() =>
            drawSpectrum(spectrumData.freqs, spectrumData.power, notchBands)
        );
    }
}

function removeNotch(idx) {
    notchBands.splice(idx, 1);
    renderNotchList();
}

function clearNotches() {
    notchBands = [];
    renderNotchList();
}

function reprocessWithNotches() {
    processAudio();
}
