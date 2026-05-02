"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { PromQLExtension } from "@prometheus-io/codemirror-promql";
import { createPromClient } from "@/widgets/promql/prom-client";

interface Props {
  value: string;
  onChange: (next: string) => void;
  onApply?: () => void;
}

export default function PromQLEditorInner({ value, onChange, onApply }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Refs so the editor's closures stay current across parent re-renders.
  const onChangeRef = useRef(onChange);
  const onApplyRef = useRef(onApply);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onApplyRef.current = onApply;
  }, [onApply]);

  // Mount the editor once.
  useEffect(() => {
    if (!hostRef.current) return;

    const promql = new PromQLExtension().setComplete({
      remote: createPromClient(),
    });

    const applyKey = keymap.of([
      {
        key: "Mod-Enter",
        run: () => {
          onApplyRef.current?.();
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        oneDark,
        promql.asExtension(),
        applyKey,
        EditorView.contentAttributes.of({ "aria-label": "PromQL expression" }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            onChangeRef.current(u.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g., parent swapping widgets → different
  // expr). Compare before dispatching to avoid feedback loops.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={hostRef}
      className="overflow-hidden rounded border border-border bg-background"
      style={{ minHeight: 96 }}
    />
  );
}
