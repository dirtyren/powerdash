"use client";

import dynamic from "next/dynamic";

export interface PromQLEditorProps {
  value: string;
  onChange: (next: string) => void;
  onApply?: () => void;
}

const Inner = dynamic(() => import("./PromQLEditorInner"), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground rounded border border-border bg-background p-2 text-xs">
      loading editor…
    </div>
  ),
});

export function PromQLEditor(props: PromQLEditorProps) {
  return <Inner {...props} />;
}
