"""Flask Web Application for Audio Noise Cancellation

Provides REST API and web interface for audio processing.
"""

from flask import Flask, render_template, request, jsonify, send_file
import os
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime
from config import Config
from noise_cancellation.audio_processor import AudioProcessor

app = Flask(__name__)
app.config.from_object(Config)

# Initialize audio processor
processor = AudioProcessor(sr=Config.SAMPLE_RATE, fft_size=Config.FFT_SIZE,
                          hop_length=Config.HOP_LENGTH)

def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Render main page."""
    return render_template('index.html')

@app.route('/api/methods', methods=['GET'])
def get_methods():
    """Get available processing methods and descriptions."""
    methods = {
        'spectral': 'Spectral Subtraction: Direct noise spectrum removal. Best for consistent background noise.',
        'wiener': 'Wiener Filter: Optimal filtering based on signal-to-noise ratio. Great for preserving signal quality.',
        'ensemble': 'Ensemble Method: Combines spectral subtraction and Wiener filter. Recommended for best results.'
    }
    return jsonify(methods)

@app.route('/api/process', methods=['POST'])
def process_audio():
    """Process uploaded audio file."""
    try:
        # Check if file was uploaded
        if 'audio_file' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        file = request.files['audio_file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Supported: WAV, MP3, FLAC, OGG, M4A'}), 400
        
        # Get processing parameters
        noise_duration = float(request.form.get('noise_duration', Config.DEFAULT_NOISE_DURATION))
        spectral_sub_alpha = float(request.form.get('spectral_sub_alpha', Config.DEFAULT_SPECTRAL_ALPHA))
        method = request.form.get('method', Config.DEFAULT_METHOD)
        freq_min = int(request.form.get('freq_min', Config.DEFAULT_FREQ_MIN))
        freq_max = int(request.form.get('freq_max', Config.DEFAULT_FREQ_MAX))
        
        # Validate parameters
        if noise_duration <= 0 or noise_duration > 5:
            return jsonify({'error': 'Noise duration must be between 0 and 5 seconds'}), 400
        
        if spectral_sub_alpha <= 0 or spectral_sub_alpha > 10:
            return jsonify({'error': 'Spectral subtraction factor must be between 0 and 10'}), 400
        
        if freq_min < 0 or freq_max > 22050 or freq_min >= freq_max:
            return jsonify({'error': 'Invalid frequency range'}), 400
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        upload_id = str(uuid.uuid4())
        upload_path = os.path.join(Config.UPLOAD_FOLDER, f'{upload_id}_{filename}')
        file.save(upload_path)
        
        # Process audio
        clean_audio, metadata = processor.process(
            upload_path,
            noise_duration=noise_duration,
            alpha=spectral_sub_alpha,
            method=method,
            freq_min=freq_min,
            freq_max=freq_max
        )
        
        # Save output
        output_filename = f'cleaned_{upload_id}_{os.path.splitext(filename)[0]}.wav'
        output_path = os.path.join(Config.OUTPUT_FOLDER, output_filename)
        processor.save_audio(clean_audio, output_path)
        
        # Clean up upload
        os.remove(upload_path)
        
        return jsonify({
            'success': True,
            'download_url': f'/api/download/{output_filename}',
            'metadata': {
                'output_file': output_filename,
                'duration_seconds': metadata['duration_seconds'],
                'sample_rate': metadata['sample_rate'],
                'method': metadata['method'],
                'noise_duration': metadata['noise_duration'],
                'spectral_sub_alpha': metadata['spectral_sub_alpha'],
                'freq_min': metadata['freq_min'],
                'freq_max': metadata['freq_max'],
                'snr_before': metadata['snr_before'],
                'snr_after': metadata['snr_after'],
                'snr_improvement': metadata['snr_improvement']
            }
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download/<filename>', methods=['GET'])
def download_audio(filename):
    """Download processed audio file."""
    try:
        file_path = os.path.join(Config.OUTPUT_FOLDER, secure_filename(filename))
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(file_path, as_attachment=True, mimetype='audio/wav')
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error."""
    return jsonify({'error': 'File too large. Maximum size is 50MB'}), 413

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors."""
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
