# Davinci P1 MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 15 dashboard app that renders one real OpMon dashboard (KPI tiles + line chart + data table), sourced end-to-end from the existing PHP/seagull backend via a typed XML → JSON proxy, plus a Docker dev stack and CI.

**Architecture:** Next.js 15 App Router with TypeScript strict. Server-side Route Handlers (`/app/api/*`) parse seagull SOAP/XML with `fast-xml-parser`, validate with Zod, and expose typed JSON. Client components use TanStack Query for server state and Zustand for UI state. Widgets: Tremor (KPI tiles), ECharts (line), TanStack Table (grid). Dev stack uses Docker Compose (`web` + `mock-api` via WireMock + `postgres`).

**Tech Stack:** Next.js 15, React 19, TypeScript 5.6 (strict), Tailwind CSS v4, shadcn/ui, TanStack Query v5, TanStack Table v8, Zustand v5, ECharts 5 (via `echarts-for-react`), Tremor v3, `fast-xml-parser` v4, Zod v3, Vitest v2, Playwright v1, WireMock 3.9, PostgreSQL 16, pnpm 9.

---

## File Structure

```
dashboard-html/
├── app/
│   ├── layout.tsx                       # Root HTML + providers mount point
│   ├── page.tsx                         # "/" — dashboard list
│   ├── providers.tsx                    # QueryClient, ThemeProvider
│   ├── globals.css                      # Tailwind entry
│   ├── dashboards/
│   │   └── [id]/
│   │       └── page.tsx                 # "/dashboards/[id]" — one dashboard
│   └── api/
│       ├── dashboards/
│       │   ├── route.ts                 # GET /api/dashboards
│       │   └── [id]/
│       │       └── route.ts             # GET /api/dashboards/[id]
│       └── widgets/
│           └── [id]/
│               └── data/
│                   └── route.ts         # GET /api/widgets/[id]/data
├── src/
│   ├── server/
│   │   ├── seagull/
│   │   │   ├── client.ts                # fetch + session cookie forwarding
│   │   │   ├── xml.ts                   # fast-xml-parser wrapper
│   │   │   ├── session.ts               # cookie forwarding helper
│   │   │   ├── dashboards.ts            # listDashboards, getDashboard
│   │   │   └── widgets.ts               # getWidgetData
│   │   └── schemas/
│   │       ├── dashboard.ts             # Zod schema + inferred types
│   │       └── widget.ts                # Zod schemas per widget type
│   ├── components/
│   │   ├── ui/                          # shadcn generated (button, card, …)
│   │   ├── widgets/
│   │   │   ├── KpiTile.tsx
│   │   │   ├── LineChart.tsx
│   │   │   └── DataTable.tsx
│   │   ├── DashboardGrid.tsx            # renders widgets by type
│   │   └── AppShell.tsx                 # header + nav
│   ├── hooks/
│   │   ├── useDashboards.ts             # TanStack Query: list
│   │   ├── useDashboard.ts              # TanStack Query: detail
│   │   └── useWidgetData.ts             # TanStack Query: widget data
│   ├── stores/
│   │   └── ui.ts                        # Zustand UI store (theme, sidebar)
│   └── lib/
│       └── utils.ts                     # cn() helper
├── tests/
│   ├── unit/
│   │   ├── xml.test.ts
│   │   ├── dashboards.test.ts
│   │   └── widgets.test.ts
│   └── e2e/
│       └── dashboard-smoke.spec.ts
├── docker/
│   ├── Dockerfile                       # already exists
│   ├── docker-compose.yml               # already exists
│   ├── wiremock/
│   │   ├── mappings/
│   │   │   ├── list-dashboards.json
│   │   │   ├── get-dashboard-1.json
│   │   │   ├── widget-1-data.json
│   │   │   ├── widget-2-data.json
│   │   │   └── widget-3-data.json
│   │   └── __files/
│   │       ├── list-dashboards.xml
│   │       ├── get-dashboard-1.xml
│   │       ├── widget-1-data.xml
│   │       ├── widget-2-data.xml
│   │       └── widget-3-data.xml
│   └── postgres/
│       └── seed.sql
├── .github/
│   └── workflows/
│       └── ci.yml
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json                      # shadcn/ui config
├── eslint.config.mjs
├── .prettierrc.json
├── vitest.config.ts
├── playwright.config.ts
├── .env.example
└── README.md                            # already exists
```

One-responsibility-per-file: server-side adapters live in `src/server/seagull/`, UI widgets in `src/components/widgets/`, data-fetching hooks in `src/hooks/`. Adding a new widget type means one file in each of those three folders — no sprawling changes.

---

## Task 1: Scaffold Next.js 15 + TypeScript strict

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `public/.gitkeep`

- [ ] **Step 1: Initialize pnpm and install Next.js 15**

