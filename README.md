>Canvo — Collaborative Design Canvas

A real-time, multiplayer design tool in the browser — think a small slice of Figma: shapes, text, freeform drawing, images, comment threads, live cursors, and emoji reactions, all synced instantly between everyone in the same file, with designs persisted to a Postgres database so they survive a refresh and show up on a dashboard.

This document exists so that **every technical decision in this codebase has a documented reason** — what each library does, why it was chosen over the obvious alternatives, how the pieces connect, and what happens when a user clicks a button. It's written to be read end-to-end once, then used as a reference.

---

## Table of Contents

1. [What This Project Actually Is](#1-what-this-project-actually-is)
2. [Tech Stack — What & Why](#2-tech-stack--what--why)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Folder-by-Folder Guide](#4-folder-by-folder-guide)
5. [Routing & Pages (Next.js App Router)](#5-routing--pages-nextjs-app-router)
6. [Data Model — Prisma + Postgres](#6-data-model--prisma--postgres)
7. [Server Actions — the Write Path](#7-server-actions--the-write-path)
8. [Real-Time Collaboration — Liveblocks](#8-real-time-collaboration--liveblocks)
9. [The Canvas Engine — Fabric.js](#9-the-canvas-engine--fabricjs)
10. [Feature-by-Feature Walkthrough](#10-feature-by-feature-walkthrough)
11. [State Management Patterns](#11-state-management-patterns)
12. [Styling System](#12-styling-system)
13. [Environment Variables](#13-environment-variables)
14. [Local Development](#14-local-development)
15. [Deployment (Vercel)](#15-deployment-vercel)
16. [Anticipated Interview Questions](#16-anticipated-interview-questions)

---

## 1. What This Project Actually Is

Open the app and you land on a **dashboard** (`/dashboard`) listing every design anyone has created — a grid of cards with a live-rendered thumbnail, a name, and "edited N minutes ago". Click **New design** and a blank row is created in Postgres, and you're redirected into `/design/[id]` — a full-screen **editor**: a dark toolbar across the top (tools, undo/redo, zoom, share, collaborator avatars), a **Layers panel** on the left, the canvas in the middle, and a **design/inspector panel** on the right (position, fill, stroke, typography, effects).

Everyone who opens that same URL joins the same **Liveblocks room**: they see the same shapes, each other's cursors moving in real time, can drop comment pins anywhere on the canvas, fire emoji reactions, and type quick messages that float next to their cursor ("cursor chat"). Every edit — drag a rectangle, change a fill color, delete a shape — is synced to every other tab within milliseconds, with no manual socket code: it rides on Liveblocks' CRDT storage.

The **visual design is a deliberate, detailed clone of Figma's own UI** — exact toolbar height (40px), the same 11px UI font size, the same blue accent (`#0d99ff`), the same menu shadows, the same selection-handle styling. The app's own product name is **Canvo**; "Figma" only survives internally as CSS custom-property/class prefixes (`figma-*`, `fig-*`) and code comments explaining *why* a value matches Figma's — the visual language is the reference, not the brand.

---

## 2. Tech Stack — What & Why

| Library | Version | What it does here | Why this one |
|---|---|---|---|
| **Next.js** | 14.2 (App Router) | The framework: routing, Server Components, Server Actions, streaming/`loading.tsx`, the dev/build/prod server. | Server Components let the dashboard fetch designs straight from Postgres with zero client-side data-fetching code; Server Actions replace what would otherwise be a hand-rolled REST/API-route layer for create/rename/delete. |
| **React 18** | ^18 | UI runtime. `useTransition`, `Suspense`, `cache()`. | Required by Next 14; `useTransition` powers every "optimistic-ish" button (new design, rename, delete) so the UI shows a pending state without extra state machinery. |
| **TypeScript** | ^5 | Static typing across the whole app. | Fabric.js and Liveblocks both have large, easy-to-misuse APIs (canvas objects, presence shapes); typing `Attributes`, `CustomFabricObject<T>`, and the Liveblocks `Presence`/`Storage`/`RoomEvent`/`ThreadMetadata` shapes catches a large class of "wrong field name" bugs at compile time. |
| **Fabric.js** (`fabric` ^5.3) | 5.3 | The actual 2D canvas engine: shape primitives (Rect, Circle, Triangle, Line, IText, Image, Path), hit-testing, selection handles, scaling/rotation math, drag-to-draw, `toDataURL` export. | Building a canvas editor's object model, selection UI, and transform math from raw `<canvas>` calls is a large undertaking Fabric already solves well; it also exposes an object-oriented model (`fabric.Object` subclasses) that's easy to extend — see the custom rounded-rect renderer in `lib/rounded-rect.ts`. |
| **@liveblocks/client / react / react-ui** | ^2.7 / ^2.24 | Real-time multiplayer: presence (cursors, usernames), shared CRDT storage (`LiveMap` of canvas objects), broadcast events (reactions), and a full commenting system (threads, composer UI) via `react-ui`. | Liveblocks is purpose-built for exactly this: conflict-free shared state across clients, presence out of the box, and a pre-styled (but fully re-themeable) comments UI — so no custom WebSocket server, no operational-transform code, and no comment-thread UI to build from scratch. |
| **Prisma 7** (`@prisma/client`, `prisma`, `@prisma/adapter-pg`) | ^7.10 | Typed database client + migrations/schema for the `Design` table in Postgres. | Type-safe queries (`prisma.design.findMany(...)`) with zero hand-written SQL, and Prisma 7's driver-adapter model lets the app hand it a `pg` `Pool` explicitly — see [§6](#6-data-model--prisma--postgres) for exactly why that matters here. |
| **pg (via @prisma/adapter-pg)** | — | The actual Postgres wire-protocol driver Prisma's adapter wraps. | Neon (the Postgres host used here) is accessed over its **pooled** connection endpoint from serverless functions — the driver-adapter model is what lets that pooled connection string be handed straight to Prisma. |
| **Neon** (Postgres host, referenced in comments/env) | — | Hosts the actual `Design` table. | Serverless-friendly Postgres: a connection pooler suited to Vercel's short-lived serverless functions, and a generous free tier — a natural fit for a project also deployed on Vercel. |
| **Tailwind CSS** | ^3.4 | All styling — no CSS Modules, no styled-components. | Utility classes keep the pixel-perfect Figma-matching values (11px text, `#2c2c2c` toolbar, 5px radii) colocated with the markup instead of scattered across stylesheet files; `tailwind.config.ts` defines a whole `figma.*` color palette and font-size scale so those exact values are named, not repeated. |
| **tailwind-merge + clsx** (via `cn()`) | ^2.5 / — | Merges conditional/conflicting Tailwind classes safely. | Buttons and menu items build up class strings from several conditions (active/hover/disabled); `clsx` composes them, `twMerge` resolves conflicts (e.g. two different `bg-*` classes) so the last one wins predictably. |
| **class-variance-authority** | ^0.7 | Installed as a dependency for variant-based component styling (the shadcn/ui convention — see `components.json`). | Present as part of the shadcn/ui scaffolding (`components.json` configures aliases for a `components/ui` folder) even though this app's own components are hand-built rather than shadcn-generated. |
| **tailwindcss-animate** | ^1.0.7 | Tailwind plugin adding animation utility classes. | Part of the same shadcn/ui-style Tailwind setup; the app's actual animations (`fig-pop`, `fig-fly-up`) are hand-written `@keyframes` in `globals.css` rather than this plugin's utilities, but it ships as part of the base config. |
| **lucide-react** | ^0.445 | Icon library — installed, but the app draws its own icon set instead (`components/icons.tsx`) to match Figma's glyphs pixel-for-pixel. | Available for any icon not worth hand-drawing; the toolbar/panel icons that *do* need to look exactly like Figma's are custom inline SVG components. |
| **jsPDF** | ^4.2 | Client-side PDF generation for the "Export as PDF" menu action. | Turns the canvas's own `toDataURL()` PNG straight into a one-page PDF sized to the canvas — entirely in the browser, no server round trip. |
| **uuid** | ^10 | Generates `objectId` for every shape/path/image (`v4()`). | Every canvas object needs a stable, collision-free ID to be a key in the shared `LiveMap` and to survive serialize/deserialize round-trips (copy-paste, storage sync). |

### Why not the "obvious" alternatives?

- **Why Fabric.js and not `<canvas>` + raw drawing code, or a heavier tool like Konva/PixiJS?** Fabric gives object-level hit-testing, selection handles, and serialization (`toObject`/`enlivenObjects`) for free — exactly the primitives a Figma-like tool needs, without the game-engine overhead of Pixi or the extra abstraction of a React-canvas wrapper.
- **Why Liveblocks and not a custom Socket.IO/WebSocket server?** A hand-rolled server would need to solve conflict resolution (two people move the same rectangle at once), presence broadcasting, and reconnection/backoff — all of which Liveblocks' `LiveMap` (a CRDT) and presence system already handle. It also ships an off-the-shelf, restylable comments UI (`@liveblocks/react-ui`), which alone would be a significant feature to build.
- **Why Prisma and not a raw `pg` client or an ORM like Drizzle?** The `Design` model is trivial (four columns), so any option would work; Prisma was chosen for its generated types and migration workflow, and its driver-adapter API (new in v7) is what makes it possible to point Prisma explicitly at Neon's pooled endpoint rather than fighting Prisma's own connection-string parsing.

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser                                                             │
│                                                                       │
│   /dashboard  ──────────────►  Server Component (app/dashboard)      │
│   (React tree)                  reads designs via lib/designs.ts     │
│        │                              │                              │
│        │  createDesign() / rename /   ▼                              │
│        │  delete  (Server Actions) ──────────► Prisma ──► Postgres   │
│        │                                          (Neon)             │
│        ▼                                                             │
│   /design/[id]  ──►  <Room roomId=… >  ──►  LiveblocksProvider       │
│        │                                        │                    │
│        │                                        ▼                    │
│        │                              Liveblocks realtime servers    │
│        │                              (Storage CRDT, Presence,       │
│        │                               Broadcast events, Threads)    │
│        ▼                                        ▲                    │
│   <Editor> ──► <Live> ──► Fabric.js <canvas>     │                   │
│        │            mouse/keyboard events ───────┘                   │
│        │            (useMutation writes shape data into LiveMap)     │
│        ▼                                                             │
│   canvas changes settle → captureThumbnail() → saveThumbnail()       │
│   (Server Action) ──► Prisma ──► Postgres (updates thumbnail + bumps │
│                                    updatedAt, which reorders the     │
│                                    dashboard)                        │
└─────────────────────────────────────────────────────────────────────┘
```

**Two separate sources of truth, deliberately kept separate:**

1. **Postgres (via Prisma)** stores *metadata about a design* — its `id`, `name`, a JPEG `thumbnail` (as a base64 data URL), `createdAt`/`updatedAt`. This is what the dashboard lists and what server actions (create/rename/delete) touch.
2. **A Liveblocks room** stores *the actual canvas content* — every shape's Fabric.js serialization, keyed by `objectId`, inside a `LiveMap`. This is what the editor renders and what every connected browser mutates directly through Liveblocks' realtime protocol.

The two are linked by one convention: `roomIdFor(designId)` in `lib/designs.ts` turns a Postgres row's `id` into the Liveblocks room name (`design_<id>`). The canvas itself never touches Postgres directly — Postgres doesn't know what's *on* the canvas at all, only that a design with this name exists and (via the thumbnail) roughly what it currently looks like.

---

## 4. Folder-by-Folder Guide

```
app/                     Next.js App Router — routes, layouts, server actions
  actions/designs.ts      "use server" — createDesign, renameDesign, deleteDesign, saveThumbnail
  dashboard/               /dashboard route (list all designs)
    page.tsx, loading.tsx
  design/[id]/             /design/:id route (the editor)
    page.tsx, loading.tsx
  Room.tsx                 Liveblocks provider wrapper — "use client"
  layout.tsx                Root HTML shell, <title>, Inter font <link>
  page.tsx                   "/" — redirects straight to /dashboard
  globals.css                 Tailwind layers + Figma-styled component classes

components/                Every React component, grouped by feature
  Editor.tsx                 The editor's top-level orchestrator (owns all the refs/state)
  Live.tsx                    Canvas + presence + keyboard-shortcut wiring (biggest client component)
  Navbar.tsx, LeftSidebar.tsx, RightSidebar.tsx    The three chrome panels
  ShapesMenu.tsx, Tooltip.tsx  Small reusable toolbar widgets
  icons.tsx                     Every hand-drawn SVG icon used in the UI
  comments/                     Comment pins, the "new thread" composer, the overlay that hosts them
  cursor/                        Live remote cursors + the "cursor chat" input
  reactions/                      Emoji reaction picker + the flying-emoji animation
  dashboard/                       Dashboard.tsx (grid + search) and DesignCard.tsx (one card)
  skeletons/                        Loading-state placeholders for both routes

lib/                        Framework-agnostic logic — no JSX
  canvas.ts                   Fabric canvas setup + every canvas event handler
  shapes.ts                    Shape factories (createRectangle, createCircle, …), z-index counter
  rounded-rect.ts               Custom per-corner border-radius renderer for fabric.Rect
  key-events.ts                  Copy/paste/delete/undo/redo keyboard-shortcut logic
  starter-design.ts               Builds the pre-populated "starter screen" a new file opens with
  thumbnail.ts                     Crops + exports the canvas to a small JPEG data URL
  designs.ts                        Prisma queries for the dashboard + design metadata
  prisma.ts                          The singleton PrismaClient, wired to Neon via a driver adapter
  useMaxZIndex.ts                     Hook: highest z-index across all comment threads
  utils.ts                             cn(), generateRandomName(), relativeTime(), exportToPdf(), etc.

hooks/
  useDismiss.ts               Click-outside / Escape-to-close for popovers and menus
  useInterval.ts               Declarative setInterval (Dan Abramov's classic pattern)

constants/index.ts            Toolbar tool list, keyboard shortcut map, dropdown option lists, colors

types/
  type.ts                      All the app's own TypeScript types (Attributes, ActiveElement, …)
  declaration.d.ts              Ambient module declaration for *.module.css imports

prisma/schema.prisma          The Design model + Postgres datasource declaration
prisma.config.ts               Prisma 7's CLI config (connection URL for migrations, schema path)
liveblocks.config.ts          Declares the shape of Presence/Storage/RoomEvent/ThreadMetadata globally

public/assets/CursorSVG.tsx   The pointer-arrow SVG used for every live cursor

tailwind.config.ts            The whole figma.* color palette, 11px UI font scale, box-shadows
vercel.json                   Pins the Vercel build to the Next.js framework preset
```

---

## 5. Routing & Pages (Next.js App Router)

This app uses Next's **App Router** (the `app/` directory), where every folder under `app/` is a route segment, `page.tsx` is what renders for that route, and `loading.tsx` is an automatic Suspense fallback Next shows while `page.tsx`'s async work is in flight.

### `app/page.tsx` — `/`

```ts
export default function Home() {
  redirect("/dashboard");
}
```

There's no real "home page" — `/` exists purely so the app has *a* root page (its own comment explains: without one, Next's build can't emit the `/_not-found` page correctly) and immediately redirects. Deliberately **no `loading.tsx`** next to it: once a loading UI has streamed to the client, the response is already committed as a 200, so it's too late to turn it into a redirect — better to have no flash at all than a flash of a loading state that's about to disappear.

### `app/dashboard/page.tsx` — `/dashboard`

An **async Server Component**. It calls `listDesigns()` (a Prisma query in `lib/designs.ts`) directly on the server, then renders `<Dashboard designs={designs} />` — a Client Component that receives the already-fetched data as a prop. No client-side `fetch`, no loading spinner logic on the client for the initial list.

```ts
export const dynamic = "force-dynamic";
```

This opts the route out of Next's default static/ISR caching. The comment in the code is explicit about why: *"The list changes whenever anyone edits anything, so it is never prerendered."* Without this, Next could serve a stale, build-time-frozen list of designs.

`app/dashboard/loading.tsx` renders `<DashboardSkeleton />` while the Prisma query is pending — the *real* toolbar chrome (not a generic spinner), because that part never changes once data loads, so drawing it immediately makes the page feel already-open.

### `app/design/[id]/page.tsx` — `/design/:id`

Also an async Server Component with `dynamic = "force-dynamic"`. It:

1. Looks up the design's `name` via `getDesign(id)` (a Prisma query wrapped in React's `cache()` so a duplicate lookup in the same request tree doesn't cost a second database round trip).
2. Calls `notFound()` (Next's built-in 404 trigger) if no such design exists.
3. Renders `<Room roomId={roomIdFor(design.id)} name={design.name}><Editor .../></Room>` — the Liveblocks room wrapper, with the editor as its child.

`app/design/[id]/loading.tsx` renders `<EditorSkeleton />` with **no name prop** — the design's name isn't known yet at that point, and the room's own Suspense fallback (inside `<Room>`) fills it in the instant the row arrives, without the surrounding frame changing.

### Why Server Actions instead of API routes?

`app/actions/designs.ts` starts with `"use server"` — every exported function in that file becomes a **Server Action**: a function defined on the server that a Client Component can still call directly, as if it were local, without hand-writing a `fetch()` call or an `app/api/*/route.ts` handler. Next serializes the call over the wire automatically. This is why `Dashboard.tsx` can do `onClick={() => startTransition(() => void createDesign())}` with no `fetch`, no JSON parsing, and no manual error boundary for the network call.

---

## 6. Data Model — Prisma + Postgres

### The schema (`prisma/schema.prisma`)

```prisma
model Design {
  id   String @id @default(cuid())
  name String @default("Untitled")

  thumbnail String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([updatedAt])
}
```

One table, four meaningful columns:

- **`id`** — a `cuid()` (collision-resistant unique ID), used both as the Postgres primary key *and* to derive the Liveblocks room name.
- **`name`** — what shows on the dashboard card and in the editor's title bar; defaults to `"Untitled"`.
- **`thumbnail`** — a full JPEG **data URL** (`data:image/jpeg;base64,...`) of the canvas's current contents, stored directly as a Postgres text column rather than in an object-storage bucket (see [§10](#thumbnail-generation) for why this is safe at this app's scale).
- **`updatedAt`** — bumped automatically by Prisma (`@updatedAt`) on every write, which is also what the dashboard sorts by (`orderBy: { updatedAt: "desc" }`) — so a design "moves to the top" the moment its thumbnail is refreshed, which happens on every meaningful edit.

The `@@index([updatedAt])` makes that sort efficient even as the table grows.

### Why three separate files for one database connection?

Prisma 7 changed how connection configuration works, and this project uses that change deliberately — it's a good interview topic on its own:

| File | Read by | Connects to | Why |
|---|---|---|---|
| `prisma/schema.prisma` | Prisma CLI & codegen | *(no URL here — Prisma 7 keeps it out of the schema)* | Just declares the shape of the data and that the provider is `postgresql`. |
| `prisma.config.ts` | The Prisma **CLI** (`prisma generate`, `prisma db push`, `prisma migrate`) | `DIRECT_URL` | Migrations issue DDL (schema-changing SQL), and **Neon's connection pooler rejects DDL** — so schema changes must go straight to the database's direct endpoint, bypassing the pooler. |
| `lib/prisma.ts` | The running Next.js **app**, at request time | `DATABASE_URL` | The app's own queries (`findMany`, `create`, …) are ordinary short-lived queries — exactly what a pooler is for, and essential when the app runs as many concurrent, short-lived serverless functions on Vercel. |

```ts
// lib/prisma.ts
const client = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
```

This is Prisma 7's **driver adapter** pattern: instead of Prisma parsing a connection string itself, you hand it a real `pg` (node-postgres) connection via `@prisma/adapter-pg`, so it's explicit which URL the app talks to versus which one the CLI does — no ambiguity about which one is "the" `DATABASE_URL`.

The client is memoized on `globalThis` in development:

```ts
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? client();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Next's dev server hot-reloads server modules on every file save. Without this cache, every hot reload would construct a *new* `PrismaClient` — and each one opens its own connection pool — quickly exhausting Neon's connection limit. In production (where the module isn't hot-reloaded), a fresh client per cold start is fine and expected.

### `prisma.config.ts` — loading `.env` safely

```ts
const envFile = path.join(process.cwd(), ".env");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
```

The Prisma CLI no longer auto-loads `.env` the way older versions did, so this file loads it manually — but only if the file actually exists. On a CI/Vercel build, cloned straight from git, there **is no `.env`** file (it's gitignored); the environment variables are injected directly into `process.env` by the platform instead. Calling `process.loadEnvFile()` unconditionally would throw `ENOENT` in that case and fail the entire build — which is exactly what happened once in this project's history before the `fs.existsSync` guard was added.

---

## 7. Server Actions — the Write Path

All in `app/actions/designs.ts`, all client-callable, all running on the server:

```ts
export async function createDesign(name?: string) {
  const design = await prisma.design.create({ data: { name: name ? cleanName(name) : "Untitled" } });
  revalidatePath("/dashboard");
  redirect(`/design/${design.id}`);
}
```
Creates the Postgres row, then **`redirect()`s** the user straight into the new design — the editor itself is responsible for seeding the canvas's starter content on arrival (see [§10](#starter-design)), not this action.

```ts
export async function renameDesign(id: string, name: string) { … revalidatePath("/dashboard"); }
export async function deleteDesign(id: string) { … revalidatePath("/dashboard"); }
```
Straightforward Prisma `update`/`delete`. Every mutation calls **`revalidatePath("/dashboard")`** — Next's cache-invalidation primitive, telling it the dashboard's Server Component data is now stale so the next visit (or the current `router` refresh Next performs after a Server Action) re-runs `listDesigns()` instead of serving a cached result.

A note in `deleteDesign`'s source is worth understanding: deleting the Postgres row does **not** delete the Liveblocks room — that would require a *secret* API key (server-side only, with elevated permissions), and this app only holds a *public* key (see [§8](#auth-model)). The orphaned room is harmless: nothing links to it anymore, and it simply goes unused.

```ts
export async function saveThumbnail(id: string, thumbnail: string) {
  if (!thumbnail.startsWith("data:image/") || thumbnail.length > MAX_THUMBNAIL_LENGTH) return;
  await prisma.design.updateMany({ where: { id }, data: { thumbnail } });
  revalidatePath("/dashboard");
}
```
Called from the editor a few seconds after the canvas settles (see [§10](#thumbnail-generation)). Two defensive checks: the string must actually look like an image data URL, and it's capped at ~1.5MB of base64 — both cheap guards against a malformed or absurdly large payload reaching Postgres. `updateMany` (not `update`) is used deliberately: if the design was deleted in another tab while this one still had it open, `update` would throw on a missing row; `updateMany` just silently matches zero rows.

Every one of these also **doubles as the "last edited" signal** — `updatedAt` only moves because `saveThumbnail` (or a rename) touched the row, which is exactly what the dashboard's "3 minutes ago" and sort order are keyed on.

---

## 8. Real-Time Collaboration — Liveblocks

This is the architectural core of the app. Liveblocks provides four distinct primitives, all typed together in one file, `liveblocks.config.ts`:

```ts
declare global {
  interface Liveblocks {
    Presence: { cursor: {x,y}|null; cursorColor: string; editingText: boolean; message: string; username: string };
    Storage: { canvasObjects: LiveMap<string, any> };
    UserMeta: { id: string; info: {} };
    RoomEvent: ReactionEvent;
    ThreadMetadata: { resolved: boolean; zIndex: number; x: number; y: number; time?: number; deleted?: boolean };
  }
}
```

This module-augmentation pattern means every Liveblocks hook used anywhere in the app (`useMyPresence`, `useStorage`, `useBroadcastEvent`, `useThreads`, …) is **fully typed** against this one declaration — no `any` scattered through component code for what a cursor or a thread's metadata looks like.

### Rooms (`app/Room.tsx`)

```tsx
<LiveblocksProvider publicApiKey={process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!}>
  <RoomProvider id={roomId} initialPresence={…} initialStorage={() => ({ canvasObjects: new LiveMap() })}>
    <ClientSideSuspense fallback={<EditorSkeleton name={name} />}>{children}</ClientSideSuspense>
  </RoomProvider>
</LiveblocksProvider>
```

- **`LiveblocksProvider`** authenticates the client to Liveblocks' servers using a **public API key** — meaning any browser holding this key can join *any* room and read/write freely. That's a deliberate simplicity trade-off for this project (no login system, no per-room access control): "anyone with the link can edit," as the Share menu literally says.
- **`RoomProvider`** connects to one specific room (`id={roomId}`), and seeds what a brand-new room's presence and storage look like the very first time anyone connects.
- **`ClientSideSuspense`** shows `EditorSkeleton` until the WebSocket connection and initial storage sync complete — this is why `loading.tsx` and this fallback are two *different* skeletons: the route-level one covers the Postgres lookup, this one covers the Liveblocks handshake, and both render the same visual frame so the transition between them is invisible.

`roomIdFor()` (in `lib/designs.ts`) is the single place that decides a design's room name: `design_<id>` for anything created through the app, with one special case — `LEGACY_DESIGN_ID` maps to the literal room `"my-room"`, the room this project used *before* Postgres-backed designs existed. That one row in the database is a pointer preserving whatever was drawn in the app's original single-room prototype, so it isn't lost.

<a id="auth-model"></a>
**Why a public key and not a secret-key auth endpoint?** A secret key requires a server-side token-issuing route (`/api/liveblocks-auth`) that authenticates the *user* first — which this app doesn't have (there's no login). The public-key model trades per-user identity and permissions for zero-auth simplicity, at the cost of a few features that need a "real" identity — e.g. deleting a comment thread you didn't start (see below).

### Storage — the shared canvas (a CRDT)

```ts
initialStorage={() => ({ canvasObjects: new LiveMap() })}
```

`LiveMap<string, any>` is Liveblocks' CRDT-backed map type: every connected client can insert/update/delete keys concurrently, and Liveblocks' server resolves conflicts and rebroadcasts the merged result to everyone — no manual conflict resolution code anywhere in this app. Every shape on the canvas is one entry, keyed by its `objectId` (a `uuid`), value = the Fabric.js serialization of that object (`object.toObject([...])`).

Two hooks do all the writing:

```ts
const syncShapeInStorage = useMutation(({ storage }, object) => {
  const shapeData = object.toObject(["objectId", "zIndex", "cornerRadii"]);
  storage.get("canvasObjects").set(object.objectId, shapeData);
}, []);

const deleteShapeFromStorage = useMutation(({ storage }, objectId) => {
  storage.get("canvasObjects").delete(objectId);
}, []);
```

`useMutation` batches a storage write into one atomic operation Liveblocks can sync and (crucially) **undo/redo as a single step** — see below. `toObject([...])` is Fabric's own serializer, extended here with three custom properties (`objectId`, `zIndex`, `cornerRadii`) that Fabric doesn't know about natively but this app's canvas relies on.

One hook does all the *reading*:

```ts
const canvasObjects = useStorage((root) => root.canvasObjects);
```

`useStorage` subscribes the component to just this slice of storage, so `<Editor>` re-renders exactly when the shared map changes — whether that change came from this browser tab or a teammate's. That re-render is what drives `<Live>`'s `renderCanvas()` effect, which clears the Fabric canvas and redraws every object from the current storage snapshot, ordered by each object's stored `zIndex` (storage is a `Map`, which has no reliable draw order of its own — see [§9](#z-index)).

### Undo/Redo — for free, from the CRDT

```ts
const undo = useUndo();
const redo = useRedo();
const history = useHistory();
```

Liveblocks' `useUndo`/`useRedo` operate on the **storage history**, automatically tracking every `useMutation` call as an undoable step — there is no hand-written undo stack in this codebase. `history.clear()` is called once, right after the starter design is seeded into a brand-new room, specifically so that a first-time user's very first `⌘Z` doesn't wipe the pre-built starter screen they never asked to create.

### Presence — who's here, and where's their cursor

```ts
initialPresence: () => ({
  cursor: null, cursorColor: COLORS[random], editingText: false, message: "", username: generateRandomName(),
})
```

`generateRandomName()` (in `lib/utils.ts`) combines a random adjective + animal ("Happy Dolphin") — every visitor gets a friendly, anonymous identity with no sign-up step. `useMyPresence()` both reads and updates your own presence; `useOthers()` gives a live list of every other connected client's presence, which `<LiveCursors>` maps straight into rendered `<Cursor>` components, `<Navbar>` maps into the row of collaborator avatars, and the "cursor chat" feature writes into (`message`).

### Broadcast events — reactions

```ts
const broadcast = useBroadcastEvent();
broadcast({ x, y, value: reaction });

useEventListener(({ event }) => { setReactions(prev => prev.concat([...])) });
```

Unlike presence (which persists as long as you're connected) or storage (which persists forever), a **broadcast event** is fire-and-forget: every other connected client's `useEventListener` fires once, and it's gone. Perfect for something transient like "someone clicked 🔥 at this point" — nothing needs to be stored or reconciled.

### Threads — comments

```ts
const { threads } = useThreads();
```

`useThreads()` gives every comment thread in the room; `<Composer>` and `<Thread>` (both from `@liveblocks/react-ui`) render Liveblocks' pre-built comment-composing and comment-reading UI — restyled here (see `.lb-*` overrides in `globals.css` and the `--lb-*` CSS variables) to match the rest of the Figma-styled chrome, but not rebuilt from scratch.

Each thread carries custom **metadata** — `{ x, y, resolved, zIndex, deleted? }` — where `x`/`y` are **canvas-space coordinates**, not screen pixels. That's what makes a comment pin track the artwork correctly when someone pans or zooms: `PinnedThread.tsx` converts that canvas anchor to a screen position every render via `canvasToScreen(x, y, viewport)`, using the canvas's live `viewportTransform` matrix.

**The soft-delete workaround** (`PinnedThread.tsx`) is one of the more interesting details in the codebase:

```ts
try {
  deleteThread(thread.id);
} catch {
  // On a public API key the server gives every connection its own anonymous
  // user id, but the client compares against the literal string "anonymous",
  // so Liveblocks' "only the author may delete" check can never pass.
  editThreadMetadata({ threadId: thread.id, metadata: { deleted: true } });
}
```
Liveblocks' real `deleteThread` enforces "only the thread's author can delete it" — a check that (per the code comment) can never actually pass under this app's public-key/no-login setup. Rather than losing the "delete a thread" feature entirely, the app **flags** the thread (`deleted: true` in its metadata, a field this app added — not a Liveblocks built-in) and every reader simply filters flagged threads out (`CommentsOverlay.tsx`: `threads.filter(t => !t.metadata.deleted)`). The thread technically still exists on Liveblocks' servers; it's just invisible to everyone.

---

## 9. The Canvas Engine — Fabric.js

`lib/canvas.ts` is where a raw `<canvas>` element becomes an editable design surface. `initializeFabric()` does the one-time setup:

```ts
fabric.Object.prototype.set({
  borderColor: "#0d99ff", cornerColor: "#ffffff", cornerStrokeColor: "#0d99ff",
  cornerStyle: "rect", cornerSize: 8, transparentCorners: false, strokeUniform: true,
});
fabric.Object.prototype.setControlsVisibility({ mtr: false }); // no rotation handle — Figma keeps rotation in the panel instead
```

Every shape gets Figma's selection-handle look by default, globally, in one place — square white handles with a blue keyline, no floating rotate stalk.

### Custom canvas properties: `objectId`, `zIndex`, `cornerRadii`

Fabric objects are plain JS objects underneath; this app attaches three properties Fabric itself doesn't define, typed via `CustomFabricObject<T>` in `types/type.ts`:

<a id="z-index"></a>
- **`objectId`** — a `uuid()`, the key every shape is stored under in the Liveblocks `LiveMap`. Without it, there'd be no stable way to say "this exact shape, update it" across a network round trip.
- **`zIndex`** — Liveblocks storage is a `Map`, which has *no* guaranteed draw order once objects are deleted, re-inserted, or arrive out of order over the network. Draw order is therefore stored explicitly and used to sort before every render (`renderCanvas()`: `.sort((a,b) => a.zIndex - b.zIndex)`), and "bring to front / send to back" (`bringElement()` in `lib/shapes.ts`) just rewrites this number to be higher/lower than every sibling's.
- **`cornerRadii`** — a 4-tuple `[topLeft, topRight, bottomRight, bottomLeft]`; see below.

### Independent corner radii — `lib/rounded-rect.ts`

Fabric's built-in `fabric.Rect` only supports one uniform `rx`/`ry` — it can't round each corner independently, which Figma's design panel exposes as a core control. Rather than forking Fabric, `installRoundedRectRenderer()` monkey-patches `fabric.Rect.prototype._render` (the method Fabric calls to actually paint a rect) with a custom implementation that:

1. Reads a `cornerRadii` tuple off the object (falling back to a uniform `rx` if absent, so plain rects still work).
2. Divides each radius by the object's current `scaleX`/`scaleY` and draws in **local (pre-scale) space** — because Fabric paints through a context already scaled by the object's own transform, so a naive fixed-radius corner would stretch into an ellipse while a resize handle is being dragged. Compensating like this keeps every corner visually circular at any scale.
3. Shrinks radii proportionally when two adjacent corners would overlap on a short edge — the same conflict-resolution rule CSS's own `border-radius` uses.
4. Draws the rounded rectangle path with `ctx.ellipse()` arcs at each corner and calls Fabric's own `_renderPaintInOrder` so fill/stroke/shadow still work exactly as they do for every other shape.

It also patches `toObject` so `cornerRadii` is *always* included in serialization (not just when explicitly requested), meaning copy/paste and Liveblocks sync never silently drop a shape's per-corner rounding.

### The mouse-event pipeline

Wired once, on mount, in `<Live>`'s main `useEffect`:

| Event | Handler | What happens |
|---|---|---|
| `mouse:down` | `handleCanvasMouseDown` | If a shape tool is active: creates a new shape at the click point and remembers the drag's origin point (`setDragOrigin`). If `select` and clicking an existing shape: makes it the active object. If holding Space or the middle mouse button: starts a pan instead (handled inline in `Live.tsx`, not `canvas.ts`, since panning bypasses shape creation entirely). |
| `mouse:move` | `handleCanvaseMouseMove` | While drawing: resizes the in-progress shape to the box between the drag origin and the current pointer (or, for a line, moves its second endpoint; for a circle, uses the longer axis as the diameter) — then calls `syncShapeInStorage` on every move, so collaborators see the shape grow in real time as it's drawn, not just once it's finished. |
| `mouse:up` | `handleCanvasMouseUp` | Finishes the shape. If the total drag was shorter than `MIN_DRAG` (4px, scaled by zoom) — i.e., it was really a click, not a drag — `applyClickSize()` gives it Figma's default 100×100 size instead of leaving a zero-size shape. |
| `path:created` | `handlePathCreated` | Fired by Fabric's own freeform-drawing brush once a pencil stroke is lifted; the resulting `fabric.Path` gets an `objectId`/`zIndex` and is synced. |
| `object:modified` | `handleCanvasObjectModified` | Fires after a drag/resize/rotate finishes. For rects specifically: if the user resized via a handle (which changes `scaleX`/`scaleY`), the scale is folded back into `width`/`height` and reset to 1 — because Figma keeps corner radii in absolute pixels, and a radius that scaled with the shape would stretch unnaturally otherwise. |
| `object:moving` / `object:scaling` | live-updates the right-panel's X/Y/width/height fields as you drag — with a same-value check so it doesn't force a re-render on every single mouse-move pixel. |
| `selection:created` / `updated` / `cleared` | Keeps `activeObjectRef`, the `Selection` state (drives the Layers panel highlight), and the right-panel's `Attributes` in sync with whatever's currently selected. |
| `mouse:wheel` | `handleCanvasZoom` | Plain wheel/trackpad scroll pans the canvas; holding **Ctrl/Cmd** while scrolling zooms instead, using `zoomToPoint()` so the point under the cursor stays fixed — the same convention Figma and Excalidraw both use. |
| `after:render` | Watches the canvas's `viewportTransform` matrix for *any* change (wheel-pan, space-drag, or the toolbar's own zoom control) and pushes it into React state once, in one place — instead of every panning/zooming code path having to separately report "the viewport moved." This is what comment pins subscribe to, to stay glued to their canvas anchor. |

### Rendering from storage

```ts
export const renderCanvas = ({ fabricRef, canvasObjects, activeObjectRef }) => {
  fabricRef.current?.clear();
  fabricRef.current.backgroundColor = CANVAS_BACKGROUND; // clear() also wipes the background — restore it
  const ordered = [...canvasObjects].sort((a, b) => a[1].zIndex - b[1].zIndex);
  ordered.forEach(([objectId, objectData]) =>
    fabric.util.enlivenObjects([objectData], (objs) => objs.forEach(obj => {
      if (activeObjectRef.current?.objectId === objectId) fabricRef.current.setActiveObject(obj);
      fabricRef.current.add(obj);
    }), "fabric")
  );
};
```

This is the single function that turns "what's in the Liveblocks `LiveMap` right now" into "what's actually painted on screen," and it runs every time `useStorage` reports a change — whether that change was made locally or arrived from another collaborator. `fabric.util.enlivenObjects` is Fabric's own deserializer, turning a plain JS object (exactly what was stored) back into a live `fabric.Rect`/`fabric.Circle`/etc. instance. Re-selecting the previously active object by matching `objectId` is what makes an in-progress selection survive a redraw caused by *someone else's* edit elsewhere in the room.

### Panning & zooming

- **Space-drag or middle-mouse-drag**: tracked with a plain ref (`panFromRef`) in `Live.tsx`, calling `canvas.relativePan()` on every `mouse:move` — intentionally handled *outside* `lib/canvas.ts`'s shape-drawing pipeline, since a pan is a viewport operation, not a canvas-object operation.
- **Toolbar zoom control / `+`/`-`/`⇧0` shortcuts**: `Editor.tsx`'s `setZoom()` clamps to `[MIN_ZOOM, MAX_ZOOM]` (0.1× to 8×) and zooms around the **center of the viewport** via `zoomToPoint`, matching Figma's own toolbar zoom behavior (as opposed to wheel-zoom, which zooms around the cursor).

<a id="starter-design"></a>
### The starter design (`lib/starter-design.ts`)

A brand-new, empty room is a blank page with nothing to click, select, or learn the tools on — so `Editor.tsx` seeds it once, on first arrival, with a real, pre-built mobile-wallet UI screen (`buildStarterDesign()`), built entirely out of the same shape primitives ordinary drawing uses. That means every layer of the starter screen is a completely normal, fully editable object — select it, restyle it, delete it — nothing about it is special or locked. `frameStarterDesign()` then computes a zoom level that fits the whole starter screen (plus its label) into the current viewport and centers the camera on it, so a new file opens already framed on something worth looking at rather than at the canvas origin.

<a id="thumbnail-generation"></a>
### Thumbnail generation (`lib/thumbnail.ts`)

Three seconds after the canvas last changed (`THUMBNAIL_DELAY` in `Editor.tsx`, debounced with a `setTimeout` that resets on every further change), `captureThumbnail()`:

1. Computes the bounding box of every object on the canvas (in absolute, viewport-independent coordinates).
2. Temporarily resets the viewport transform to identity — so the shot reflects the *design*, not wherever the user happened to be scrolled/zoomed to.
3. Calls Fabric's `canvas.toDataURL()` cropped to that bounding box (plus padding), downscaled so neither dimension exceeds 480×360, as a JPEG at 0.7 quality.
4. Restores the original viewport.
5. Sends the resulting data URL to the `saveThumbnail` server action.

This is also, incidentally, the *only* signal the dashboard has that a design was edited at all — there's no separate "last edited" event; the thumbnail refresh **is** the edit signal, since it's what bumps `updatedAt`.

---

## 10. Feature-by-Feature Walkthrough

- **Shapes** — Rectangle, Ellipse, Triangle, Line, grouped under one "Shape" toolbar entry (`ShapesMenu.tsx`) that remembers and repeats whichever was picked last, exactly like Figma's own shape-tool button.
- **Freeform drawing (Pencil)** — hands off entirely to Fabric's built-in `isDrawingMode`/`freeDrawingBrush`; the app only attaches an `objectId`/`zIndex` once the stroke is lifted (`path:created`).
- **Text** — an editable `fabric.IText`, with the right panel exposing font family/size/weight, alignment, line height, letter spacing, underline, and strikethrough.
- **Images** — uploaded via a hidden `<input type="file">`, read as a data URL client-side (`FileReader`), and added straight to the canvas — no server upload endpoint; the image data itself becomes part of the shape's stored JSON in the `LiveMap`.
- **Live cursors** — every other connected user's pointer position, rendered with their presence color and username; **cursor chat** (press `/`) turns the same cursor into a small floating text input broadcast through presence's `message` field in real time, character by character.
- **Reactions** — press `E`, pick an emoji, and either click once or **hold to "spray"** repeated reactions (a `useInterval` at 100ms keeps re-broadcasting while the mouse is held down); each one flies up and fades out over 4 seconds (`FlyingReaction.tsx`'s CSS animation) and is pruned from local state on the same timer.
- **Comments** — click the Comment tool, click anywhere on the canvas, and a Liveblocks `<Composer>` opens anchored to that exact canvas point; existing pins are draggable (with a small pixel threshold distinguishing a drag from a click-to-open), track panning/zooming, and can be resolved or (soft-)deleted.
- **Multiplayer selection & undo history** — every edit anyone makes is visible to everyone within the sync latency of Liveblocks' CRDT; `⌘Z`/`⌘Y` operate on that same shared history.
- **Copy / paste / cut** (`lib/key-events.ts`) — serializes the current selection into `localStorage` (not the OS clipboard — a deliberate simplification) and re-hydrates it via `enlivenObjects` on paste, assigning each pasted object a fresh `objectId` and `zIndex` so it doesn't collide with the original.
- **Layers panel** (`LeftSidebar.tsx`) — lists every shape top-down (matching canvas stacking order), auto-numbers duplicates of the same shape type ("Rectangle 1", "Rectangle 2", …, the same convention Figma uses), lets you click to select or toggle per-layer visibility.
- **Design/inspector panel** (`RightSidebar.tsx`) — position (X/Y), size (W/H), rotation angle, independent per-corner radius (with a toggle to switch to a single linked radius), opacity, 16 canvas blend modes, fill/stroke color and stroke style/weight, drop shadow, and the full typography set for text objects — every field bidirectionally synced with the selected Fabric object via `modifyShape()`/`readAttributes()`.
- **Keyboard shortcuts** — a single source of truth (`constants/index.ts`'s `shortcuts` array, shown in the toolbar's own "Keyboard shortcuts" popover) backing tool selection (`V`/`R`/`O`/`L`/`P`/`T`/`C`), zoom (`+`/`-`/`⇧0`), and the standard edit shortcuts, all disabled while focus is inside a text input so typing a filename doesn't accidentally delete a shape.
- **Export as PDF** (`lib/utils.ts`'s `exportToPdf`) — grabs the live `<canvas>` element's own pixels via `toDataURL("image/png")` and drops them into a single-page `jsPDF` document sized to match, downloaded under the design's current name.
- **Dashboard** — search-as-you-type client-side filtering over the already-fetched list (no server round trip per keystroke), create/rename/delete via Server Actions with `useTransition`-driven pending states, and an empty state that adapts its copy depending on whether there are literally no designs yet or the search just matched nothing.
- **Rename** — available both inline in the editor's title bar (double-click or single-click to edit, `Enter`/blur to commit) and from each dashboard card's overflow menu; both paths call the same `renameDesign` server action.
- **Share** — copies the current URL to the clipboard; since access is public-key-based with no auth, "sharing" is literally just handing someone the link.

---

## 11. State Management Patterns

There's no Redux/Zustand/Context-based global store here — state is split deliberately between a few different mechanisms, each chosen for what it's good at:

- **Liveblocks storage/presence** — anything that must be shared across browsers (shapes, cursors, comments, reactions). This *is* the app's real "global state," just hosted remotely and synced automatically rather than living in a client-side store.
- **React `useState`** — anything local to one browser tab that drives a re-render: which tool is active, the currently-selected object's editable attributes, whether a menu/popover is open.
- **`useRef`** — anything that needs to be read/written across renders *without* triggering one, which is most of the actual canvas plumbing: the Fabric canvas instance itself, the shape currently being drawn, whether a drag is in progress, whether text is being edited. Using refs here avoids re-running the (expensive, one-time) canvas-event-wiring `useEffect` on every keystroke or mouse move.
- **A `latest` ref pattern** (`Live.tsx`): canvas event listeners are attached exactly once (empty dependency array), but they need to call the *current* versions of callbacks like `setZoom`/`setSelection`/`handleActiveElement`, which change identity across renders. Rather than re-registering every listener whenever those change (expensive, and would risk duplicate handlers), a single ref (`latest.current = {...}`) is updated every render and the stable listeners read through it.
- **React's `cache()`** (`lib/designs.ts`'s `getDesign`) — deduplicates a Prisma call within a single server render pass, not across requests; used because the design route independently needs the design's name for both the page title metadata and the page body.

---

## 12. Styling System

Tailwind CSS utility classes throughout, with two custom layers on top defined in `tailwind.config.ts` and `app/globals.css`:

- **A `figma.*` color palette** — every color value in the UI (`#2c2c2c` toolbar, `#0d99ff` blue accent, `#f5f5f5` canvas background, etc.) is named as a Tailwind color token (`bg-figma-toolbar`, `text-figma-text-secondary`, …) rather than used as a raw hex value inline, so the whole app's palette lives in one place and every usage is self-documenting.
- **A custom `ui`/`ui-lg`/`ui-xl` font-size scale** — 11px/12px/13px, matching the exact sizes Figma's own interface uses for nearly every control, rather than Tailwind's default `text-sm`/`text-base` scale (which would look noticeably larger).
- **`fig-*` component classes** (`@layer components` in `globals.css`) — shared patterns used everywhere: `.fig-field`/`.fig-input` (the inspector panel's number/text inputs), `.fig-menu-item`/`.fig-menu-shortcut`/`.fig-menu-divider` (every dropdown menu row), `.fig-section-title` (panel section headers), `.fig-pop` (the shared 90ms scale/fade-in animation every popover uses), `.fig-scroll` (Figma's thin, hover-to-reveal scrollbar treatment).
- **Liveblocks' comment UI is re-themed, not replaced** — `@liveblocks/react-ui/styles.css` is imported first, then a handful of `--lb-*` CSS custom properties (`--lb-accent`, `--lb-radius`, `--lb-foreground`, …) and a couple of `.lb-root`/`.lb-composer-editor` overrides retune Liveblocks' own default look to match the rest of the app's density and palette, without forking its component code.
- **Custom fonts loaded via a plain `<link>` tag, not `next/font`** — explained directly in `app/layout.tsx`'s own comment: Fabric.js draws canvas text using a plain CSS font-family *string*, and `next/font` serves fonts under a hashed, generated family name — which would silently fall back to a serif font when Fabric tries to reference `"Inter"` by that literal name. Loading Inter the old-fashioned way keeps its real name usable both in regular DOM CSS and inside canvas text rendering. The Tailwind font stack still degrades gracefully to the system UI font if the Google Fonts request is blocked or slow.
- **Light/dark split by chrome, not by theme toggle** — the toolbar and dropdown menus are permanently dark (`bg-figma-toolbar` `#2c2c2c`, `bg-figma-menu` `#1e1e1e`), while the side panels and canvas are permanently light — matching Figma's own fixed (non-user-toggleable) UI chrome, as opposed to a light/dark mode the *user* can switch.

---

## 13. Environment Variables

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | `lib/prisma.ts` (the running app) | Neon's **pooled** Postgres connection string — what every ordinary app query (list/create/rename/delete a design) connects through. |
| `DIRECT_URL` | `prisma.config.ts` (the Prisma CLI) | Neon's **direct** (unpooled) connection string — required for schema migrations, since Neon's pooler rejects the DDL statements `prisma db push`/`migrate` issues. |
| `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` | `app/Room.tsx` (client-side) | Liveblocks' public API key, authenticating every browser to join any room. Prefixed `NEXT_PUBLIC_` deliberately — it's meant to be shipped to the client bundle; it is *not* a secret. |

All three must be set both locally (in a gitignored `.env`/`.env.local`) and in the Vercel project's environment-variable settings for Preview and Production. Note the split: `DATABASE_URL`/`DIRECT_URL` typically point at the **same** Neon database, just through its two different endpoints (pooled vs. direct) — see [§6](#6-data-model--prisma--postgres) for exactly why both are needed rather than one.

---

## 14. Local Development

```bash
npm install          # also runs `prisma generate` automatically via the postinstall script
npm run dev           # starts Next.js on http://localhost:3000
```

Requirements before `npm run dev` will actually work end-to-end:

1. A Postgres database (Neon or otherwise) with `DATABASE_URL` and `DIRECT_URL` set in `.env`.
2. Run `npx prisma db push` (or `migrate`) once, against `DIRECT_URL`, to create the `Design` table.
3. A Liveblocks project's public API key in `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` (in `.env.local`, since Next.js also loads that file, layered over `.env`).

Other scripts:

```bash
npm run build   # production build (also runs postinstall → prisma generate)
npm run start    # serve the production build
npm run lint      # next lint, using eslint-config-next + a few relaxed TS rules (see .eslintrc.json)
```

---

## 15. Deployment (Vercel)

`vercel.json` pins the build's detected framework:

```json
{ "framework": "nextjs" }
```

This exists specifically to stop Vercel's auto-detection from guessing wrong (a real issue this project hit) and instead force the Next.js build pipeline every time, regardless of what else Vercel's heuristics might infer from the repository's structure.

**Build sequence on Vercel:** clone the repo → `npm install` → `postinstall` fires `prisma generate` (regenerating the typed Prisma client against `prisma/schema.prisma`, using `DIRECT_URL` from the platform's own injected environment — see [§6](#6-data-model--prisma--postgres) for why `prisma.config.ts` only optionally loads a `.env` file, precisely so this step doesn't fail on a clean git checkout that has no such file) → `next build`.

All three environment variables from [§13](#13-environment-variables) must be configured in the Vercel project (Project Settings → Environment Variables) for both the **Production** and **Preview** environments — a Preview deployment (e.g., from a feature branch) will fail at runtime on any Prisma or Liveblocks call otherwise, even though the build itself may still succeed.

Because `app/dashboard` and `app/design/[id]` are both `dynamic = "force-dynamic"`, neither is statically generated at build time — every request re-runs the Server Component and hits Postgres fresh, which is required correctness here (the list of designs and thumbnails changes constantly) at the cost of it never being served from Vercel's static/edge cache.

---

## 16. Anticipated Interview Questions

**"Why is state shared across users if there's no backend WebSocket server you wrote?"**
Liveblocks *is* the realtime backend — a managed service the app connects to directly from the browser via `LiveblocksProvider`. Its `LiveMap` storage type is a CRDT (conflict-free replicated data type): every client can write to it independently, and Liveblocks' servers merge and rebroadcast the result, so two people editing at once never need explicit lock/merge logic in this codebase.

**"How do undo/redo work across multiple users?"**
They don't operate on a local undo stack — `useUndo`/`useRedo`/`useHistory` come from Liveblocks and operate on the shared storage's own history, so undoing reverts the last change *to the room*, tracked automatically by every `useMutation` call.

**"Why does the canvas re-render on every keystroke of someone else's cursor-chat message?"**
It doesn't — cursor position and chat message live in **Presence**, which is a separate Liveblocks channel from **Storage** (the shapes). `<LiveCursors>`/`<CursorChat>` subscribe to `useOthers()`/presence; the Fabric canvas only re-renders (`renderCanvas()`) when `useStorage`'s `canvasObjects` slice changes — presence updates never trigger that path.

**"Why store shape data in a Liveblocks CRDT instead of just writing every change to Postgres?"**
Latency and conflict handling: Postgres writes over a request/response cycle would be far too slow for smooth real-time collaboration (every drag would need a round trip), and concurrent writes to the same row would need manual locking. Postgres here only stores lightweight, infrequently-changing *metadata* (name, thumbnail) — never the live, high-frequency shape data.

**"Why does a rectangle's corner radius sometimes look wrong when a Fabric built-in isn't used?"**
Because a plain `fabric.Rect` only supports one uniform `rx`, this app patches its renderer (`lib/rounded-rect.ts`) to support four independent corners — this is a deliberate extension of a third-party library's rendering internals via prototype patching, done carefully (a scale-compensation step keeps corners circular under a resize handle) rather than forking the library.

**"Why two different Postgres connection strings for one database?"** — see [§6](#6-data-model--prisma--postgres): Neon's connection **pooler** (fast, ideal for the app's own frequent short queries) rejects the DDL statements schema migrations issue, so migrations use the **direct** endpoint instead, while the running app always uses the pooled one.

**"Why is `saveThumbnail` debounced by 3 seconds instead of firing on every edit?"**
Every keystroke of a drag would otherwise trigger a canvas export + Postgres write; the debounce (reset on every further storage change) means the expensive `toDataURL()` render and the database round trip only happen once activity has actually settled.

**"What happens if two people try to delete the same shape at the same time?"**
`deleteShapeFromStorage` calls `LiveMap.delete(objectId)`; deleting an already-absent key is a no-op, so the second delete simply does nothing — there's no error state to handle because CRDT map deletes are naturally idempotent.

**"Why is there a public Liveblocks API key baked into a client bundle — isn't that insecure?"**
It's meant to be public — Liveblocks' public-key model is designed for exactly this "anyone with the link can edit" use case with no login system; the trade-off (documented in the code) is that a few author-scoped features, like Liveblocks' native thread-deletion permission check, can't be relied on and had to be worked around (see the comment-thread soft-delete in `PinnedThread.tsx`).

**"Why keep `zIndex` as a manually-managed field instead of relying on array/insertion order?"**
The canvas objects live in a `Map` (`LiveMap`), not an array — a data structure with no inherent ordering guarantee once entries are deleted and re-added or arrive out of insertion order over the network. Storing an explicit `zIndex` on each object and sorting by it before every render is what keeps "bring to front"/"send to back" stable and correct regardless of storage's internal iteration order.

**"Server Component vs. Client Component — how is that boundary drawn here?"**
Anything that needs interactivity, hooks, or browser APIs is marked `"use client"` (`Editor`, `Live`, `Navbar`, `Dashboard`, `DesignCard`, `Room`, …); anything that only needs to fetch and render data stays a plain (server) component with no directive (`app/dashboard/page.tsx`, `app/design/[id]/page.tsx`). The dashboard route is the clearest example of the pattern: the **Server Component** (`page.tsx`) does the Prisma fetch and passes the result down as a prop into a **Client Component** (`Dashboard.tsx`) that owns the interactive search box and the create/rename/delete buttons.
