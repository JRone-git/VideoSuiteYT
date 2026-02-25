import React from 'react';

interface TimelineClip {
  id: string;
  type: 'video' | 'audio' | 'caption';
  start: number;
  duration: number;
  label: string;
  color?: string;
}

interface TimelineProps {
  clips: TimelineClip[];
  duration: number;
  currentTime: number;
  onClipSelect: (clipId: string) => void;
  onTimeSeek: (time: number) => void;
  selectedClipId?: string;
}

const COLORS = {
  video: '#6366f1',
  audio: '#22c55e',
  caption: '#f59e0b',
};

export function Timeline({
  clips,
  duration,
  currentTime,
  onClipSelect,
  onTimeSeek,
  selectedClipId,
}: TimelineProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    onTimeSeek(time);
  };

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <span className="timeline-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <div className="timeline-controls">
          <button className="timeline-btn" title="Zoom In">🔍+</button>
          <button className="timeline-btn" title="Zoom Out">🔍-</button>
          <button className="timeline-btn" title="Fit">⊡</button>
        </div>
      </div>
      
      <div className="timeline-ruler" onClick={handleClick}>
        {Array.from({ length: Math.ceil(duration / 5) + 1 }).map((_, i) => (
          <div
            key={i}
            className="ruler-mark"
            style={{ left: `${(i * 5 / duration) * 100}%` }}
          >
            <span className="ruler-label">{formatTime(i * 5)}</span>
          </div>
        ))}
        <div
          className="playhead"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      </div>
      
      <div className="timeline-tracks">
        {/* Video Track */}
        <div className="timeline-track">
          <div className="track-label">🎬 Video</div>
          <div className="track-content">
            {clips
              .filter(clip => clip.type === 'video')
              .map(clip => (
                <div
                  key={clip.id}
                  className={`timeline-clip ${selectedClipId === clip.id ? 'selected' : ''}`}
                  style={{
                    left: `${(clip.start / duration) * 100}%`,
                    width: `${(clip.duration / duration) * 100}%`,
                    backgroundColor: clip.color || COLORS.video,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClipSelect(clip.id);
                  }}
                >
                  <span className="clip-label">{clip.label}</span>
                </div>
              ))}
          </div>
        </div>
        
        {/* Audio Track */}
        <div className="timeline-track">
          <div className="track-label">🔊 Audio</div>
          <div className="track-content">
            {clips
              .filter(clip => clip.type === 'audio')
              .map(clip => (
                <div
                  key={clip.id}
                  className={`timeline-clip ${selectedClipId === clip.id ? 'selected' : ''}`}
                  style={{
                    left: `${(clip.start / duration) * 100}%`,
                    width: `${(clip.duration / duration) * 100}%`,
                    backgroundColor: clip.color || COLORS.audio,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClipSelect(clip.id);
                  }}
                >
                  <span className="clip-label">{clip.label}</span>
                </div>
              ))}
          </div>
        </div>
        
        {/* Caption Track */}
        <div className="timeline-track">
          <div className="track-label">📝 Captions</div>
          <div className="track-content">
            {clips
              .filter(clip => clip.type === 'caption')
              .map(clip => (
                <div
                  key={clip.id}
                  className={`timeline-clip ${selectedClipId === clip.id ? 'selected' : ''}`}
                  style={{
                    left: `${(clip.start / duration) * 100}%`,
                    width: `${(clip.duration / duration) * 100}%`,
                    backgroundColor: clip.color || COLORS.caption,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClipSelect(clip.id);
                  }}
                >
                  <span className="clip-label">{clip.label}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}