```bash
cd /Users/alessandro.ren/dev/dashboard-html
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm init
pnpm add next@^15.0.0 react@^19.0.0 react-dom@^19.0.0
pnpm add -D typescript@^5.6.0 @types/node@^22 @types/react@^19 @types/react-dom@^19
```
Expected: `package.json`, `pnpm-lock.yaml`, `node_modules/` created.

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@app/*": ["./app/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.ts`**

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
};

export default config;
```

- [ ] **Step 4: Add scripts to `package.json`**

Edit `package.json` `"scripts"`:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 5: Create minimal `app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpMon Davinci",
  description: "OpMon dashboards",
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Create placeholder `app/page.tsx` and `app/globals.css`**

`app/page.tsx`:
```tsx
export default function HomePage() {
  return <main className="p-8">OpMon Davinci — scaffolded.</main>;
}
```

`app/globals.css`:
```css
html,
body {
  padding: 0;
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
}
```

- [ ] **Step 7: Verify build succeeds**

Run: `pnpm typecheck && pnpm build`
Expected: compiles successfully, `.next/` created, no TS errors.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: scaffold Next.js 15 + TypeScript strict"
```

---

## Task 2: Tailwind CSS v4 + shadcn/ui

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.mjs`, `components.json`, `src/lib/utils.ts`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Install Tailwind v4 and tooling**

```bash
pnpm add -D tailwindcss@^4.0.0 @tailwindcss/postcss@^4.0.0 postcss autoprefixer
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm add -D @types/node
```

- [ ] **Step 2: Write `postcss.config.mjs`**

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 3: Write `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        border: "hsl(var(--border))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Update `app/globals.css` with Tailwind + tokens**

```css
@import "tailwindcss";

:root {
  --background: 222 47% 6%;
  --foreground: 210 40% 98%;
  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;
  --card: 222 47% 8%;
  --card-foreground: 210 40% 98%;
  --border: 217 33% 20%;
  --primary: 210 100% 60%;
  --primary-foreground: 222 47% 6%;
}

html, body {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  min-height: 100vh;
}

* {
  border-color: hsl(var(--border));
}
```

- [ ] **Step 5: Create `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 6: Create `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 7: Create `src/components/ui/button.tsx`**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        ghost: "hover:bg-muted",
        outline: "border border-border hover:bg-muted",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
```

- [ ] **Step 8: Create `src/components/ui/card.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-sm font-medium text-muted-foreground", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";
```

- [ ] **Step 9: Verify and commit**

Run: `pnpm typecheck && pnpm build`
Expected: clean build, CSS included in output.

```bash
git add .
git commit -m "feat: wire Tailwind v4 and shadcn/ui primitives"
```

---

## Task 3: ESLint + Prettier + Vitest

**Files:**
- Create: `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `vitest.config.ts`, `tests/unit/smoke.test.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install dev tools**

```bash
pnpm add -D eslint@^9 @eslint/js typescript-eslint eslint-config-next@^15 \
  prettier@^3 prettier-plugin-tailwindcss \
  vitest@^2 @vitest/ui jsdom @testing-library/react@^16 @testing-library/jest-dom happy-dom
```

- [ ] **Step 2: Write `eslint.config.mjs`**

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "eslint-config-next";

export default [
  { ignores: [".next/**", "node_modules/**", "coverage/**", ".playwright/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...next,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
```

- [ ] **Step 3: Write `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

- [ ] **Step 4: Write `.prettierignore`**

```
.next
node_modules
pnpm-lock.yaml
coverage
.playwright
```

- [ ] **Step 5: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    coverage: {
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@app": path.resolve(__dirname, "./app"),
    },
  },
});
```

- [ ] **Step 6: Write the failing smoke test**

`tests/unit/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
```

- [ ] **Step 7: Add scripts**

Edit `package.json`:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

- [ ] **Step 8: Run all checks**

Run: `pnpm lint && pnpm format:check && pnpm test && pnpm typecheck`
Expected: all pass; 2 tests passing.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: add ESLint, Prettier, Vitest with smoke test"
```

---

## Task 4: Wire Docker Compose dev stack

**Files:**
- Create: `docker/wiremock/mappings/.gitkeep`, `docker/wiremock/__files/.gitkeep`, `docker/postgres/seed.sql`, `.dockerignore`, `.env.example`
- Existing: `docker/Dockerfile`, `docker/docker-compose.yml`

- [ ] **Step 1: Create `.dockerignore`**

```
node_modules
.next
.git
.github
.vscode
.idea
coverage
.playwright
*.log
.env
.env.local
```

- [ ] **Step 2: Create `.env.example`**

```
NODE_ENV=development
SEAGULL_BASE_URL=http://mock-api:8080
DATABASE_URL=postgres://opmon:opmon@postgres:5432/opmon
```

- [ ] **Step 3: Create `docker/postgres/seed.sql`**

```sql
CREATE TABLE IF NOT EXISTS dashboards (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  owner    TEXT NOT NULL,
  created  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO dashboards (name, owner) VALUES
  ('Infrastructure Overview', 'opuser'),
  ('Network Core',            'opuser')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 4: Placeholder wiremock dirs**

```bash
mkdir -p docker/wiremock/mappings docker/wiremock/__files
touch docker/wiremock/mappings/.gitkeep docker/wiremock/__files/.gitkeep
```

- [ ] **Step 5: Boot the stack**

Run: `docker compose -f docker/docker-compose.yml up --build -d`
Expected: three containers running.

Verify:
```bash
docker compose -f docker/docker-compose.yml ps
curl -sSf http://localhost:3000 > /dev/null && echo "web ok"
curl -sSf http://localhost:8080/__admin > /dev/null && echo "mock-api ok"
docker exec dashboard-html-postgres psql -U opmon -d opmon -c 'SELECT COUNT(*) FROM dashboards;'
```

- [ ] **Step 6: Tear down**

```bash
docker compose -f docker/docker-compose.yml down
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: dev docker stack (web + wiremock + postgres) with seed"
```

---

## Task 5: XML parser wrapper (`src/server/seagull/xml.ts`)

**Files:**
- Create: `src/server/seagull/xml.ts`, `tests/unit/xml.test.ts`

- [ ] **Step 1: Install parser**

```bash
pnpm add fast-xml-parser@^4.4.1 zod@^3.23
```

- [ ] **Step 2: Write the failing test**

`tests/unit/xml.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseSeagullXml } from "@/server/seagull/xml";

describe("parseSeagullXml", () => {
  it("parses a single element", () => {
    const xml = `<?xml version="1.0"?><root><a>1</a></root>`;
    expect(parseSeagullXml(xml)).toEqual({ root: { a: "1" } });
  });

  it("forces arrays for list-shaped paths", () => {
    const xml = `<?xml version="1.0"?><root><items><item>a</item></items></root>`;
    const result = parseSeagullXml(xml, { arrayPaths: ["root.items.item"] });
    expect(result).toEqual({ root: { items: { item: ["a"] } } });
  });

  it("forces arrays even when there is only one element", () => {
    const xml = `<?xml version="1.0"?><root><items><item>a</item><item>b</item></items></root>`;
    const result = parseSeagullXml(xml, { arrayPaths: ["root.items.item"] });
    expect(result).toEqual({ root: { items: { item: ["a", "b"] } } });
  });

  it("throws on malformed XML", () => {
    expect(() => parseSeagullXml("<root><broken")).toThrow();
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `pnpm test tests/unit/xml.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/server/seagull/xml.ts`**

```ts
import { XMLParser, XMLValidator } from "fast-xml-parser";

export interface ParseOptions {
  /** Dot-separated paths where children must always be arrays. */
  arrayPaths?: string[];
}

