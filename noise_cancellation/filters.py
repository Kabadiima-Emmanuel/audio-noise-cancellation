"""Advanced Filtering Module

Implements various noise reduction filtering techniques including
Spectral Subtraction, Wiener Filter, and Bandpass Filter.
"""

import numpy as np
from scipy import signal

class NoiseFilter:
    """Advanced noise filtering for audio signals."""
    
    def __init__(self, sr=16000, fft_size=2048):
        """
        Initialize Noise Filter.
        
        Args:
            sr: Sample rate (Hz)
            fft_size: FFT window size
        """
        self.sr = sr
        self.fft_size = fft_size
    
    def spectral_subtraction(self, magnitude, noise_spectrum, alpha=2.0):
        """
        Spectral Subtraction - remove estimated noise spectrum.
        
        Args:
            magnitude: Input magnitude spectrogram
            noise_spectrum: Estimated noise spectrum
            alpha: Over-subtraction factor (higher = more aggressive)
            
        Returns:
            clean_magnitude: Noise-reduced magnitude spectrogram
        """
        clean_magnitude = magnitude - alpha * noise_spectrum
        clean_magnitude = np.maximum(clean_magnitude, 0.1 * magnitude)  # Prevent over-subtraction
        return clean_magnitude
    
    def wiener_filter(self, magnitude, noise_spectrum, snr_threshold=1.0):
        """
        Wiener Filter - optimal filtering based on SNR.
        
        Args:
            magnitude: Input magnitude spectrogram
            noise_spectrum: Estimated noise spectrum
            snr_threshold: Minimum SNR threshold
            
        Returns:
            clean_magnitude: Wiener filtered magnitude spectrogram
        """
        # Compute SNR for each frequency bin
        snr = magnitude / (noise_spectrum + 1e-10)
        
        # Wiener gain function
        gain = snr / (1 + snr + 1e-10)
        gain = np.maximum(gain, snr_threshold / (1 + snr_threshold))
        
        clean_magnitude = gain * magnitude
        return clean_magnitude
    
    def bandpass_filter(self, magnitude, freq_bins, freq_min=300, freq_max=8000):
        """
        Bandpass Filter - preserve frequencies within range.
        
        Args:
            magnitude: Input magnitude spectrogram
            freq_bins: Frequency values for each bin
            freq_min: Minimum frequency (Hz)
            freq_max: Maximum frequency (Hz)
            
        Returns:
            filtered_magnitude: Bandpass filtered magnitude spectrogram
        """
        # Create frequency mask
        mask = (freq_bins >= freq_min) & (freq_bins <= freq_max)
        mask = mask[:, np.newaxis]
        
        # Apply smooth transition at edges
        filtered_magnitude = magnitude.copy()
        
        # Attenuation outside frequency range
        filtered_magnitude[~mask] *= 0.1
        
        return filtered_magnitude
    
    def butterworth_lowpass(self, audio, cutoff_freq, order=4):
        """
        Butterworth lowpass filter in time domain.
        
        Args:
            audio: Input audio signal
            cutoff_freq: Cutoff frequency (Hz)
            order: Filter order
            
        Returns:
            filtered_audio: Lowpass filtered audio
        """
        nyquist = self.sr / 2
        normalized_cutoff = cutoff_freq / nyquist
        
        if normalized_cutoff >= 1.0:
            return audio
        
        b, a = signal.butter(order, normalized_cutoff, btype='low')
        filtered_audio = signal.filtfilt(b, a, audio)
        return filtered_audio
    
    def butterworth_highpass(self, audio, cutoff_freq, order=4):
        """
        Butterworth highpass filter in time domain.
        
        Args:
            audio: Input audio signal
            cutoff_freq: Cutoff frequency (Hz)
            order: Filter order
            
        Returns:
            filtered_audio: Highpass filtered audio
        """
        nyquist = self.sr / 2
        normalized_cutoff = cutoff_freq / nyquist
        
        if normalized_cutoff <= 0.0:
            return audio
        
        b, a = signal.butter(order, normalized_cutoff, btype='high')
        filtered_audio = signal.filtfilt(b, a, audio)
        return filtered_audio
    
    def median_filter(self, magnitude, kernel_size=5):
        """
        Median filter for spectral smoothing.
        
        Args:
            magnitude: Input magnitude spectrogram
            kernel_size: Filter kernel size
            
        Returns:
            filtered_magnitude: Median filtered magnitude spectrogram
        """
        from scipy.ndimage import median_filter as scipy_median_filter
        filtered_magnitude = scipy_median_filter(magnitude, size=kernel_size)
        return filtered_magnitude
    
    def spectral_gating(self, magnitude, noise_spectrum, threshold_db=40):
        """
        Spectral Gating - suppress low energy components.
        
        Args:
            magnitude: Input magnitude spectrogram
            noise_spectrum: Estimated noise spectrum
            threshold_db: Gating threshold in dB
            
        Returns:
            gated_magnitude: Gated magnitude spectrogram
        """
        # Convert to dB
        mag_db = 20 * np.log10(magnitude + 1e-10)
        noise_db = 20 * np.log10(noise_spectrum + 1e-10)
        
        # Create gate based on threshold
        gate = mag_db > (noise_db + threshold_db)
        
        gated_magnitude = magnitude * gate.astype(float)
        return gated_magnitude
