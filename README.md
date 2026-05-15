# 🎵 Audio Noise Cancellation Application

**Advanced audio noise cancellation using Fourier Series and Python signal processing**

## Overview

This application removes background noise from audio files using advanced Fourier-based signal processing techniques. It provides both REST API and web interface for audio processing.

### Key Features

✅ **Fourier Analysis** - FFT and STFT-based frequency domain processing
✅ **Multiple Filtering Methods**:
   - Spectral Subtraction (aggressive noise removal)
   - Wiener Filter (optimal SNR-based filtering)
   - Ensemble Method (combination of both)

✅ **Advanced Features**:
   - Automatic noise spectrum estimation
   - Frequency range filtering
   - SNR (Signal-to-Noise Ratio) calculation
   - Click and pop removal
   - Audio normalization

✅ **Web Interface** - Drag-and-drop, real-time parameters, preset configurations
✅ **Multiple Audio Formats** - WAV, MP3, FLAC, OGG, M4A

## Installation

### Requirements
- Python 3.7+
- pip

### Setup

```bash
# Clone repository
git clone https://github.com/Kabadiima-Emmanuel/audio-noise-cancellation.git
cd audio-noise-cancellation

# Install dependencies
pip install -r requirements.txt
```

## Usage

### Running the Web Application

```bash
python app.py
```

Then open your browser to: `http://localhost:5000`

### Using the API

#### Upload and Process Audio

```bash
curl -X POST http://localhost:5000/api/process \
  -F "audio_file=@audio.wav" \
  -F "noise_duration=1.0" \
  -F "spectral_sub_alpha=2.0" \
  -F "method=ensemble" \
  -F "freq_min=300" \
  -F "freq_max=8000"
```

#### Get Available Methods

```bash
curl http://localhost:5000/api/methods
```

#### Download Processed Audio

```bash
curl -O http://localhost:5000/api/download/cleaned_filename.wav
```

## Configuration

Edit `config.py` to customize:

```python
SAMPLE_RATE = 16000          # Hz
FFT_SIZE = 2048             # FFT window size
HOP_LENGTH = 512            # Hop length for STFT
MAX_CONTENT_LENGTH = 50*1024*1024  # Max file size (50MB)
```

## Processing Methods

### 1. Spectral Subtraction
**How it works:**
- Estimates noise spectrum from silent portions
- Subtracts noise from signal spectrum
- Aggressive noise removal with potential artifacts

**Best for:** Consistent background noise, very noisy audio

### 2. Wiener Filter
**How it works:**
- Optimal filtering based on Signal-to-Noise Ratio
- Minimizes mean square error
- Preserves signal quality

**Best for:** Maintaining signal quality, variable noise

### 3. Ensemble Method (Recommended)
**How it works:**
- Combines Spectral Subtraction and Wiener Filter
- Averages results for optimal performance
- Removes clicks and artifacts

**Best for:** General purpose, best results

## Web Interface Guide

### Step 1: Upload Audio
- Drag and drop or browse for audio file
- Supports: WAV, MP3, FLAC, OGG, M4A
- Maximum file size: 50MB

### Step 2: Configure Settings

**Quick Presets:**
- 🎤 Speech - Optimized for voice recording noise removal
- 🎶 Music - Preserves musical qualities
- ⚡ Aggressive - Maximum noise removal
- 🌙 Gentle - Minimal artifacts

**Manual Settings:**
- **Processing Method:** Choose filtering technique
- **Noise Duration:** How long is the noise at the beginning (seconds)
- **Noise Reduction Strength:** Aggressiveness of subtraction (1.0-5.0)
- **Frequency Range:** Preserve frequencies in this range

### Step 3: Process
1. Click "Process Audio"
2. Wait for processing to complete
3. View metrics and download cleaned audio

## Parameters Explained

### Noise Duration (seconds)
- Assumes noise is present at the beginning
- Duration of silence/background noise to analyze
- Default: 1.0 second
- Range: 0.1 - 5.0 seconds

### Spectral Subtraction Alpha
- Over-subtraction factor
- Controls aggressiveness of noise removal
- 1.0: Conservative
- 2.0-3.0: Recommended
- 5.0: Aggressive (may create artifacts)

### Frequency Range
- Preserve audio frequencies within this range
- Remove frequencies outside
- Speech: 300-4000 Hz
- Music: 100-12000 Hz
- General: 300-8000 Hz

## Output Metrics

### SNR (Signal-to-Noise Ratio)
- **Before:** SNR of input audio (dB)
- **After:** SNR of output audio (dB)
- **Improvement:** Difference in SNR (higher is better)

Example: 5 dB improvement means signal is 5dB cleaner

## Project Structure

```
audio-noise-cancellation/
├── app.py                           # Flask web application
├── config.py                        # Configuration settings
├── requirements.txt                 # Python dependencies
├── noise_cancellation/
│   ├── __init__.py
│   ├── audio_processor.py          # Main processing engine
│   ├── fourier_analyzer.py         # Fourier analysis (FFT, STFT)
│   ├── filters.py                  # Filtering algorithms
│   └── utils.py                    # Helper utilities
├── templates/
│   └── index.html                  # Web interface
└── static/
    ├── style.css                   # Styling
    └── script.js                   # Frontend interactivity
```

## Technical Details

### Fourier Analysis
- Uses NumPy's FFT and scipy's STFT
- Window function: Hann window
- FFT size: 2048 bins
- Hop length: 512 samples

### Signal Processing
1. **Noise Estimation** - Analyzes quiet portions
2. **STFT Decomposition** - Converts to frequency domain
3. **Spectral Filtering** - Applies chosen method
4. **Artifact Removal** - Removes clicks and pops
5. **Inverse STFT** - Reconstructs time-domain audio
6. **Normalization** - Preserves loudness

### Audio Formats
- Automatically loaded to 16 kHz mono
- Output: 16-bit WAV format
- Loudness normalized to -20 LUFS

## Troubleshooting

### "File too large" error
- Maximum file size is 50MB
- Reduce file size or compress before uploading

### Poor noise removal
- Increase "Noise Reduction Strength"
- Ensure noise duration is accurate
- Try different processing method

### Audio quality degradation
- Reduce "Noise Reduction Strength"
- Use "Wiener Filter" or "Ensemble" method
- Adjust frequency range (wider range = more preservation)

### Processing takes too long
- Reduce file size
- Use lower sample rate in config
- Close other applications

## Performance

- **Small files (< 10MB):** < 5 seconds
- **Medium files (10-30MB):** 5-15 seconds
- **Large files (30-50MB):** 15-30 seconds

*Times vary based on system performance*

## Browser Support

- Chrome/Chromium (Recommended)
- Firefox
- Safari
- Edge

## Dependencies

- **Flask** - Web framework
- **librosa** - Audio analysis
- **numpy** - Numerical computing
- **scipy** - Scientific computing
- **soundfile** - Audio I/O

## License

MIT License - See LICENSE file for details

## Author

**Kabadiima Emmanuel**
- Email: kemma8069@gmail.com
- GitHub: @Kabadiima-Emmanuel

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For issues, questions, or suggestions:
- Open a GitHub issue
- Email: kemma8069@gmail.com
- Visit: https://github.com/Kabadiima-Emmanuel/audio-noise-cancellation

---

**Made with ❤️ using Fourier Series and Python Signal Processing**
