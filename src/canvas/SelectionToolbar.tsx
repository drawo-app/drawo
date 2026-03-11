import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

interface SelectionToolbarProps {
  left: number;
  top: number;
  toolbarKey: string;
  viewportWidth: number;
  children: ReactNode;
}

export const SelectionToolbar = ({
  left,
  top,
  toolbarKey,
  viewportWidth,
  children,
}: SelectionToolbarProps) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarWidth, setToolbarWidth] = useState(0);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width ?? toolbar.offsetWidth;
      setToolbarWidth(nextWidth);
    });

    resizeObserver.observe(toolbar);
    setToolbarWidth(toolbar.offsetWidth);

    return () => {
      resizeObserver.disconnect();
    };
  }, [toolbarKey]);

  const clampedLeft = useMemo(() => {
    const halfWidth = toolbarWidth / 2;
    const padding = 8;
    const minLeft = halfWidth + padding;
    const maxLeft = Math.max(minLeft, viewportWidth - halfWidth - padding);

    return Math.min(Math.max(left, minLeft), maxLeft);
  }, [left, toolbarWidth, viewportWidth]);

  return (
    <div
      ref={toolbarRef}
      key={toolbarKey}
      className="selection-toolbar"
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
      style={{ left: clampedLeft, top }}
    >
      {children}
    </div>
  );
};
