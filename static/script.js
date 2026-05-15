// Audio Noise Cancellation Web Interface JavaScript

// State
let selectedFile = null;
const methods = {};

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

    // Draw waveforms after layout is visible
    requestAnimationFrame(() => {
        drawWaveform('waveformBefore', metadata.waveform_before, '#667eea');
        drawWaveform('waveformAfter', metadata.waveform_after, '#4caf50');
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
