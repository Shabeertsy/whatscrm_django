import React, { useRef } from "react";
import { Send, Paperclip, X, Mic, Image as ImageIcon, FileText, Camera, User, BarChart, Square } from "lucide-react";
import { AudioVisualizer } from "./chat/AudioVisualizer";



interface MessageComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onMediaSelect?: (file: File) => void;
  disabled?: boolean;
  replyingTo?: any;
  onCancelReply?: () => void;
}



export function MessageComposer({ value, onChange, onSubmit, onMediaSelect, disabled, replyingTo, onCancelReply }: MessageComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAttachMenu, setShowAttachMenu] = React.useState(false);
  const [attachAccept, setAttachAccept] = React.useState("*");
  
  // Recording states
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingDuration, setRecordingDuration] = React.useState(0);
  const [recordingStream, setRecordingStream] = React.useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // WhatsApp API requires specific formats. We'll label it as audio/ogg 
        // since browsers encode voice as Opus, which WhatsApp natively supports in Ogg containers.
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg' });
        const audioFile = new File([audioBlob], `voice_message_${Date.now()}.ogg`, { type: 'audio/ogg' });
        if (onMediaSelect) onMediaSelect(audioFile);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingStream(stream);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Please allow microphone access to record voice messages.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingStream(null);
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      };
      mediaRecorderRef.current.stop();
      clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      setRecordingStream(null);
      setRecordingDuration(0);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition duration-200 relative">
      {disabled && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 text-xs text-center border-b border-amber-100 dark:border-amber-500/20 font-medium">
          WhatsApp 24-hour window has expired. You can only send template messages to this customer.
        </div>
      )}
      
      {replyingTo && (
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex-1 flex flex-col min-w-0 pr-4">
            <span className="text-[11px] font-semibold text-[#007e3a] dark:text-[#00b359] mb-0.5">
              Replying to {replyingTo.sent_by_name || (replyingTo.direction === 'inbound' ? 'Customer' : 'Agent')}
            </span>
            <span className="text-xs text-slate-500 truncate">
              {replyingTo.msg_type === 'text' ? replyingTo.body : `[${replyingTo.msg_type}] ${replyingTo.body || ''}`}
            </span>
          </div>
          {replyingTo.media_url && (
            <div className="w-10 h-10 shrink-0 rounded overflow-hidden bg-black/10 mr-3">
              {replyingTo.msg_type === 'image' ? (
                <img src={replyingTo.media_url} alt="" className="w-full h-full object-cover" />
              ) : replyingTo.msg_type === 'video' ? (
                <video src={replyingTo.media_url} className="w-full h-full object-cover" />
              ) : null}
            </div>
          )}
          <button onClick={onCancelReply} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      <form onSubmit={onSubmit} className="p-4 flex items-center space-x-2 relative">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept={attachAccept}
          onChange={(e) => {
            if (e.target.files && e.target.files[0] && onMediaSelect) {
              onMediaSelect(e.target.files[0]);
              e.target.value = ''; // reset
            }
          }}
        />
        
        {/* Attachment Popup */}
        {showAttachMenu && !disabled && (
          <div className="absolute bottom-16 left-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl p-3 flex flex-col gap-2 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <button 
              type="button"
              className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
              onClick={() => {
                setAttachAccept("image/*,video/*");
                setShowAttachMenu(false);
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-sm">
                <ImageIcon className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Photos & Videos</span>
            </button>
            
            <button 
              type="button"
              className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
              onClick={() => {
                setAttachAccept("*");
                setShowAttachMenu(false);
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Document</span>
            </button>
          </div>
        )}
        
        <button
          type="button"
          disabled={disabled || isRecording}
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          className={`p-2 flex items-center justify-center rounded-full transition relative ${disabled || isRecording ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 hover:text-[#007e3a] hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Attach File"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        {isRecording ? (
          <div className="flex-grow flex items-center bg-slate-50 dark:bg-slate-800 border border-red-200 dark:border-red-900/30 rounded-full px-4 py-2.5 h-[44px]">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 w-10">{formatDuration(recordingDuration)}</span>
              {recordingStream && <AudioVisualizer stream={recordingStream} />}
            </div>
            <button type="button" onClick={cancelRecording} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium px-2 py-1">Cancel</button>
          </div>
        ) : (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!disabled) onSubmit(e);
              }
            }}
            disabled={disabled}
            placeholder={disabled ? "Messaging disabled..." : "Type an automated response or reply as agent..."}
            className={`flex-grow bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/20 focus:border-[#007e3a] resize-none min-h-[44px] max-h-[150px] custom-scrollbar ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}`}
            rows={value.split('\n').length > 1 ? Math.min(value.split('\n').length, 5) : 1}
          />
        )}
        {value.trim() !== '' ? (
          <button
            type="submit"
            disabled={disabled}
            className={`p-2.5 flex items-center justify-center rounded-full transition ${disabled ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed' : 'bg-[#007e3a] hover:bg-[#00662f] text-white shadow-sm'}`}
          >
            <Send className="h-4 w-4" />
          </button>
        ) : isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className={`p-2.5 flex items-center justify-center rounded-full transition bg-red-500 hover:bg-red-600 text-white shadow-sm animate-pulse`}
          >
            <Send className="h-4 w-4 ml-0.5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={startRecording}
            className={`p-2.5 flex items-center justify-center rounded-full transition ${disabled ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed' : 'bg-[#007e3a] hover:bg-[#00662f] text-white shadow-sm'}`}
          >
            <Mic className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}

export default MessageComposer;
