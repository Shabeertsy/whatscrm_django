import React, { useState, useRef, useEffect } from "react";


interface ResizableSidebarProps {
  children: React.ReactNode;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  position: "left" | "right";
  className?: string;
  isCollapsed?: boolean;
  collapsedWidth?: number;
}

export function ResizableSidebar({
  children,
  defaultWidth,
  minWidth = 200,
  maxWidth = 600,
  position,
  className = "",
  isCollapsed = false,
  collapsedWidth = 64,
}: ResizableSidebarProps) {
  const [panelWidth, setPanelWidth] = useState(defaultWidth);
  const isDragging = useRef(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !sidebarRef.current) return;

      const rect = sidebarRef.current.getBoundingClientRect();
      let newWidth = defaultWidth;
      
      if (position === "left") {
        newWidth = e.clientX - rect.left;
      } else {
        newWidth = rect.right - e.clientX;
      }

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [minWidth, maxWidth, position, defaultWidth]);

  const handleMouseDown = () => {
    isDragging.current = true;
    document.body.style.userSelect = "none";
  };

  const isLeft = position === "left";
  const dragHandleClass = isLeft
    ? "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-emerald-500/50 z-30 transition-colors"
    : "absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-emerald-500/50 z-30 transition-colors";

  const currentWidth = isCollapsed ? collapsedWidth : panelWidth;

  return (
    <aside
      ref={sidebarRef}
      style={{ width: `${currentWidth}px` }}
      className={`shrink-0 relative flex flex-col h-full transition-all duration-300 ${className}`}
    >
      {!isCollapsed && <div onMouseDown={handleMouseDown} className={dragHandleClass} />}
      {children}
    </aside>
  );
}
