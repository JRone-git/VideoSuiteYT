import React, { useRef, useEffect, useState } from 'react';

interface PreviewProps {
  videoPath?: string;
  posterPath?: string;
  captions?: Caption[];
  currentTime: number;
  onTimeUpdate?: (time: number) => void;
  onPlayStateChange?: (playing: boolean) => void;
}

interface Caption {
  start: number;
  end: number;
  text: string;
}

export function Preview({
  videoPath,
  posterPath,
  captions = [],
  currentTime,
  onTimeUpdate,
  onPlayStateChange,
}: PreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [currentCaption, setCurrentCaption] = useState<string>('');

  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    const handleTimeUpdate = () => {
      const time = video.currentTime;
      onTimeUpdate?.(time);
      
      // Find current caption
      const caption = captions.find(
        c => time >= c.start && time <= c.end
      );
      setCurrentCaption(caption?.text || '');
    };
    
    const handleDurationChange = () => {
      setDuration(video.duration);
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChange?.(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [captions, onTimeUpdate, onPlayStateChange]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  };

  return (
    <div className="preview-container">
      <div className="preview-video-wrapper">
        {videoPath ? (
          <video
            ref={videoRef}
            className="preview-video"
            src={videoPath}
            poster={posterPath}
            onClick={togglePlay}
          />
        ) : (
          <div className="preview-placeholder">
            <div className="placeholder-icon">🎬</div>
            <p>No video loaded</p>
            <p className="hint">Generate a video to preview</p>
          </div>
        )}
        
        {/* Captions overlay */}
        {currentCaption && (
          <div className="preview-captions">
            <span>{currentCaption}</span>
          </div>
        )}
        
        {/* Play button overlay */}
        {videoPath && !isPlaying && (
          <button className="preview-play-btn" onClick={togglePlay}>
            ▶
          </button>
        )}
      </div>
      
      {/* Controls */}
      <div className="preview-controls">
        <div className="controls-left">
          <button className="control-btn" onClick={() => skip(-5)} title="Back 5s">
            ⏪
          </button>
          <button className="control-btn play-btn" onClick={togglePlay}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="control-btn" onClick={() => skip(5)} title="Forward 5s">
            ⏩
          </button>
        </div>
        
        <div className="controls-center">
          <span className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <input
            type="range"
            className="seek-bar"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
          />
        </div>
        
        <div className="controls-right">
          <span className="volume-icon">🔊</span>
          <input
            type="range"
            className="volume-slider"
            min={0}
            max={1}
            step={0.1}
            value={volume}
            onChange={handleVolumeChange}
          />
        </div>
      </div>
    </div>
  );
}