import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream;
}

export function AudioVisualizer({ stream }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>(new Array(60).fill(0));
  const smoothedVolumeRef = useRef<number>(0);

  useEffect(() => {
    if (!stream) return;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationFrameId: number;
    let frameCount = 0;
    
    const draw = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      analyser.getByteTimeDomainData(dataArray);
      
      // Calculate RMS for increased sensitivity
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / bufferLength);
      
      // Super high sensitivity multiplier (25x)
      const targetVolume = Math.min(rms * 25, 1.0);
      
      // Lerp for smooth transitions
      smoothedVolumeRef.current += (targetVolume - smoothedVolumeRef.current) * 0.3;
      
      frameCount++;
      
      // Unshift moves data to the RIGHT (index 0 is left, moving towards end on right)
      // We only shift every 3 frames to drastically slow down the scroll speed
      if (frameCount % 3 === 0) {
        historyRef.current.unshift(smoothedVolumeRef.current);
        historyRef.current.pop();
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgb(0, 126, 58)'; 
      
      const numBars = 50;
      const barSpacing = canvas.width / numBars;
      const barWidth = barSpacing * 0.65;
      
      for (let i = 0; i < numBars; i++) {
        const v = historyRef.current[i] || 0;
        // The bar height is proportional to the volume, minimum 2px height for silence
        const h = Math.max(v * canvas.height, 2); 
        
        const x = i * barSpacing;
        const y = (canvas.height - h) / 2; // Symmetric (centered vertically)
        
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, h, [barWidth/2, barWidth/2, barWidth/2, barWidth/2]);
        ctx.fill();
      }
      
      animationFrameId = requestAnimationFrame(draw);
    };
    
    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      audioCtx.close().catch(console.error);
    };
  }, [stream]);

  return (
    <canvas ref={canvasRef} width="200" height="24" className="flex-1 max-w-[200px] opacity-80" />
  );
}
