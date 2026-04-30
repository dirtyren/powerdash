// src/widgets/adapter-registry.ts
// Separate module for the mutable registry so adapter modules can import it
// without participating in the cycle between `adapter.ts` and the per-kind
// adapter files. This file has NO runtime imports from `./adapter` — only a
// type-only import, which is erased at runtime.

import type { WidgetKind } from "@/server/schemas/widget";
import type { WidgetAdapter } from "./adapter";

export const WIDGET_ADAPTERS: Record<WidgetKind, WidgetAdapter> = {} as Record<WidgetKind, WidgetAdapter>;
