"""Audio Noise Cancellation Package

A comprehensive audio processing library for noise reduction using
Fourier analysis and advanced signal processing techniques.
"""

__version__ = '1.0.0'
__author__ = 'Kabadiima Emmanuel'

from .audio_processor import AudioProcessor
from .fourier_analyzer import FourierAnalyzer
from .filters import NoiseFilter
from .utils import normalize_audio, calculate_snr

__all__ = [
    'AudioProcessor',
    'FourierAnalyzer',
    'NoiseFilter',
    'normalize_audio',
    'calculate_snr'
]
