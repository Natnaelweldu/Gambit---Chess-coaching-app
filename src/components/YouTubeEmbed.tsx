import React, { useState } from 'react';
import { Play } from 'lucide-react';

interface YouTubeEmbedProps {
  url: string;
  title: string;
  className?: string;
}

// Extract safe 11-char YouTube video ID
export const getYouTubeVideoId = (url: string): string => {
  if (!url) return '';
  try {
    if (url.includes('youtube.com/embed/')) {
      const parts = url.split('youtube.com/embed/');
      if (parts.length > 1) return parts[1].split(/[?#]/)[0];
    }
    if (url.includes('youtube.com/watch')) {
      const parts = url.split('v=');
      if (parts.length > 1) return parts[1].split('&')[0];
    }
    if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/');
      if (parts.length > 1) return parts[1].split(/[?#]/)[0];
    }
    if (url.includes('youtube.com/shorts/')) {
      const parts = url.split('youtube.com/shorts/');
      if (parts.length > 1) return parts[1].split(/[?#]/)[0];
    }
    const match = url.match(/[a-zA-Z0-9_-]{11}/);
    if (match) return match[0];
  } catch (e) {
    // Parser fallback
  }
  return '';
};

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ url, title, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoId = getYouTubeVideoId(url);

  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`
    : url;

  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null;

  if (!isPlaying && thumbnailUrl) {
    return (
      <div
        id={`youtube-preview-${videoId || 'custom'}`}
        onClick={() => setIsPlaying(true)}
        className={`group relative aspect-video w-full rounded-xl overflow-hidden border border-slate-900 shadow-xl bg-slate-950 cursor-pointer select-none ${className}`}
      >
        {/* Thumbnail Image */}
        <img
          src={thumbnailUrl}
          alt={title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
          loading="lazy"
        />

        {/* Backdrop overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-slate-950/20 group-hover:via-slate-950/20 transition-all duration-300" />

        {/* Play Button Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/35 border border-amber-400/50 transform transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-400 active:scale-95">
            <Play className="w-6 h-6 fill-slate-950 stroke-[2.5] translate-x-0.5" />
          </div>
        </div>

        {/* Mini Title overlay */}
        <div className="absolute bottom-3 left-3 right-3 text-left">
          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-0.5">Recommended Lesson</p>
          <p className="text-xs font-bold text-white leading-snug drop-shadow-md truncate">{title}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`aspect-video w-full rounded-xl overflow-hidden border border-slate-900 shadow-xl bg-black ${className}`}>
      <iframe
        className="w-full h-full"
        src={embedUrl}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
};
