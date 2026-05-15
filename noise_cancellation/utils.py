"""Utility Functions

Helper functions for audio processing, normalization, and metrics.
"""

import numpy as np
from scipy import signal
import librosa

def normalize_audio(audio, target_loudness=-20.0):
    """
    Normalize audio to target loudness using LUFS.
    
    Args:
        audio: Input audio signal
        target_loudness: Target loudness in LUFS (dB)
        
    Returns:
        normalized_audio: Normalized audio
    """
    # Compute RMS
    rms = np.sqrt(np.mean(audio ** 2))
    
    if rms == 0:
        return audio
    
    # Calculate gain
    current_loudness = 20 * np.log10(rms)
    gain_db = target_loudness - current_loudness
    gain_linear = 10 ** (gain_db / 20)
    
    normalized_audio = audio * gain_linear
    
    # Prevent clipping
    max_val = np.max(np.abs(normalized_audio))
    if max_val > 1.0:
        normalized_audio = normalized_audio / max_val * 0.99
    
    return normalized_audio

def calculate_snr(signal_audio, noise_audio):
    """
    Calculate Signal-to-Noise Ratio (SNR).
    
    Args:
        signal_audio: Signal component
        noise_audio: Noise component
        
    Returns:
        snr_db: SNR in dB
    """
    signal_power = np.mean(signal_audio ** 2)
    noise_power = np.mean(noise_audio ** 2)
    
    if noise_power == 0:
        return 100.0
    
    snr_db = 10 * np.log10(signal_power / noise_power)
    return snr_db

def estimate_snr(audio, noise_duration=1.0, sr=16000):
    """
    Estimate SNR from audio with noise at beginning.
    
    Args:
        audio: Input audio signal
        noise_duration: Duration of noise in seconds
        sr: Sample rate
        
    Returns:
        snr_db: Estimated SNR in dB
    """
    noise_samples = int(noise_duration * sr)
    noise_segment = audio[:noise_samples]
    signal_segment = audio[noise_samples:]
    
    snr_db = calculate_snr(signal_segment, noise_segment)
    return snr_db

def apply_fade(audio, fade_duration=0.05, sr=16000):
    """
    Apply fade-in and fade-out to prevent clicks.
    
    Args:
        audio: Input audio signal
        fade_duration: Fade duration in seconds
        sr: Sample rate
        
    Returns:
        faded_audio: Audio with fades applied
    """
    fade_samples = int(fade_duration * sr)
    fade_samples = min(fade_samples, len(audio) // 2)
    
    if fade_samples <= 0:
        return audio
    
    faded_audio = audio.copy()
    
    # Fade in
    fade_in = np.linspace(0, 1, fade_samples)
    faded_audio[:fade_samples] *= fade_in
    
    # Fade out
    fade_out = np.linspace(1, 0, fade_samples)
    faded_audio[-fade_samples:] *= fade_out
    
    return faded_audio

def remove_clicks(audio, threshold_std=3.0):
    """
    Remove clicks and pops using outlier detection.
    
    Args:
        audio: Input audio signal
        threshold_std: Threshold in standard deviations
        
    Returns:
        click_free_audio: Audio with clicks removed
    """
    mean = np.mean(audio)
    std = np.std(audio)
    
    # Identify outliers
    outlier_mask = np.abs(audio - mean) > threshold_std * std
    
    if not np.any(outlier_mask):
        return audio
    
    # Interpolate outliers
    click_free_audio = audio.copy()
    outlier_indices = np.where(outlier_mask)[0]
    
    for idx in outlier_indices:
        if 0 < idx < len(audio) - 1:
            click_free_audio[idx] = (audio[idx - 1] + audio[idx + 1]) / 2
    
    return click_free_audio

def compute_spectral_features(magnitude, sr=16000, fft_size=2048):
    """
    Compute spectral features from magnitude spectrogram.
    
    Args:
        magnitude: Magnitude spectrogram
        sr: Sample rate
        fft_size: FFT size
        
    Returns:
        features: Dictionary with spectral features
    """
    freqs = np.fft.rfftfreq(fft_size, 1.0 / sr)
    
    # Spectral centroid
    numerator = np.sum(freqs[:, np.newaxis] * magnitude, axis=0)
    denominator = np.sum(magnitude, axis=0)
    centroid = numerator / (denominator + 1e-10)
    
    # Spectral spread
    spread = np.sqrt(np.sum((freqs[:, np.newaxis] - centroid) ** 2 * magnitude, axis=0) / (denominator + 1e-10))
    
    # Spectral rolloff (95% of energy)
    energy = np.cumsum(magnitude, axis=0)
    total_energy = energy[-1, :]
    rolloff_idx = np.argmax(energy >= 0.95 * total_energy, axis=0)
    rolloff = freqs[rolloff_idx]
    
    return {
        'centroid': centroid,
        'spread': spread,
        'rolloff': rolloff
    }
