import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle,
  Volume2,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void;
  onUpload?: (audioBlob: Blob) => Promise<string>;
  maxDuration?: number; // in seconds
  minDuration?: number; // in seconds
  showWaveform?: boolean;
  showTranscription?: boolean;
  allowDownload?: boolean;
  autoUpload?: boolean;
  className?: string;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  isPlaying: boolean;
  hasRecording: boolean;
  duration: number;
  audioUrl: string | null;
  error: string | null;
  uploading: boolean;
  uploadProgress: number;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onUpload,
  maxDuration = 300, // 5 minutes default
  minDuration = 3, // 3 seconds minimum
  showWaveform = true,
  showTranscription = false,
  allowDownload = true,
  autoUpload = false,
  className
}) => {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    isPlaying: false,
    hasRecording: false,
    duration: 0,
    audioUrl: null,
    error: null,
    uploading: false,
    uploadProgress: 0
  });

  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context and analyser for visualization
  const setupAudioAnalyser = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Start visualizing audio levels
      const visualize = () => {
        if (!analyserRef.current || !state.isRecording) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255); // Normalize to 0-1
        
        animationFrameRef.current = requestAnimationFrame(visualize);
      };
      
      visualize();
    } catch (error) {
      console.error('Error setting up audio analyser:', error);
    }
  }, [state.isRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Reset state
      setState(prev => ({ ...prev, error: null, hasRecording: false, audioUrl: null }));
      audioChunksRef.current = [];
      setRecordingTime(0);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      
      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setState(prev => ({
          ...prev,
          isRecording: false,
          hasRecording: true,
          audioUrl,
          duration: recordingTime
        }));
        
        // Callback with recording
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob, recordingTime);
        }
        
        // Auto upload if enabled
        if (autoUpload && onUpload) {
          handleUpload(audioBlob);
        }
        
        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      
      setState(prev => ({ ...prev, isRecording: true, isPaused: false }));
      
      // Setup audio visualization
      if (showWaveform) {
        setupAudioAnalyser(stream);
      }
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          
          // Auto-stop at max duration
          if (newTime >= maxDuration) {
            stopRecording();
          }
          
          return newTime;
        });
      }, 1000);
      
    } catch (error: any) {
      console.error('Error starting recording:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to access microphone'
      }));
    }
  }, [maxDuration, onRecordingComplete, autoUpload, onUpload, showWaveform, setupAudioAnalyser]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setAudioLevel(0);
    }
  }, []);

  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    
    if (state.isPaused) {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false }));
      
      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));
      
      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [state.isPaused]);

  // Play recording
  const playRecording = useCallback(() => {
    if (!state.audioUrl) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio(state.audioUrl);
      
      audioRef.current.onended = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
        setPlaybackTime(0);
      };
      
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          setPlaybackTime(Math.floor(audioRef.current.currentTime));
        }
      };
    }
    
    if (state.isPlaying) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    } else {
      audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [state.audioUrl, state.isPlaying]);

  // Reset recording
  const resetRecording = useCallback(() => {
    // Stop any ongoing recording
    if (state.isRecording) {
      stopRecording();
    }
    
    // Stop playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    // Revoke object URL
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    
    // Reset state
    setState({
      isRecording: false,
      isPaused: false,
      isPlaying: false,
      hasRecording: false,
      duration: 0,
      audioUrl: null,
      error: null,
      uploading: false,
      uploadProgress: 0
    });
    
    setRecordingTime(0);
    setPlaybackTime(0);
    setAudioLevel(0);
  }, [state.isRecording, state.audioUrl, stopRecording]);

  // Upload recording
  const handleUpload = useCallback(async (blob?: Blob) => {
    if (!onUpload) return;
    
    const audioBlob = blob || (state.audioUrl ? await fetch(state.audioUrl).then(r => r.blob()) : null);
    if (!audioBlob) return;
    
    setState(prev => ({ ...prev, uploading: true, uploadProgress: 0 }));
    
    try {
      // Simulate progress (real progress would come from upload service)
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          uploadProgress: Math.min(prev.uploadProgress + 10, 90)
        }));
      }, 200);
      
      const url = await onUpload(audioBlob);
      
      clearInterval(progressInterval);
      setState(prev => ({
        ...prev,
        uploading: false,
        uploadProgress: 100
      }));
      
      // Show success briefly
      setTimeout(() => {
        setState(prev => ({ ...prev, uploadProgress: 0 }));
      }, 2000);
      
      return url;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        uploading: false,
        uploadProgress: 0,
        error: error.message || 'Upload failed'
      }));
    }
  }, [onUpload, state.audioUrl]);

  // Download recording
  const downloadRecording = useCallback(() => {
    if (!state.audioUrl) return;
    
    const a = document.createElement('a');
    a.href = state.audioUrl;
    a.download = `recording_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [state.audioUrl]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [state.audioUrl]);

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-6">
        {/* Error Alert */}
        {state.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Main Recording Interface */}
        <div className="space-y-4">
          {/* Waveform Visualization */}
          {showWaveform && state.isRecording && (
            <div className="h-24 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">
              <div className="flex items-end gap-1 h-full py-4">
                {Array.from({ length: 40 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="bg-primary w-1 rounded-full"
                    animate={{
                      height: state.isRecording && !state.isPaused
                        ? `${20 + Math.random() * 60 * audioLevel}%`
                        : '20%'
                    }}
                    transition={{
                      duration: 0.1,
                      ease: 'easeInOut'
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Time Display */}
          <div className="text-center">
            <div className="text-3xl font-mono font-bold">
              {state.isRecording
                ? formatTime(recordingTime)
                : state.hasRecording
                ? formatTime(state.isPlaying ? playbackTime : state.duration)
                : '00:00'}
            </div>
            {state.isRecording && (
              <div className="text-sm text-muted-foreground mt-1">
                Max duration: {formatTime(maxDuration)}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {(state.isRecording || state.isPlaying) && (
            <Progress
              value={
                state.isRecording
                  ? (recordingTime / maxDuration) * 100
                  : (playbackTime / state.duration) * 100
              }
              className="h-2"
            />
          )}

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-2">
            {!state.isRecording && !state.hasRecording && (
              <Button
                size="lg"
                onClick={startRecording}
                className="gap-2"
              >
                <Mic className="h-5 w-5" />
                Start Recording
              </Button>
            )}

            {state.isRecording && (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={togglePause}
                  className="gap-2"
                >
                  {state.isPaused ? (
                    <>
                      <Play className="h-5 w-5" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-5 w-5" />
                      Pause
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={stopRecording}
                  className="gap-2"
                  disabled={recordingTime < minDuration}
                >
                  <MicOff className="h-5 w-5" />
                  Stop
                </Button>
              </>
            )}

            {state.hasRecording && !state.isRecording && (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={playRecording}
                  className="gap-2"
                >
                  {state.isPlaying ? (
                    <>
                      <Pause className="h-5 w-5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Play
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={resetRecording}
                  className="gap-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  Re-record
                </Button>
                {onUpload && !autoUpload && (
                  <Button
                    size="lg"
                    onClick={() => handleUpload()}
                    disabled={state.uploading}
                    className="gap-2"
                  >
                    {state.uploading ? (
                      <>
                        <Activity className="h-5 w-5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        Upload
                      </>
                    )}
                  </Button>
                )}
                {allowDownload && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={downloadRecording}
                    className="gap-2"
                  >
                    <Download className="h-5 w-5" />
                    Download
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Upload Progress */}
          {state.uploadProgress > 0 && (
            <div className="space-y-2">
              <Progress value={state.uploadProgress} className="h-2" />
              <div className="text-center text-sm text-muted-foreground">
                {state.uploadProgress === 100 ? (
                  <span className="text-green-600 flex items-center justify-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Upload complete!
                  </span>
                ) : (
                  `Uploading... ${state.uploadProgress}%`
                )}
              </div>
            </div>
          )}

          {/* Audio Level Indicator */}
          {state.isRecording && !state.isPaused && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Volume2 className="h-4 w-4" />
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-2 w-2 rounded-full transition-colors',
                      audioLevel > (i + 1) * 0.2
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    )}
                  />
                ))}
              </div>
              <span>Audio level</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioRecorder;