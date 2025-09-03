import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Download,
  MoreVertical,
  MessageSquare,
  FileText,
  Mic
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  title?: string;
  subtitle?: string;
  timestamp?: Date;
  transcription?: string;
  showTranscription?: boolean;
  showFeedbackButton?: boolean;
  onFeedback?: (timestamp: number) => void;
  onTranscribe?: () => void;
  allowDownload?: boolean;
  compact?: boolean;
  className?: string;
  autoPlay?: boolean;
  feedbackCount?: number;
  isListened?: boolean;
  onListened?: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  duration: propDuration,
  title,
  subtitle,
  timestamp,
  transcription,
  showTranscription = false,
  showFeedbackButton = false,
  onFeedback,
  onTranscribe,
  allowDownload = true,
  compact = false,
  className,
  autoPlay = false,
  feedbackCount = 0,
  isListened = false,
  onListened
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(propDuration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressAnimationRef = useRef<number | null>(null);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Event listeners
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
      setIsLoading(false);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      setError('Failed to load audio');
      setIsLoading(false);
    });

    // Set initial volume
    audio.volume = volume;

    // Auto-play if enabled
    if (autoPlay) {
      audio.play().catch(console.error);
      setIsPlaying(true);
    }

    return () => {
      if (progressAnimationRef.current) {
        cancelAnimationFrame(progressAnimationRef.current);
      }
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl, autoPlay, volume]);

  // Handle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
      
      // Mark as listened on first play
      if (!isListened && onListened) {
        onListened();
      }
    }
    setIsPlaying(!isPlaying);
  };

  // Handle seek
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    const newVolume = value[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Toggle mute
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Skip forward/backward
  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
  };

  // Change playback rate
  const changePlaybackRate = () => {
    if (!audioRef.current) return;
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    audioRef.current.playbackRate = newRate;
    setPlaybackRate(newRate);
  };

  // Download audio
  const downloadAudio = () => {
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `audio_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Add feedback at current timestamp
  const addFeedback = () => {
    if (onFeedback) {
      onFeedback(currentTime);
    }
  };

  // Format time
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    // Compact inline player
    return (
      <div className={cn('flex items-center gap-3 p-3 bg-gray-50 rounded-lg', className)}>
        <Button
          size="sm"
          variant="ghost"
          onClick={togglePlayPause}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 space-y-1">
          {(title || subtitle) && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {title && <span className="text-sm font-medium">{title}</span>}
                {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
              </div>
              {!isListened && (
                <Badge variant="secondary" className="text-xs">New</Badge>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Slider
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
              disabled={isLoading}
            />
            <span className="text-xs text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        {feedbackCount > 0 && (
          <Badge variant="outline" className="gap-1">
            <MessageSquare className="h-3 w-3" />
            {feedbackCount}
          </Badge>
        )}
      </div>
    );
  }

  // Full player
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-6">
        {/* Header */}
        {(title || subtitle || timestamp) && (
          <div className="mb-4">
            <div className="flex items-start justify-between">
              <div>
                {title && <h3 className="font-semibold">{title}</h3>}
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                {timestamp && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(timestamp, 'MMM dd, yyyy • HH:mm')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isListened && (
                  <Badge variant="secondary">New</Badge>
                )}
                {feedbackCount > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {feedbackCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Waveform/Progress Bar */}
        <div className="mb-4">
          <div className="relative h-16 bg-gray-100 rounded-lg overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary/20"
              style={{ width: `${progressPercentage}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-end gap-0.5 h-full py-2">
                {Array.from({ length: 50 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-1 rounded-full',
                      i / 50 < progressPercentage / 100
                        ? 'bg-primary'
                        : 'bg-gray-300'
                    )}
                    style={{
                      height: `${30 + Math.random() * 40}%`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* Time slider */}
          <div className="mt-2">
            <Slider
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={handleSeek}
              disabled={isLoading}
            />
          </div>
          
          {/* Time display */}
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">{formatTime(currentTime)}</span>
            <span className="text-xs text-muted-foreground">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Skip backward */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => skip(-10)}
              disabled={isLoading}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            {/* Play/Pause */}
            <Button
              size="icon"
              onClick={togglePlayPause}
              disabled={isLoading}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            {/* Skip forward */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => skip(10)}
              disabled={isLoading}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-24"
              />
            </div>

            {/* Playback rate */}
            <Button
              size="sm"
              variant="ghost"
              onClick={changePlaybackRate}
            >
              {playbackRate}x
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {showFeedbackButton && (
              <Button
                size="sm"
                variant="outline"
                onClick={addFeedback}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Add Feedback
              </Button>
            )}

            {/* More options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {showTranscription && (
                  <>
                    <DropdownMenuItem onClick={() => setShowTranscript(!showTranscript)}>
                      <FileText className="h-4 w-4 mr-2" />
                      {showTranscript ? 'Hide' : 'Show'} Transcript
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {onTranscribe && !transcription && (
                  <>
                    <DropdownMenuItem onClick={onTranscribe}>
                      <Mic className="h-4 w-4 mr-2" />
                      Generate Transcript
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {allowDownload && (
                  <DropdownMenuItem onClick={downloadAudio}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Audio
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Transcription */}
        {showTranscript && transcription && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transcription
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {transcription}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioPlayer;