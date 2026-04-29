"use client";

import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function EditToolbar({ title, isDirty, isSaving, onSave, onCancel }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <span className="text-sm text-muted-foreground">
          {isDirty ? "• unsaved changes" : "no changes"}
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={!isDirty || isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
