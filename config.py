import os
from datetime import timedelta

# Flask Configuration
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB max file size
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    OUTPUT_FOLDER = os.path.join(os.path.dirname(__file__), 'outputs')
    ALLOWED_EXTENSIONS = {'wav', 'mp3', 'flac', 'ogg', 'm4a'}
    
    # Audio Processing Parameters
    SAMPLE_RATE = 16000  # Standard sample rate for audio processing
    FFT_SIZE = 2048  # FFT window size
    HOP_LENGTH = 512  # Hop length for STFT
    N_MELS = 128  # Mel-spectrogram bins
    
    # Default Processing Parameters
    DEFAULT_NOISE_DURATION = 1.0  # seconds
    DEFAULT_SPECTRAL_ALPHA = 2.0  # Spectral subtraction factor
    DEFAULT_METHOD = 'ensemble'  # Default processing method
    DEFAULT_FREQ_MIN = 300  # Hz
    DEFAULT_FREQ_MAX = 8000  # Hz

# Create upload and output directories
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
os.makedirs(Config.OUTPUT_FOLDER, exist_ok=True)
