import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Calendar, MapPin, Sparkles, Pause, Play } from 'lucide-react';
import { EventData } from '../types';

interface EventCoverSliderProps {
  event: EventData;
  showEventOverlay?: boolean;
  className?: string;
  aspectRatio?: string;
}

export const EventCoverSlider: React.FC<EventCoverSliderProps> = ({
  event,
  showEventOverlay = true,
  className = '',
  aspectRatio = 'aspect-[16/9] sm:aspect-[21/9]',
}) => {
  const images = (event.coverImages && event.coverImages.length > 0)
    ? event.coverImages
    : [event.bannerUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80'];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto slide loop
  useEffect(() => {
    if (images.length <= 1 || isPaused) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [images.length, isPaused]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 shadow-2xl group ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides Container */}
      <div className={`relative w-full ${aspectRatio} overflow-hidden select-none`}>
        {images.map((imgUrl, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={imgUrl}
                alt={`${event.title} - photo ${index + 1}`}
                className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
                  isActive ? 'scale-100' : 'scale-105'
                }`}
                referrerPolicy="no-referrer"
              />
              {/* Dual Gradient Scrim for crisp text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/40" />
            </div>
          );
        })}

        {/* Top Badges Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/90 text-slate-950 backdrop-blur-md shadow-lg shadow-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
              Official Box Office
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-900/80 text-emerald-400 border border-slate-700/80 backdrop-blur-md">
              <Sparkles className="w-3 h-3" />
              Cloud Run Verified
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-slate-300 hover:text-white backdrop-blur-md border border-white/10 transition-colors"
                title={isPaused ? 'Resume auto-slideshow' : 'Pause slideshow'}
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              </button>
            )}

            <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono font-bold text-slate-200 flex items-center gap-1.5">
              <ImageIcon className="w-3 h-3 text-emerald-400" />
              <span>
                {currentIndex + 1} / {images.length}
              </span>
            </div>
          </div>
        </div>

        {/* Optional Event Details Overlay at bottom of slider */}
        {showEventOverlay && (
          <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none">
            <div className="max-w-3xl space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-400">
                <span className="flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-lg backdrop-blur-md border border-emerald-500/30">
                  <Calendar className="w-3.5 h-3.5" />
                  {event.date} • {event.time}
                </span>
                <span className="flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-lg backdrop-blur-md border border-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-slate-300" />
                  {event.venue}, {event.city}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                {event.title}
              </h1>
              {event.subtitle && (
                <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 max-w-2xl drop-shadow">
                  {event.subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Left / Right Nav Arrows (Only if multiple images) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 shadow-xl"
              aria-label="Previous Cover Image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 shadow-xl"
              aria-label="Next Cover Image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Bottom Pagination Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
            {images.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(dotIdx);
                }}
                className={`transition-all duration-300 rounded-full ${
                  dotIdx === currentIndex
                    ? 'w-6 h-2 bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/80'
                }`}
                aria-label={`Jump to slide ${dotIdx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail Strip Gallery (Horizontal Scroll) */}
      {images.length > 1 && (
        <div className="p-3 bg-slate-950/90 border-t border-slate-900 flex items-center gap-2.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 shrink-0 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            Gallery
          </span>
          {images.map((thumbUrl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`relative shrink-0 w-16 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                idx === currentIndex
                  ? 'border-emerald-400 scale-105 shadow-md shadow-emerald-500/20'
                  : 'border-transparent opacity-50 hover:opacity-100 hover:border-slate-700'
              }`}
            >
              <img
                src={thumbUrl}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