export function parseSeagullXml(xml: string, opts: ParseOptions = {}): unknown {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    throw new Error(`Invalid XML at line ${validation.err.line}: ${validation.err.msg}`);
  }

  const arrayPaths = new Set(opts.arrayPaths ?? []);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: false,
    parseTagValue: false,
    trimValues: true,
    isArray: (_name, jpath) => arrayPaths.has(jpath),
  });

  return parser.parse(xml) as unknown;
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test tests/unit/xml.test.ts`
Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: seagull XML parser wrapper with array-path coercion"
```

---

## Task 6: Zod schemas (`src/server/schemas/`)

**Files:**
- Create: `src/server/schemas/dashboard.ts`, `src/server/schemas/widget.ts`

- [ ] **Step 1: Write `src/server/schemas/dashboard.ts`**

```ts
import { z } from "zod";
import { WidgetRefSchema } from "./widget";

export const DashboardSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  owner: z.string().min(1),
});
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;

export const DashboardSchema = DashboardSummarySchema.extend({
  widgets: z.array(WidgetRefSchema),
});
export type Dashboard = z.infer<typeof DashboardSchema>;
```

- [ ] **Step 2: Write `src/server/schemas/widget.ts`**

```ts
import { z } from "zod";

export const WidgetKindSchema = z.enum(["kpi", "line", "table"]);
export type WidgetKind = z.infer<typeof WidgetKindSchema>;

export const WidgetRefSchema = z.object({
  id: z.string().min(1),
  kind: WidgetKindSchema,
  title: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});
export type WidgetRef = z.infer<typeof WidgetRefSchema>;

export const KpiDataSchema = z.object({
  kind: z.literal("kpi"),
  value: z.number(),
  unit: z.string().optional(),
  delta: z.number().optional(),
});
export type KpiData = z.infer<typeof KpiDataSchema>;

export const LinePointSchema = z.object({
  t: z.string(), // ISO
  v: z.number(),
});
export const LineDataSchema = z.object({
  kind: z.literal("line"),
  series: z.array(
    z.object({
      name: z.string(),
      points: z.array(LinePointSchema),
    }),
  ),
});
export type LineData = z.infer<typeof LineDataSchema>;

export const TableDataSchema = z.object({
  kind: z.literal("table"),
  columns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(z.record(z.union([z.string(), z.number(), z.null()]))),
});
export type TableData = z.infer<typeof TableDataSchema>;

export const WidgetDataSchema = z.discriminatedUnion("kind", [
  KpiDataSchema,
  LineDataSchema,
  TableDataSchema,
]);
export type WidgetData = z.infer<typeof WidgetDataSchema>;
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: zod schemas for dashboard and widget contracts"
```

---

## Task 7: Seagull client + session forwarding

**Files:**
- Create: `src/server/seagull/session.ts`, `src/server/seagull/client.ts`, `src/server/seagull/dashboards.ts`, `src/server/seagull/widgets.ts`, `tests/unit/dashboards.test.ts`, `tests/unit/widgets.test.ts`
- Modify: `.env.example` (already has `SEAGULL_BASE_URL`)

- [ ] **Step 1: Write `src/server/seagull/session.ts`**

```ts
import { cookies } from "next/headers";

const SEAGULL_COOKIE_NAMES = ["SEAGULLSESSID", "PHPSESSID"] as const;

export async function forwardedCookieHeader(): Promise<string | undefined> {
  const jar = await cookies();
  const pairs: string[] = [];
  for (const name of SEAGULL_COOKIE_NAMES) {
    const c = jar.get(name);
    if (c) pairs.push(`${c.name}=${c.value}`);
  }
  return pairs.length > 0 ? pairs.join("; ") : undefined;
}
```

- [ ] **Step 2: Write `src/server/seagull/client.ts`**

```ts
import { forwardedCookieHeader } from "./session";
import { parseSeagullXml, type ParseOptions } from "./xml";

export class SeagullError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "SeagullError";
  }
}

export interface SeagullCallOptions extends ParseOptions {
  /** Path appended to SEAGULL_BASE_URL, e.g. "/dashboards/list.xml" */
  path: string;
  method?: "GET" | "POST";
  /** For POST — raw string body (usually SOAP). */
  body?: string;
  contentType?: string;
}

export async function callSeagull(opts: SeagullCallOptions): Promise<unknown> {
  const base = process.env.SEAGULL_BASE_URL;
  if (!base) throw new Error("SEAGULL_BASE_URL is not set");

  const cookieHeader = await forwardedCookieHeader();
  const headers: Record<string, string> = {
    Accept: "application/xml, text/xml",
  };
  if (cookieHeader) headers["Cookie"] = cookieHeader;
  if (opts.contentType) headers["Content-Type"] = opts.contentType;

  const response = await fetch(`${base}${opts.path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body,
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new SeagullError(
      `seagull ${opts.path} failed: ${response.status}`,
      response.status,
      text,
    );
  }

  return parseSeagullXml(text, { arrayPaths: opts.arrayPaths });
}
```

- [ ] **Step 3: Write the failing test for `listDashboards`**

`tests/unit/dashboards.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

describe("listDashboards", () => {
  beforeEach(() => {
    process.env.SEAGULL_BASE_URL = "http://seagull.test";
    vi.restoreAllMocks();
  });

  it("parses seagull XML into typed summaries", async () => {
    const xml = `<?xml version="1.0"?>
      <response>
        <dashboards>
          <dashboard><id>1</id><name>Infra</name><owner>opuser</owner></dashboard>
          <dashboard><id>2</id><name>Net</name><owner>opuser</owner></dashboard>
        </dashboards>
      </response>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(xml, { status: 200 })),
    );

    const { listDashboards } = await import("@/server/seagull/dashboards");
    const result = await listDashboards();
    expect(result).toEqual([
      { id: "1", name: "Infra", owner: "opuser" },
      { id: "2", name: "Net", owner: "opuser" },
    ]);
  });

  it("throws SeagullError on 5xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 })),
    );
    const { listDashboards } = await import("@/server/seagull/dashboards");
    await expect(listDashboards()).rejects.toThrow(/seagull .* failed: 500/);
  });

  it("rejects XML that fails schema validation", async () => {
    const xml = `<?xml version="1.0"?>
      <response><dashboards><dashboard><id></id></dashboard></dashboards></response>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(xml, { status: 200 })),
    );
    const { listDashboards } = await import("@/server/seagull/dashboards");
    await expect(listDashboards()).rejects.toThrow();
  });
});
```

- [ ] **Step 4: Run to confirm failure**

Run: `pnpm test tests/unit/dashboards.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `src/server/seagull/dashboards.ts`**

