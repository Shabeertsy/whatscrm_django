import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioMessageProps {
  mediaUrl: string;
}


export function AudioMessage({ mediaUrl }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => { setIsPlaying(false); setProgress(0); };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);



  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const seekTo = (parseFloat(e.target.value) / 100) * audioRef.current.duration;
      audioRef.current.currentTime = seekTo;
      setProgress(parseFloat(e.target.value));
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const toggleSpeed = () => {
    if (!audioRef.current) return;
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    audioRef.current.playbackRate = nextSpeed;
    setSpeed(nextSpeed);
  };


  return (
    <div className="mb-2 w-full min-w-[260px] max-w-[320px] h-[52px] flex items-center bg-black/5 dark:bg-white/10 rounded-full px-2 py-1 gap-2.5">
      <audio ref={audioRef} src={mediaUrl} preload="metadata" />
      
      <button 
        onClick={togglePlay}
        className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-[#007e3a] dark:bg-[#00b359] rounded-full text-white hover:bg-[#00662f] dark:hover:bg-[#00994d] transition-colors shadow-sm"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
      </button>
      
      <div className="flex-1 mt-5 flex flex-col justify-center">
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={progress || 0} 
          onChange={handleSeek}
          className="w-full h-1 bg-black/10 dark:bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#007e3a] dark:accent-[#00b359]"
        />
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium px-0.5">
          <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-1 pr-1">
        <button 
          onClick={toggleSpeed}
          className="w-6 h-6 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-[#007e3a] bg-black/5 rounded-full transition-colors"
        >
          {speed}x
        </button>
      </div>
    </div>
  );
}
