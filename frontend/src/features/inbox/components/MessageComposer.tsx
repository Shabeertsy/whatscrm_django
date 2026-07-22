import React, { useRef, useEffect } from "react";
import { Send, Paperclip, X, Mic, Image as ImageIcon, FileText, Camera, User, BarChart, Square, LayoutTemplate, MessageSquareText, Plus } from "lucide-react";
import { AudioVisualizer } from "./chat/audio/AudioVisualizer";



interface MessageComposerProps {
  initialValue?: string;
  onClearInitial?: () => void;
  onSubmit: (text: string) => Promise<void>;
  onMediaSelect?: (file: File) => void;
  disabled?: boolean;
  isSending?: boolean;
  replyingTo?: any;
  onCancelReply?: () => void;
  onSendTemplate?: (template: any) => void;
}



export function MessageComposer(props: MessageComposerProps) {
  const { initialValue, onClearInitial, onSubmit, disabled, isSending, replyingTo, onCancelReply, onMediaSelect } = props;
  const [value, setValue] = React.useState(initialValue || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAttachMenu, setShowAttachMenu] = React.useState(false);
  const [attachAccept, setAttachAccept] = React.useState("*");

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
      if (onClearInitial) onClearInitial();
    }
  }, [initialValue, onClearInitial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled || isSending) return;
    const currentVal = value;
    setValue("");
    try {
      await onSubmit(currentVal);
    } catch {
      setValue(currentVal);
    }
  };
  
  // Recording states
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingDuration, setRecordingDuration] = React.useState(0);
  const [recordingStream, setRecordingStream] = React.useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Template states
  const [showTemplateModal, setShowTemplateModal] = React.useState(false);
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = React.useState(false);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { whatsappApi } = await import("../../../api/whatsapp");
      const res = await whatsappApi.listTemplates();
      setTemplates(Array.isArray(res.data) ? res.data : (res.data as any).results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Custom Message states
  const [showCustomModal, setShowCustomModal] = React.useState(false);
  const [customMessages, setCustomMessages] = React.useState<any[]>([]);
  const [loadingCustomMessages, setLoadingCustomMessages] = React.useState(false);

  const fetchCustomMessages = async () => {
    setLoadingCustomMessages(true);
    try {
      const { messagingApi } = await import("../../../api/messaging");
      const res = await messagingApi.listCustomMessages();
      setCustomMessages(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCustomMessages(false);
    }
  };

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
        const actualMimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        
        // Use the proper extension based on the actual mime type
        const ext = actualMimeType.includes('mp4') ? 'mp4' : 'webm';
        const audioFile = new File([audioBlob], `voice_message_${Date.now()}.${ext}`, { type: actualMimeType });
        
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

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl z-50 flex flex-col max-h-[400px]">
          <div className="flex justify-between items-center p-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4 text-[#007e3a]" /> Select Template
            </h3>
            <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {loadingTemplates ? (
              <div className="p-4 text-center text-xs text-slate-500">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">No templates found. Go to Templates section to sync.</div>
            ) : (
              templates.map((tmpl) => (
                <div key={tmpl.id} className="p-3 border border-slate-100 dark:border-slate-800 rounded-lg hover:border-[#007e3a] cursor-pointer transition"
                     onClick={() => {
                        if (props.onSendTemplate) {
                           props.onSendTemplate(tmpl);
                        }
                        setShowTemplateModal(false);
                     }}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{tmpl.name}</span>
                    <span className="text-[10px] uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{tmpl.language}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {tmpl.components?.find((c: any) => c.type === 'BODY')?.text || "No body text"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Custom Message Modal */}
      {showCustomModal && (
        <div className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl z-50 flex flex-col max-h-[400px]">
          <div className="flex justify-between items-center p-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-blue-600" /> Custom Messages
            </h3>
            <button onClick={() => setShowCustomModal(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {loadingCustomMessages ? (
              <div className="p-4 text-center text-xs text-slate-500">Loading custom messages...</div>
            ) : customMessages.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">No custom messages found. Create them from the settings.</div>
            ) : (
              customMessages.map((msg) => (
                <div key={msg.id} className="p-3 border border-slate-100 dark:border-slate-800 rounded-lg hover:border-blue-500 cursor-pointer transition"
                     onClick={() => {
                        setValue(prev => (prev ? prev + "\n\n" + msg.text : msg.text));
                        setShowCustomModal(false);
                     }}>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">{msg.title}</div>
                  <p className="text-[11px] text-slate-500 whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="p-4 flex items-center space-x-2 relative">
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
          disabled={props.disabled || isRecording}
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          className={`p-2 flex items-center justify-center rounded-full transition relative ${props.disabled || isRecording ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 hover:text-[#007e3a] hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Attach File"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <button
          type="button"
          disabled={isRecording}
          onClick={() => {
            if (!showTemplateModal) fetchTemplates();
            setShowTemplateModal(!showTemplateModal);
            setShowCustomModal(false);
          }}
          className={`p-2 flex items-center justify-center rounded-full transition ${isRecording ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 hover:text-[#007e3a] hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Send Template"
        >
          <LayoutTemplate className="h-5 w-5" />
        </button>

        <button
          type="button"
          disabled={isRecording}
          onClick={() => {
            if (!showCustomModal) fetchCustomMessages();
            setShowCustomModal(!showCustomModal);
            setShowTemplateModal(false);
          }}
          className={`p-2 flex items-center justify-center rounded-full transition ${isRecording ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Custom Messages"
        >
          <MessageSquareText className="h-5 w-5" />
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
          <div className="flex-grow relative flex items-center">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!disabled && !isSending) handleSubmit(e);
                }
              }}
              disabled={disabled || isSending}
              placeholder={disabled ? "Messaging disabled..." : "Type an automated response or reply as agent..."}
              className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/20 focus:border-[#007e3a] resize-none min-h-[44px] max-h-[150px] custom-scrollbar ${disabled || isSending ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}`}
              rows={value.split('\n').length > 1 ? Math.min(value.split('\n').length, 5) : 1}
            />
          </div>
        )}
        {isSending ? (
          <button
            type="button"
            disabled={true}
            className="p-2.5 flex items-center justify-center rounded-full transition bg-[#007e3a] text-white shadow-sm cursor-not-allowed opacity-70"
          >
            <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
          </button>
        ) : value.trim() !== '' ? (
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