```ts
import { z } from "zod";
import { callSeagull } from "./client";
import {
  DashboardSchema,
  DashboardSummarySchema,
  type Dashboard,
  type DashboardSummary,
} from "../schemas/dashboard";
import { WidgetRefSchema } from "../schemas/widget";

const ListEnvelopeSchema = z.object({
  response: z.object({
    dashboards: z.object({
      dashboard: z.array(DashboardSummarySchema),
    }),
  }),
});

export async function listDashboards(): Promise<DashboardSummary[]> {
  const raw = await callSeagull({
    path: "/dashboards/list.xml",
    arrayPaths: ["response.dashboards.dashboard"],
  });
  const parsed = ListEnvelopeSchema.parse(raw);
  return parsed.response.dashboards.dashboard;
}

const DetailEnvelopeSchema = z.object({
  response: z.object({
    dashboard: DashboardSummarySchema.extend({
      widgets: z.object({ widget: z.array(WidgetRefSchema) }),
    }),
  }),
});

export async function getDashboard(id: string): Promise<Dashboard> {
  const raw = await callSeagull({
    path: `/dashboards/${encodeURIComponent(id)}.xml`,
    arrayPaths: ["response.dashboard.widgets.widget"],
  });
  const parsed = DetailEnvelopeSchema.parse(raw);
  const { widgets, ...rest } = parsed.response.dashboard;
  return { ...rest, widgets: widgets.widget };
}
```

- [ ] **Step 6: Run tests**

Run: `pnpm test tests/unit/dashboards.test.ts`
Expected: all 3 tests PASS.

- [ ] **Step 7: Write the failing test for widgets**

`tests/unit/widgets.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

describe("getWidgetData", () => {
  beforeEach(() => {
    process.env.SEAGULL_BASE_URL = "http://seagull.test";
    vi.restoreAllMocks();
  });

  it("parses KPI payload", async () => {
    const xml = `<?xml version="1.0"?>
      <response><widget kind="kpi"><value>42.5</value><unit>%</unit><delta>-1.2</delta></widget></response>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(xml, { status: 200 })),
    );
    const { getWidgetData } = await import("@/server/seagull/widgets");
    const data = await getWidgetData("w-kpi");
    expect(data).toEqual({ kind: "kpi", value: 42.5, unit: "%", delta: -1.2 });
  });

  it("parses line-series payload with multiple series", async () => {
    const xml = `<?xml version="1.0"?>
      <response><widget kind="line">
        <series><name>cpu</name><point><t>2026-04-29T00:00:00Z</t><v>10</v></point><point><t>2026-04-29T00:01:00Z</t><v>12</v></point></series>
        <series><name>mem</name><point><t>2026-04-29T00:00:00Z</t><v>30</v></point></series>
      </widget></response>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(xml, { status: 200 })),
    );
    const { getWidgetData } = await import("@/server/seagull/widgets");
    const data = await getWidgetData("w-line");
    expect(data.kind).toBe("line");
    if (data.kind !== "line") throw new Error("kind");
    expect(data.series.length).toBe(2);
    expect(data.series[0]?.points.length).toBe(2);
  });

  it("parses table payload", async () => {
    const xml = `<?xml version="1.0"?>
      <response><widget kind="table">
        <column><key>host</key><label>Host</label></column>
        <column><key>up</key><label>Up</label></column>
        <row><host>h1</host><up>yes</up></row>
        <row><host>h2</host><up>no</up></row>
      </widget></response>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(xml, { status: 200 })),
    );
    const { getWidgetData } = await import("@/server/seagull/widgets");
    const data = await getWidgetData("w-table");
    expect(data.kind).toBe("table");
    if (data.kind !== "table") throw new Error("kind");
    expect(data.columns.map((c) => c.key)).toEqual(["host", "up"]);
    expect(data.rows).toHaveLength(2);
  });
});
```

- [ ] **Step 8: Run to confirm failure**

Run: `pnpm test tests/unit/widgets.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 9: Implement `src/server/seagull/widgets.ts`**

```ts
import { z } from "zod";
import { callSeagull } from "./client";
import {
  WidgetDataSchema,
  type WidgetData,
} from "../schemas/widget";

const KpiEnvelopeSchema = z.object({
  response: z.object({
    widget: z.object({
      "@_kind": z.literal("kpi"),
      value: z.coerce.number(),
      unit: z.string().optional(),
      delta: z.coerce.number().optional(),
    }),
  }),
});

const LineEnvelopeSchema = z.object({
  response: z.object({
    widget: z.object({
      "@_kind": z.literal("line"),
      series: z.array(
        z.object({
          name: z.string(),
          point: z.array(
            z.object({ t: z.string(), v: z.coerce.number() }),
          ),
        }),
      ),
    }),
  }),
});

const TableEnvelopeSchema = z.object({
  response: z.object({
    widget: z.object({
      "@_kind": z.literal("table"),
      column: z.array(z.object({ key: z.string(), label: z.string() })),
      row: z.array(z.record(z.union([z.string(), z.number(), z.null()]))),
    }),
  }),
});

export async function getWidgetData(widgetId: string): Promise<WidgetData> {
  const raw = await callSeagull({
    path: `/widgets/${encodeURIComponent(widgetId)}/data.xml`,
    arrayPaths: [
      "response.widget.series",
      "response.widget.series.point",
      "response.widget.column",
      "response.widget.row",
    ],
  });

  const kpi = KpiEnvelopeSchema.safeParse(raw);
  if (kpi.success) {
    const w = kpi.data.response.widget;
    return WidgetDataSchema.parse({
      kind: "kpi",
      value: w.value,
      unit: w.unit,
      delta: w.delta,
    });
  }

  const line = LineEnvelopeSchema.safeParse(raw);
  if (line.success) {
    const w = line.data.response.widget;
    return WidgetDataSchema.parse({
      kind: "line",
      series: w.series.map((s) => ({
        name: s.name,
        points: s.point.map((p) => ({ t: p.t, v: p.v })),
      })),
    });
  }

  const table = TableEnvelopeSchema.safeParse(raw);
  if (table.success) {
    const w = table.data.response.widget;
    return WidgetDataSchema.parse({
      kind: "table",
      columns: w.column,
      rows: w.row,
    });
  }

  throw new Error(`Unrecognized widget payload for id=${widgetId}`);
}
```

