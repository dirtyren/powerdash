"use client";

import type { ReactNode } from "react";

interface Props {
  title: string;
  onTitleChange?: (next: string) => void;
  children: ReactNode;
}

export function WidgetFrame({ title, onTitleChange, children }: Props) {
  return (
    <div className="flex h-full w-full flex-col rounded border border-border bg-card">
      <div className="border-b border-border px-3 py-2">
        {onTitleChange ? (
          <input
            aria-label="Widget title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full border-b border-transparent bg-transparent text-sm font-medium outline-none focus:border-border"
          />
        ) : (
          <span className="text-sm font-medium">{title}</span>
        )}
      </div>
      <div className="flex-1 overflow-auto p-3">{children}</div>
    </div>
  );
}
