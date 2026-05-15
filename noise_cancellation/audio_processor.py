"""Main Audio Processing Module

Core engine for audio noise cancellation using Fourier analysis
and advanced filtering techniques.
"""

import numpy as np
import librosa
import soundfile as sf
from .fourier_analyzer import FourierAnalyzer
from .filters import NoiseFilter
from .utils import normalize_audio, calculate_snr, apply_fade, remove_clicks, estimate_snr

class AudioProcessor:
    """Main processor for audio noise cancellation."""
    
    def __init__(self, sr=16000, fft_size=2048, hop_length=512):
        """
        Initialize Audio Processor.
        
        Args:
            sr: Sample rate (Hz)
            fft_size: FFT window size
            hop_length: Hop length for STFT
        """
        self.sr = sr
        self.fft_size = fft_size
        self.hop_length = hop_length
        
        self.analyzer = FourierAnalyzer(sr, fft_size, hop_length)
        self.filter = NoiseFilter(sr, fft_size)
        
        self.metadata = {}
    
    def load_audio(self, file_path):
        """
        Load audio file.
        
        Args:
            file_path: Path to audio file
            
        Returns:
            audio: Audio signal
        """
        audio, sr = librosa.load(file_path, sr=self.sr, mono=True)
        return audio
    
    def save_audio(self, audio, file_path):
        """
        Save audio file.
        
        Args:
            audio: Audio signal
            file_path: Output path
        """
        sf.write(file_path, audio, self.sr)
    
    def process_spectral_subtraction(self, audio, noise_duration=1.0, alpha=2.0,
                                     freq_min=300, freq_max=8000):
        """
        Process audio using Spectral Subtraction.
        
        Args:
            audio: Input audio signal
            noise_duration: Duration of noise in seconds
            alpha: Over-subtraction factor
            freq_min: Minimum frequency
            freq_max: Maximum frequency
            
        Returns:
            clean_audio: Noise-reduced audio
        """
        # Compute STFT
        stft_matrix, magnitude, phase = self.analyzer.compute_stft(audio)
        
        # Estimate noise spectrum
        noise_spectrum = self.analyzer.estimate_noise_spectrum(audio, noise_duration)
        
        # Spectral subtraction
        clean_magnitude = self.filter.spectral_subtraction(magnitude, noise_spectrum, alpha)
        
        # Bandpass filtering
        freq_bins = self.analyzer.get_frequency_bins()
        clean_magnitude = self.filter.bandpass_filter(clean_magnitude, freq_bins, freq_min, freq_max)
        
        # Reconstruct STFT
        clean_stft = clean_magnitude * np.exp(1j * phase)
        
        # Inverse STFT
        clean_audio = self.analyzer.inverse_stft(clean_stft)
        
        return clean_audio
    
    def process_wiener(self, audio, noise_duration=1.0, freq_min=300, freq_max=8000):
        """
        Process audio using Wiener Filter.
        
        Args:
            audio: Input audio signal
            noise_duration: Duration of noise in seconds
            freq_min: Minimum frequency
            freq_max: Maximum frequency
            
        Returns:
            clean_audio: Noise-reduced audio
        """
        # Compute STFT
        stft_matrix, magnitude, phase = self.analyzer.compute_stft(audio)
        
        # Estimate noise spectrum
        noise_spectrum = self.analyzer.estimate_noise_spectrum(audio, noise_duration)
        
        # Wiener filtering
        clean_magnitude = self.filter.wiener_filter(magnitude, noise_spectrum)
        
        # Bandpass filtering
        freq_bins = self.analyzer.get_frequency_bins()
        clean_magnitude = self.filter.bandpass_filter(clean_magnitude, freq_bins, freq_min, freq_max)
        
        # Reconstruct STFT
        clean_stft = clean_magnitude * np.exp(1j * phase)
        
        # Inverse STFT
        clean_audio = self.analyzer.inverse_stft(clean_stft)
        
        return clean_audio
    
    def process_ensemble(self, audio, noise_duration=1.0, alpha=2.0,
                        freq_min=300, freq_max=8000):
        """
        Process audio using ensemble method (combination of all methods).
        
        Args:
            audio: Input audio signal
            noise_duration: Duration of noise in seconds
            alpha: Over-subtraction factor
            freq_min: Minimum frequency
            freq_max: Maximum frequency
            
        Returns:
            clean_audio: Noise-reduced audio
        """
        # Process with both methods
        spectral_audio = self.process_spectral_subtraction(audio, noise_duration, alpha, freq_min, freq_max)
        wiener_audio = self.process_wiener(audio, noise_duration, freq_min, freq_max)
        
        # Average the results
        clean_audio = (spectral_audio + wiener_audio) / 2
        
        # Apply post-processing
        clean_audio = remove_clicks(clean_audio)
        clean_audio = apply_fade(clean_audio, fade_duration=0.05, sr=self.sr)
        
        return clean_audio
    
    def process(self, audio_file, noise_duration=1.0, alpha=2.0, method='ensemble',
               freq_min=300, freq_max=8000):
        """
        Main processing method.
        
        Args:
            audio_file: Input audio file path
            noise_duration: Duration of noise in seconds
            alpha: Over-subtraction factor for spectral subtraction
            method: Processing method ('spectral', 'wiener', or 'ensemble')
            freq_min: Minimum frequency
            freq_max: Maximum frequency
            
        Returns:
            clean_audio: Noise-reduced audio
            metadata: Processing metadata
        """
        # Load audio
        audio = self.load_audio(audio_file)
        original_audio = audio.copy()
        
        # Normalize
        audio = normalize_audio(audio, target_loudness=-20.0)
        
        # Calculate input SNR
        snr_before = estimate_snr(audio, noise_duration, self.sr)
        
        # Process based on method
        if method == 'spectral':
            clean_audio = self.process_spectral_subtraction(audio, noise_duration, alpha, freq_min, freq_max)
        elif method == 'wiener':
            clean_audio = self.process_wiener(audio, noise_duration, freq_min, freq_max)
        else:  # ensemble
            clean_audio = self.process_ensemble(audio, noise_duration, alpha, freq_min, freq_max)
        
        # Normalize output
        clean_audio = normalize_audio(clean_audio, target_loudness=-20.0)
        
        # Calculate output SNR
        snr_after = estimate_snr(clean_audio, noise_duration, self.sr)
        
        # Store metadata
        self.metadata = {
            'duration_seconds': len(audio) / self.sr,
            'sample_rate': self.sr,
            'method': method,
            'noise_duration': noise_duration,
            'spectral_sub_alpha': alpha,
            'freq_min': freq_min,
            'freq_max': freq_max,
            'snr_before': snr_before,
            'snr_after': snr_after,
            'snr_improvement': snr_after - snr_before
        }
        
        return clean_audio, self.metadata