- [ ] **Step 10: Run tests**

Run: `pnpm test tests/unit/widgets.test.ts`
Expected: all 3 tests PASS.

- [ ] **Step 11: Run full suite**

Run: `pnpm test && pnpm typecheck`
Expected: all tests pass; no TS errors.

- [ ] **Step 12: Commit**

```bash
git add .
git commit -m "feat: seagull client + typed adapters for dashboards and widget data"
```

---

## Task 8: Route handlers (BFF endpoints)

**Files:**
- Create: `app/api/dashboards/route.ts`, `app/api/dashboards/[id]/route.ts`, `app/api/widgets/[id]/data/route.ts`

- [ ] **Step 1: Write `app/api/dashboards/route.ts`**

```ts
import { NextResponse } from "next/server";
import { listDashboards } from "@/server/seagull/dashboards";
import { SeagullError } from "@/server/seagull/client";

export async function GET() {
  try {
    const data = await listDashboards();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof SeagullError) {
      return NextResponse.json(
        { error: "upstream", status: err.status, message: err.message },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "internal", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Write `app/api/dashboards/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getDashboard } from "@/server/seagull/dashboards";
import { SeagullError } from "@/server/seagull/client";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const data = await getDashboard(id);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof SeagullError && err.status === 404) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (err instanceof SeagullError) {
      return NextResponse.json(
        { error: "upstream", status: err.status, message: err.message },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "internal", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Write `app/api/widgets/[id]/data/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getWidgetData } from "@/server/seagull/widgets";
import { SeagullError } from "@/server/seagull/client";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const data = await getWidgetData(id);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof SeagullError) {
      return NextResponse.json(
        { error: "upstream", status: err.status, message: err.message },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "internal", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck && pnpm build`
Expected: clean build, 3 dynamic routes listed in output.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: api route handlers for dashboards and widget data"
```

---

## Task 9: WireMock fixtures

**Files:**
- Create (5 mapping files + 5 xml files under `docker/wiremock/`)

- [ ] **Step 1: Create `docker/wiremock/__files/list-dashboards.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<response>
  <dashboards>
    <dashboard>
      <id>1</id>
      <name>Infrastructure Overview</name>
      <owner>opuser</owner>
    </dashboard>
    <dashboard>
      <id>2</id>
      <name>Network Core</name>
      <owner>opuser</owner>
    </dashboard>
  </dashboards>
</response>
```

- [ ] **Step 2: Create `docker/wiremock/mappings/list-dashboards.json`**

```json
{
  "request": {
    "method": "GET",
    "urlPath": "/dashboards/list.xml"
  },
  "response": {
    "status": 200,
    "headers": { "Content-Type": "application/xml" },
    "bodyFileName": "list-dashboards.xml"
  }
}
```

- [ ] **Step 3: Create `docker/wiremock/__files/get-dashboard-1.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<response>
  <dashboard>
    <id>1</id>
    <name>Infrastructure Overview</name>
    <owner>opuser</owner>
    <widgets>
      <widget>
        <id>w-cpu-kpi</id>
        <kind>kpi</kind>
        <title>CPU %</title>
        <x>0</x><y>0</y><w>3</w><h>2</h>
      </widget>
      <widget>
        <id>w-cpu-line</id>
        <kind>line</kind>
        <title>CPU over time</title>
        <x>3</x><y>0</y><w>6</w><h>4</h>
      </widget>
      <widget>
        <id>w-hosts-table</id>
        <kind>table</kind>
        <title>Hosts</title>
        <x>0</x><y>2</y><w>9</w><h>4</h>
      </widget>
    </widgets>
  </dashboard>
</response>
```

- [ ] **Step 4: Create `docker/wiremock/mappings/get-dashboard-1.json`**

```json
{
  "request": {
    "method": "GET",
    "urlPath": "/dashboards/1.xml"
  },
  "response": {
    "status": 200,
    "headers": { "Content-Type": "application/xml" },
    "bodyFileName": "get-dashboard-1.xml"
  }
}
```

- [ ] **Step 5: Create widget data fixtures**

`docker/wiremock/__files/widget-1-data.xml` (KPI):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<response>
  <widget kind="kpi">
    <value>42.3</value>
    <unit>%</unit>
    <delta>-1.4</delta>
  </widget>
</response>
```

`docker/wiremock/mappings/widget-1-data.json`:
```json
{
  "request": { "method": "GET", "urlPath": "/widgets/w-cpu-kpi/data.xml" },
  "response": {
    "status": 200,
    "headers": { "Content-Type": "application/xml" },
    "bodyFileName": "widget-1-data.xml"
  }
}
```

`docker/wiremock/__files/widget-2-data.xml` (line):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<response>
  <widget kind="line">
    <series>
      <name>cpu</name>
      <point><t>2026-04-29T12:00:00Z</t><v>10</v></point>
      <point><t>2026-04-29T12:01:00Z</t><v>14</v></point>
      <point><t>2026-04-29T12:02:00Z</t><v>9</v></point>
      <point><t>2026-04-29T12:03:00Z</t><v>22</v></point>
      <point><t>2026-04-29T12:04:00Z</t><v>18</v></point>
    </series>
    <series>
      <name>mem</name>
      <point><t>2026-04-29T12:00:00Z</t><v>41</v></point>
      <point><t>2026-04-29T12:01:00Z</t><v>42</v></point>
      <point><t>2026-04-29T12:02:00Z</t><v>44</v></point>
      <point><t>2026-04-29T12:03:00Z</t><v>46</v></point>
      <point><t>2026-04-29T12:04:00Z</t><v>47</v></point>
    </series>
  </widget>
</response>
```

`docker/wiremock/mappings/widget-2-data.json`:
```json
{
  "request": { "method": "GET", "urlPath": "/widgets/w-cpu-line/data.xml" },
  "response": {
    "status": 200,
    "headers": { "Content-Type": "application/xml" },
    "bodyFileName": "widget-2-data.xml"
  }
}
```

`docker/wiremock/__files/widget-3-data.xml` (table):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<response>
  <widget kind="table">
    <column><key>host</key><label>Host</label></column>
    <column><key>state</key><label>State</label></column>
    <column><key>uptime</key><label>Uptime</label></column>
    <row><host>db-01</host><state>OK</state><uptime>99.99</uptime></row>
    <row><host>db-02</host><state>WARN</state><uptime>98.12</uptime></row>
    <row><host>web-01</host><state>OK</state><uptime>99.87</uptime></row>
  </widget>
</response>
```

`docker/wiremock/mappings/widget-3-data.json`:
```json
{
  "request": { "method": "GET", "urlPath": "/widgets/w-hosts-table/data.xml" },
  "response": {
    "status": 200,
    "headers": { "Content-Type": "application/xml" },
    "bodyFileName": "widget-3-data.xml"
  }
}
```

- [ ] **Step 6: Restart mock-api and verify each endpoint**

```bash
docker compose -f docker/docker-compose.yml up -d --build
curl -s http://localhost:8080/dashboards/list.xml | head
curl -s http://localhost:8080/dashboards/1.xml | head
curl -s http://localhost:8080/widgets/w-cpu-kpi/data.xml | head
curl -s http://localhost:8080/widgets/w-cpu-line/data.xml | head
curl -s http://localhost:8080/widgets/w-hosts-table/data.xml | head
```
Expected: each returns valid XML.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: wiremock fixtures for 1 dashboard + 3 widgets"
```

---

## Task 10: End-to-end route handler integration test

**Files:**
- Create: `tests/unit/api-routes.test.ts`

This verifies the route handlers compose the client + schemas correctly without booting the full Next server.

- [ ] **Step 1: Write the failing test**

`tests/unit/api-routes.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

describe("GET /api/dashboards", () => {
  beforeEach(() => {
    process.env.SEAGULL_BASE_URL = "http://seagull.test";
    vi.restoreAllMocks();
  });

  it("returns typed JSON array on success", async () => {
    const xml = `<?xml version="1.0"?>
      <response><dashboards>
        <dashboard><id>1</id><name>A</name><owner>u</owner></dashboard>
      </dashboards></response>`;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(xml, { status: 200 })));

    const { GET } = await import("@app/api/dashboards/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([{ id: "1", name: "A", owner: "u" }]);
  });

  it("returns 502 when seagull fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { status: 500 })));
    const { GET } = await import("@app/api/dashboards/route");
    const response = await GET();
    expect(response.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm test tests/unit/api-routes.test.ts`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "test: end-to-end integration test for /api/dashboards route"
```

---

## Task 11: TanStack Query + Zustand providers

**Files:**
- Create: `app/providers.tsx`, `src/stores/ui.ts`, `src/hooks/useDashboards.ts`, `src/hooks/useDashboard.ts`, `src/hooks/useWidgetData.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install**

```bash
pnpm add @tanstack/react-query@^5 @tanstack/react-query-devtools@^5 zustand@^5
```

- [ ] **Step 2: Write `app/providers.tsx`**

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Wire providers into `app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpMon Davinci",
  description: "OpMon dashboards",
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Write `src/stores/ui.ts`**

```ts
import { create } from "zustand";

interface UiState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

- [ ] **Step 5: Write `src/hooks/useDashboards.ts`**

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardSummary } from "@/server/schemas/dashboard";

async function fetchDashboards(): Promise<DashboardSummary[]> {
  const r = await fetch("/api/dashboards", { credentials: "include" });
  if (!r.ok) throw new Error(`list dashboards failed: ${r.status}`);
  return r.json() as Promise<DashboardSummary[]>;
}

export function useDashboards() {
  return useQuery({
    queryKey: ["dashboards"],
    queryFn: fetchDashboards,
  });
}
```

- [ ] **Step 6: Write `src/hooks/useDashboard.ts`**

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { Dashboard } from "@/server/schemas/dashboard";

async function fetchDashboard(id: string): Promise<Dashboard> {
  const r = await fetch(`/api/dashboards/${encodeURIComponent(id)}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(`get dashboard ${id} failed: ${r.status}`);
  return r.json() as Promise<Dashboard>;
}

export function useDashboard(id: string) {
  return useQuery({
    queryKey: ["dashboard", id],
    queryFn: () => fetchDashboard(id),
    enabled: Boolean(id),
  });
}
```

- [ ] **Step 7: Write `src/hooks/useWidgetData.ts`**

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { WidgetData } from "@/server/schemas/widget";

async function fetchWidgetData(widgetId: string): Promise<WidgetData> {
  const r = await fetch(
    `/api/widgets/${encodeURIComponent(widgetId)}/data`,
    { credentials: "include" },
  );
  if (!r.ok) throw new Error(`widget ${widgetId} data failed: ${r.status}`);
  return r.json() as Promise<WidgetData>;
}

export function useWidgetData(widgetId: string, refetchMs = 15_000) {
  return useQuery({
    queryKey: ["widget", widgetId],
    queryFn: () => fetchWidgetData(widgetId),
    refetchInterval: refetchMs,
  });
}
```

- [ ] **Step 8: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: query client, zustand ui store, and data hooks"
```

---

## Task 12: AppShell + home page (dashboard list)

**Files:**
- Create: `src/components/AppShell.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write `src/components/AppShell.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggle = useUiStore((s) => s.toggleSidebar);
  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "border-r border-border bg-card transition-all",
          sidebarOpen ? "w-64" : "w-14",
        )}
      >
        <button
          onClick={toggle}
          className="h-12 w-full border-b border-border text-sm hover:bg-muted"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? "‹ Davinci" : "≡"}
        </button>
        <nav className="p-4 text-sm text-muted-foreground">
          {sidebarOpen ? "Dashboards" : null}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `app/page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useDashboards } from "@/hooks/useDashboards";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function HomePage() {
  const { data, isLoading, error } = useDashboards();

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-semibold">Dashboards</h1>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && (
        <p className="text-red-400">Failed to load dashboards: {(error as Error).message}</p>
      )}
      {data && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((d) => (
            <Link key={d.id} href={`/dashboards/${d.id}`} className="block">
              <Card className="transition-colors hover:border-primary">
                <CardHeader>
                  <CardTitle>{d.owner}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">{d.name}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
```

- [ ] **Step 3: Run dev and verify**

```bash
docker compose -f docker/docker-compose.yml up -d
pnpm dev
```
Open `http://localhost:3000`.
Expected: sidebar + "Dashboards" heading + 2 cards ("Infrastructure Overview", "Network Core") served from wiremock.

Stop dev server with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: app shell + dashboard list page wired to /api/dashboards"
```

---

## Task 13: Widget components — KPI tile

**Files:**
- Create: `src/components/widgets/KpiTile.tsx`

- [ ] **Step 1: Install Tremor**

```bash
pnpm add @tremor/react@^3
```

- [ ] **Step 2: Write `src/components/widgets/KpiTile.tsx`**

```tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useWidgetData } from "@/hooks/useWidgetData";

export function KpiTile({ widgetId, title }: { widgetId: string; title: string }) {
  const { data, isLoading, error } = useWidgetData(widgetId);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="text-muted-foreground">…</div>}
        {error && <div className="text-red-400 text-sm">error</div>}
        {data && data.kind === "kpi" && (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold">
              {data.value.toFixed(1)}
              {data.unit && <span className="ml-1 text-base text-muted-foreground">{data.unit}</span>}
            </span>
            {typeof data.delta === "number" && (
              <span className={data.delta < 0 ? "text-green-400" : "text-red-400"}>
                {data.delta > 0 ? "+" : ""}
                {data.delta.toFixed(2)}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: KPI tile widget"
```

---

## Task 14: Widget components — Line chart (ECharts)

**Files:**
- Create: `src/components/widgets/LineChart.tsx`

- [ ] **Step 1: Install ECharts**

```bash
pnpm add echarts@^5 echarts-for-react@^3
```

- [ ] **Step 2: Write `src/components/widgets/LineChart.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useWidgetData } from "@/hooks/useWidgetData";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export function LineChart({ widgetId, title }: { widgetId: string; title: string }) {
  const { data, isLoading, error } = useWidgetData(widgetId);

  const option: EChartsOption | null = useMemo(() => {
    if (!data || data.kind !== "line") return null;
    return {
      tooltip: { trigger: "axis" },
      legend: { data: data.series.map((s) => s.name), textStyle: { color: "#cbd5e1" } },
      grid: { left: 40, right: 20, top: 40, bottom: 30 },
      xAxis: {
        type: "time",
        axisLine: { lineStyle: { color: "#475569" } },
        axisLabel: { color: "#94a3b8" },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "#475569" } },
        axisLabel: { color: "#94a3b8" },
        splitLine: { lineStyle: { color: "#1e293b" } },
      },
      series: data.series.map((s) => ({
        name: s.name,
        type: "line",
        smooth: true,
        showSymbol: false,
        data: s.points.map((p) => [p.t, p.v]),
      })),
    };
  }, [data]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {isLoading && <div className="text-muted-foreground">…</div>}
        {error && <div className="text-red-400 text-sm">error</div>}
        {option && <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Typecheck and build**

Run: `pnpm typecheck && pnpm build`
Expected: clean build; ECharts lazy-loaded bundle visible in output.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: line chart widget using ECharts (client-only)"
```

---

## Task 15: Widget components — Data table

**Files:**
- Create: `src/components/widgets/DataTable.tsx`

- [ ] **Step 1: Install TanStack Table**

```bash
pnpm add @tanstack/react-table@^8
```

- [ ] **Step 2: Write `src/components/widgets/DataTable.tsx`**

```tsx
"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useWidgetData } from "@/hooks/useWidgetData";

type Row = Record<string, string | number | null>;

export function DataTable({ widgetId, title }: { widgetId: string; title: string }) {
  const { data, isLoading, error } = useWidgetData(widgetId);

  const columns = useMemo<ColumnDef<Row>[]>(() => {
    if (!data || data.kind !== "table") return [];
    return data.columns.map((c) => ({
      accessorKey: c.key,
      header: c.label,
      cell: (info) => String(info.getValue() ?? ""),
    }));
  }, [data]);

  const rows: Row[] = data && data.kind === "table" ? (data.rows as Row[]) : [];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="text-muted-foreground">…</div>}
        {error && <div className="text-red-400 text-sm">error</div>}
        {data && data.kind === "table" && (
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-border text-left text-muted-foreground">
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-2 py-2 font-medium">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-border/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: table widget using TanStack Table"
```

---

## Task 16: Dashboard detail page + widget dispatcher

**Files:**
- Create: `src/components/DashboardGrid.tsx`, `app/dashboards/[id]/page.tsx`

- [ ] **Step 1: Write `src/components/DashboardGrid.tsx`**

```tsx
"use client";

import type { WidgetRef } from "@/server/schemas/widget";
import { KpiTile } from "@/components/widgets/KpiTile";
import { LineChart } from "@/components/widgets/LineChart";
import { DataTable } from "@/components/widgets/DataTable";

function WidgetByKind({ widget }: { widget: WidgetRef }) {
  switch (widget.kind) {
    case "kpi":
      return <KpiTile widgetId={widget.id} title={widget.title} />;
    case "line":
      return <LineChart widgetId={widget.id} title={widget.title} />;
    case "table":
      return <DataTable widgetId={widget.id} title={widget.title} />;
    default: {
      const _exhaustive: never = widget.kind;
      return <div>Unsupported widget: {_exhaustive}</div>;
    }
  }
}

export function DashboardGrid({ widgets }: { widgets: WidgetRef[] }) {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
        gridAutoRows: "80px",
      }}
    >
      {widgets.map((w) => (
        <div
          key={w.id}
          style={{
            gridColumn: `${w.x + 1} / span ${w.w}`,
            gridRow: `${w.y + 1} / span ${w.h}`,
          }}
        >
          <WidgetByKind widget={w} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `app/dashboards/[id]/page.tsx`**

```tsx
"use client";

import { use } from "react";
import { AppShell } from "@/components/AppShell";
import { DashboardGrid } from "@/components/DashboardGrid";
import { useDashboard } from "@/hooks/useDashboard";

export default function DashboardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error } = useDashboard(id);

  return (
    <AppShell>
      {isLoading && <p className="text-muted-foreground">Loading dashboard…</p>}
      {error && (
        <p className="text-red-400">Failed to load dashboard: {(error as Error).message}</p>
      )}
      {data && (
        <>
          <header className="mb-6 flex items-baseline justify-between">
            <h1 className="text-2xl font-semibold">{data.name}</h1>
            <span className="text-sm text-muted-foreground">owner: {data.owner}</span>
          </header>
          <DashboardGrid widgets={data.widgets} />
        </>
      )}
    </AppShell>
  );
}
```

- [ ] **Step 3: Verify end-to-end in browser**

```bash
docker compose -f docker/docker-compose.yml up -d
pnpm dev
```
- Open `http://localhost:3000`.
- Click "Infrastructure Overview".
- Expected: dashboard page renders KPI tile (`42.3%`), line chart with two series (cpu, mem), and a 3-row host table. Widgets reload every 15 s.

Stop with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: dashboard detail page with kind-dispatched widget grid"
```

---

## Task 17: Playwright smoke test

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/dashboard-smoke.spec.ts`
- Modify: `package.json` (script)

- [ ] **Step 1: Install Playwright**

```bash
pnpm add -D @playwright/test@^1.48
pnpm exec playwright install --with-deps chromium
```

- [ ] **Step 2: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Write `tests/e2e/dashboard-smoke.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("lists dashboards and opens one with all three widget kinds", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboards" })).toBeVisible();
  await expect(page.getByText("Infrastructure Overview")).toBeVisible();

  await page.getByText("Infrastructure Overview").click();
  await expect(
    page.getByRole("heading", { name: "Infrastructure Overview" }),
  ).toBeVisible();

  // KPI
  await expect(page.getByText(/42\.3/)).toBeVisible();
  // Line chart — echarts canvas
  await expect(page.locator("canvas").first()).toBeVisible();
  // Table row
  await expect(page.getByText("db-01")).toBeVisible();
});
```

- [ ] **Step 4: Add script to `package.json`**

```json
{
  "scripts": {
    "e2e": "playwright test"
  }
}
```

- [ ] **Step 5: Run the smoke test**

Pre-reqs: docker compose is up (so wiremock is available).

```bash
docker compose -f docker/docker-compose.yml up -d mock-api
pnpm e2e
```
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "test(e2e): playwright smoke test for list + detail flow"
```

---

## Task 18: CI workflow (GitHub Actions)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9.12.0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm typecheck

      - run: pnpm lint

      - run: pnpm format:check

      - run: pnpm test

      - run: pnpm build

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Start mock-api (wiremock)
        run: |
          docker run -d --name mock-api \
            -p 8080:8080 \
            -v "$PWD/docker/wiremock/mappings:/home/wiremock/mappings:ro" \
            -v "$PWD/docker/wiremock/__files:/home/wiremock/__files:ro" \
            wiremock/wiremock:3.9.1 --global-response-templating

      - name: Playwright e2e
        env:
          SEAGULL_BASE_URL: http://localhost:8080
        run: pnpm e2e

      - name: Teardown mock-api
        if: always()
        run: docker rm -f mock-api || true
```

- [ ] **Step 2: Verify locally with `act` (optional) or by pushing a branch**

Locally: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "ci: github actions workflow (typecheck, lint, test, build, e2e)"
```

---

## Task 19: README and environment docs

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Extend `README.md` with dev workflow**

Append to `README.md`:
```markdown

## Local development

### Prerequisites

- Node 20 LTS
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Docker + Docker Compose

### First-time setup

```bash
cp .env.example .env.local
pnpm install
```

### Run everything in Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```
- App: http://localhost:3000
- Mock API (WireMock admin): http://localhost:8080/__admin
- Postgres: localhost:5432 (opmon / opmon)

### Run the Next app on the host, mock-api + postgres in Docker

```bash
docker compose -f docker/docker-compose.yml up -d mock-api postgres
SEAGULL_BASE_URL=http://localhost:8080 pnpm dev
```

### Tests

```bash
pnpm test                 # unit
pnpm e2e                  # playwright (needs mock-api running)
pnpm typecheck && pnpm lint && pnpm format:check
```

## Pointing at a real seagull backend

Set `SEAGULL_BASE_URL` to the PHP host (e.g. `https://opmon.example.com`) and make sure your browser has a valid seagull session cookie (log into OpMon in the same browser). The session cookie is forwarded server-side by the Route Handlers.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: local development workflow and backend switching"
```

---

## Final verification

- [ ] **Step 1: Full clean verification locally**

```bash
docker compose -f docker/docker-compose.yml down -v
rm -rf .next node_modules
pnpm install
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
docker compose -f docker/docker-compose.yml up -d mock-api
pnpm e2e
docker compose -f docker/docker-compose.yml down
```
Expected: all pass cleanly from a fresh clone.

- [ ] **Step 2: Manually verify the demo**

```bash
docker compose -f docker/docker-compose.yml up --build
```
Open http://localhost:3000 → click "Infrastructure Overview" → confirm KPI tile shows `42.3%`, line chart shows two series, table shows 3 hosts (`db-01`, `db-02`, `web-01`).

- [ ] **Step 3: Announce P1 MVP done**

P1 MVP is complete: scaffold + typed XML proxy + 3 widget kinds + Docker dev stack + CI + E2E smoke. Hand off to the spike for seagull session/CSRF bridge against a real OpMon dev instance (risk #2 from the spec) before starting P2 planning.
