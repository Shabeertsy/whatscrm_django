import React, { useState, useEffect, useCallback, useRef } from "react";
import { Bot, X } from "lucide-react";
import { DataChatPanel } from "../../features/ai/components/DataChatPanel";



export function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const buttonStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  // Re-calculate position on window resize to ensure it doesn't go off-screen
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 60),
        y: Math.min(prev.y, window.innerHeight - 60)
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    hasMoved.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    buttonStartPos.current = { ...position };

    // Capture pointer to the button so we get events even if mouse moves outside
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMoved.current = true;
    }

    // Calculate new position, bounded by window dimensions
    let newX = buttonStartPos.current.x + dx;
    let newY = buttonStartPos.current.y + dy;

    newX = Math.max(10, Math.min(newX, window.innerWidth - 60));
    newY = Math.max(10, Math.min(newY, window.innerHeight - 60));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      // If we didn't really move (just a click), toggle the panel
      if (!hasMoved.current) {
        setIsOpen((prev) => !prev);
      }
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  return (
    <>
      <style>{`
        .fab-ai {
          position: fixed;
          z-index: 99998;
          touch-action: none; /* Prevent scrolling while dragging */
        }
        .fab-ai-btn {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          border: 1px solid rgba(0, 126, 58, 0.4);
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #007e3a; /* User's greenish color */
          color: white;
          box-shadow: 0 4px 12px rgba(0, 126, 58, 0.3);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .fab-ai-btn:active {
          cursor: grabbing;
        }
        .fab-ai-btn:hover:not(:active) { 
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 126, 58, 0.4);
        }
        .fab-ai-btn.open  { 
          background: #005f2b; /* Darker green when open */
          border-color: #004d22;
          transform: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .fab-ai-label {
          position: absolute;
          right: 64px;
          top: 50%;
          transform: translateY(-50%);
          background: #007e3a;
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
          border: 1px solid rgba(255,255,255,0.2);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
        }
        
        /* Show tooltip only when hovering, not when dragging or open */
        .fab-ai:hover:not(.dragging) .fab-ai-label { 
          opacity: 1; 
        }
      `}</style>

      <div
        className={`fab-ai ${isDragging ? 'dragging' : ''}`}
        style={{ left: position.x, top: position.y }}
      >
        {!isOpen && !isDragging && <div className="fab-ai-label">Data Assistant</div>}
        <button
          id="floating-ai-chat-btn"
          className={`fab-ai-btn${isOpen ? " open" : ""}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label={isOpen ? "Close Assistant" : "Open Assistant"}
        >
          {isOpen ? <X size={22} style={{ pointerEvents: 'none' }} /> : <Bot size={24} style={{ pointerEvents: 'none' }} />}
        </button>
      </div>

      {isOpen && (
        <DataChatPanel
          onClose={() => setIsOpen(false)}
          anchorPos={position}
        />
      )}
    </>
  );
}

export default FloatingAIChat;
