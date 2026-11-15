"use client";

import { useRef } from "react";

interface ResizeHandleProps {
  label: string;
  controls: string;
  orientation: "vertical" | "horizontal";

  value: number;
  min: number;
  max: number;

  // +1: dragging right/down increases value.
  // -1: dragging right/down decreases value.
  direction?: 1 | -1;

  onChange: (value: number) => void;
}

export function ResizeHandle({
  label,
  controls,
  orientation,
  value,
  min,
  max,
  direction = 1,
  onChange,
}: ResizeHandleProps) {
  const drag = useRef<{
    pointerId: number;
    startCoordinate: number;
    startValue: number;
  } | null>(null);

  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  const clampedValue = Math.round(Math.min(safeMax, Math.max(safeMin, value)));

  const coordinate = (x: number, y: number) =>
    orientation === "vertical" ? x : y;

  const commit = (nextValue: number) => {
    const rounded = Math.round(Math.min(safeMax, Math.max(safeMin, nextValue)));
    onChange(rounded);
  };

  const endDrag = (target: HTMLElement, pointerId: number) => {
    if (drag.current?.pointerId !== pointerId) return;
    drag.current = null;
    try {
      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore capture cleanup errors if element detached during resize.
    }
  };

  return (
    <div
      className="rb-resize-handle"
      data-orientation={orientation}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-controls={controls}
      aria-orientation={orientation}
      aria-valuemin={safeMin}
      aria-valuemax={safeMax}
      aria-valuenow={clampedValue}
      onPointerDown={(event) => {
        if (event.button !== 0) return;

        event.preventDefault();
        event.currentTarget.focus();

        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Fallback silently if pointer capture is unavailable.
        }

        drag.current = {
          pointerId: event.pointerId,
          startCoordinate: coordinate(event.clientX, event.clientY),
          startValue: clampedValue,
        };
      }}
      onPointerMove={(event) => {
        const active = drag.current;
        if (!active || active.pointerId !== event.pointerId) return;

        const delta =
          coordinate(event.clientX, event.clientY) - active.startCoordinate;

        commit(active.startValue + delta * direction);
      }}
      onPointerUp={(event) => {
        endDrag(event.currentTarget, event.pointerId);
      }}
      onPointerCancel={(event) => {
        endDrag(event.currentTarget, event.pointerId);
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 40 : 10;

        if (event.key === "Home") {
          event.preventDefault();
          commit(safeMin);
          return;
        }

        if (event.key === "End") {
          event.preventDefault();
          commit(safeMax);
          return;
        }

        const negative = orientation === "vertical" ? "ArrowLeft" : "ArrowUp";
        const positive = orientation === "vertical" ? "ArrowRight" : "ArrowDown";

        if (event.key === negative) {
          event.preventDefault();
          commit(clampedValue - step * direction);
        } else if (event.key === positive) {
          event.preventDefault();
          commit(clampedValue + step * direction);
        }
      }}
    />
  );
}
