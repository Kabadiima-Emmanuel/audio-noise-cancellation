"""Fourier Analysis Module

Provides FFT-based frequency domain analysis for audio signals.
Includes STFT, spectral analysis, and noise estimation.
"""

import numpy as np
from scipy import signal
from scipy.fftpack import fft, ifft
import librosa

class FourierAnalyzer:
    """Analyzes audio using Fourier Transform techniques."""
    
    def __init__(self, sr=16000, fft_size=2048, hop_length=512):
        """
        Initialize Fourier Analyzer.
        
        Args:
            sr: Sample rate (Hz)
            fft_size: FFT window size
            hop_length: Hop length for STFT
        """
        self.sr = sr
        self.fft_size = fft_size
        self.hop_length = hop_length
        self.window = signal.hann(fft_size)
    
    def compute_stft(self, audio):
        """
        Compute Short-Time Fourier Transform.
        
        Args:
            audio: Input audio signal (1D array)
            
        Returns:
            stft_matrix: Complex STFT matrix (freq_bins x time_frames)
            magnitude: Magnitude spectrogram
            phase: Phase spectrogram
        """
        stft_matrix = librosa.stft(audio, n_fft=self.fft_size, 
                                   hop_length=self.hop_length,
                                   window='hann')
        magnitude = np.abs(stft_matrix)
        phase = np.angle(stft_matrix)
        return stft_matrix, magnitude, phase
    
    def inverse_stft(self, stft_matrix):
        """
        Compute inverse STFT to reconstruct audio.
        
        Args:
            stft_matrix: Complex STFT matrix
            
        Returns:
            audio: Reconstructed audio signal
        """
        audio = librosa.istft(stft_matrix, hop_length=self.hop_length,
                              window='hann')
        return audio
    
    def estimate_noise_spectrum(self, audio, noise_duration):
        """
        Estimate noise spectrum from beginning of audio.
        
        Args:
            audio: Input audio signal
            noise_duration: Duration of noise in seconds
            
        Returns:
            noise_spectrum: Mean noise magnitude spectrum
        """
        noise_samples = int(noise_duration * self.sr)
        noise_segment = audio[:noise_samples]
        
        _, noise_mag, _ = self.compute_stft(noise_segment)
        noise_spectrum = np.mean(noise_mag, axis=1, keepdims=True)
        
        return noise_spectrum
    
    def compute_power_spectrum(self, audio):
        """
        Compute power spectrum density.
        
        Args:
            audio: Input audio signal
            
        Returns:
            freqs: Frequency values
            psd: Power spectrum density
        """
        freqs, psd = signal.welch(audio, fs=self.sr, nperseg=self.fft_size)
        return freqs, psd
    
    def compute_spectrogram(self, audio):
        """
        Compute mel-spectrogram.
        
        Args:
            audio: Input audio signal
            
        Returns:
            mel_spec: Mel-spectrogram (dB scale)
            freqs: Mel frequency bins
        """
        mel_spec = librosa.feature.melspectrogram(y=audio, sr=self.sr,
                                                   n_fft=self.fft_size,
                                                   hop_length=self.hop_length)
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        freqs = librosa.mel_frequencies(n_mels=mel_spec.shape[0], fmin=0, fmax=self.sr//2)
        return mel_spec_db, freqs
    
    def get_frequency_bins(self):
        """
        Get frequency values for FFT bins.
        
        Returns:
            freqs: Frequency values for each bin
        """
        freqs = np.fft.rfftfreq(self.fft_size, 1.0 / self.sr)
        return freqs
    
    def spectral_centroid(self, magnitude):
        """
        Compute spectral centroid for each frame.
        
        Args:
            magnitude: Magnitude spectrogram
            
        Returns:
            centroids: Spectral centroid values
        """
        freqs = self.get_frequency_bins()
        numerator = np.sum(freqs[:, np.newaxis] * magnitude, axis=0)
        denominator = np.sum(magnitude, axis=0)
        centroids = numerator / (denominator + 1e-10)
        return centroids
