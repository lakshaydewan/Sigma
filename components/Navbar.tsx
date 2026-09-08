import React, { useRef, useState } from "react";
import Link from "next/link";
import { useOthers, useSelf } from "@liveblocks/react/suspense";

import { ActiveElement, NavbarProps } from "@/types/type";
import { navElements, shortcuts } from "@/constants";
import { exportToPdf, initialsOf } from "@/lib/utils";
import useDismiss from "@/hooks/useDismiss";
import ShapesMenu from "./ShapesMenu";
import Tooltip from "./Tooltip";
import {
  BackIcon,
  ChevronDownIcon,
  CloseIcon,
  ExportIcon,
  FigmaLogo,
  LinkIcon,
  MinusIcon,
  PlusIcon,
  RedoIcon,
  ResetIcon,
  ShapeIcon,
  TrashIcon,
  UndoIcon,
} from "./icons";

function Avatar({ name, color, you }: { name: string; color: string; you?: boolean }) {
  return (
    <Tooltip label={you ? `${name} (you)` : name}>
      <span
        className="flex h-6 w-6 select-none items-center justify-center rounded-full text-[9px]
          font-semibold uppercase leading-none text-white ring-2 ring-figma-toolbar"
        style={{ backgroundColor: color }}
      >
        {initialsOf(name)}
      </span>
    </Tooltip>
  );
}

export default function Navbar({
  fileName,
  onRename,
  activeElement,
  imageInputRef,
  handleImageUpload,
  handleActiveElement,
  undo,
  redo,
  zoom,
  setZoom,
}: NavbarProps) {
  const [openMenu, setOpenMenu] = useState<"main" | "zoom" | "share" | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const mainRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const shortcutsRef = useRef<HTMLDivElement>(null);

  const others = useOthers();
  const self = useSelf();

  useDismiss(mainRef, openMenu === "main", () => setOpenMenu(null));
  useDismiss(zoomRef, openMenu === "zoom", () => setOpenMenu(null));
  useDismiss(shareRef, openMenu === "share", () => setOpenMenu(null));
  useDismiss(shortcutsRef, showShortcuts, () => setShowShortcuts(false));

  const commitFileName = (next: string) => {
    setRenaming(false);

    const trimmed = next.trim() || "Untitled";
    if (trimmed !== fileName) onRename(trimmed);
  };

  const isActive = (value: string | Array<ActiveElement>) =>
    activeElement?.value === value ||
    (Array.isArray(value) && value.some((v) => v?.value === activeElement?.value));

  const runFromMenu = (action: () => void) => {
    setOpenMenu(null);
    action();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const visibleOthers = others.slice(0, 3);
  const overflowCount = others.length - visibleOthers.length;

  return (
    <nav className="relative z-50 flex h-10 shrink-0 select-none items-center bg-figma-toolbar text-figma-on-dark">
      {/* Main menu, behind the logo — Figma's own home for file-level actions. */}
      <div ref={mainRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={openMenu === "main"}
          aria-label="Main menu"
          onClick={() => setOpenMenu((m) => (m === "main" ? null : "main"))}
          className={`flex h-10 w-12 items-center justify-center gap-1 transition-colors
            ${openMenu === "main" ? "bg-figma-blue" : "hover:bg-figma-toolbar-hover"}`}
        >
          <FigmaLogo size={18} />
          <ChevronDownIcon size={10} className="text-figma-on-dark-secondary" />
        </button>

        {openMenu === "main" && (
          <div
            role="menu"
            className="fig-pop absolute left-1 top-11 w-60 rounded-figma bg-figma-menu p-1.5 shadow-figma-menu"
            style={{ ["--fig-pop-origin" as string]: "top left" }}
          >
            <Link href="/dashboard" className="fig-menu-item" onClick={() => setOpenMenu(null)}>
              <BackIcon size={14} className="text-figma-on-dark-secondary" />
              Back to files
            </Link>

            <div className="my-1 h-px bg-white/10" />

            <button className="fig-menu-item" onClick={() => runFromMenu(undo)}>
              <UndoIcon size={14} className="text-figma-on-dark-secondary" />
              Undo
              <span className="fig-menu-shortcut">⌘Z</span>
            </button>
            <button className="fig-menu-item" onClick={() => runFromMenu(redo)}>
              <RedoIcon size={14} className="text-figma-on-dark-secondary" />
              Redo
              <span className="fig-menu-shortcut">⌘Y</span>
            </button>

            <div className="fig-menu-divider" />

            <button
              className="fig-menu-item"
              onClick={() =>
                runFromMenu(() =>
                  handleActiveElement({ icon: "delete", name: "Delete", value: "delete" })
                )
              }
            >
              <TrashIcon size={14} className="text-figma-on-dark-secondary" />
              Delete selection
              <span className="fig-menu-shortcut">⌫</span>
            </button>
            <button
              className="fig-menu-item"
              onClick={() =>
                runFromMenu(() =>
                  handleActiveElement({ icon: "reset", name: "Reset", value: "reset" })
                )
              }
            >
              <ResetIcon size={14} className="text-figma-on-dark-secondary" />
              Clear canvas
            </button>

            <div className="fig-menu-divider" />

            <button className="fig-menu-item" onClick={() => runFromMenu(exportToPdf)}>
              <ExportIcon size={14} className="text-figma-on-dark-secondary" />
              Export as PDF
            </button>
            <button
              className="fig-menu-item"
              onClick={() => runFromMenu(() => setShowShortcuts(true))}
            >
              <span className="w-3.5" />
              Keyboard shortcuts
            </button>
          </div>
        )}
      </div>

      <span className="mx-1 h-5 w-px bg-white/10" />

      {/* Tools */}
      <ul className="flex items-center">
        {navElements.map((item) => (
          <li key={item.name}>
            {Array.isArray(item.value) ? (
              <ShapesMenu
                item={item as { name: string; icon: string; shortcut?: string; value: ActiveElement[] }}
                activeElement={activeElement}
                handleActiveElement={handleActiveElement}
                handleImageUpload={handleImageUpload}
                imageInputRef={imageInputRef}
              />
            ) : (
              <Tooltip label={item.name} shortcut={item.shortcut}>
                <button
                  type="button"
                  aria-pressed={isActive(item.value)}
                  onClick={() => handleActiveElement(item as ActiveElement)}
                  className={`flex h-10 w-10 items-center justify-center transition-colors
                    ${isActive(item.value) ? "bg-figma-blue text-white" : "text-white hover:bg-figma-toolbar-hover"}`}
                >
                  <ShapeIcon name={item.icon} size={20} />
                </button>
              </Tooltip>
            )}
          </li>
        ))}
      </ul>

      {/* File name, centred over the toolbar the way Figma centres it */}
      <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 items-center sm:flex">
        {renaming ? (
          <input
            autoFocus
            defaultValue={fileName}
            aria-label="File name"
            onBlur={(e) => commitFileName(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") commitFileName(e.currentTarget.value);
              if (e.key === "Escape") setRenaming(false);
            }}
            style={{ width: `${Math.max(fileName.length + 2, 10)}ch` }}
            className="pointer-events-auto rounded-figma-sm bg-figma-toolbar-hover px-2 py-0.5 text-center
              text-ui-lg font-medium text-white outline-none ring-1 ring-figma-blue"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => setRenaming(true)}
            onClick={() => setRenaming(true)}
            title="Rename"
            className="pointer-events-auto max-w-[26ch] truncate rounded-figma-sm px-2 py-0.5 text-ui-lg
              font-medium text-white transition-colors hover:bg-figma-toolbar-hover"
          >
            {fileName}
          </button>
        )}
      </div>

      {/* Collaborators, share, zoom */}
      <div className="ml-auto flex items-center gap-2 pr-2">
        <div className="hidden items-center pr-1 sm:flex">
          <div className="flex -space-x-1.5">
            {visibleOthers.map(({ connectionId, presence }) => (
              <Avatar
                key={connectionId}
                name={presence.username ?? "Guest"}
                color={presence.cursorColor}
              />
            ))}
            {self && (
              <Avatar name={self.presence.username ?? "You"} color={self.presence.cursorColor} you />
            )}
          </div>
          {overflowCount > 0 && (
            <span className="ml-1.5 text-ui text-figma-on-dark-secondary">+{overflowCount}</span>
          )}
        </div>

        <div ref={shareRef} className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu((m) => (m === "share" ? null : "share"))}
            className="flex h-7 items-center rounded-figma bg-figma-blue px-3 text-ui font-medium
              text-white transition-colors hover:bg-figma-blue-hover"
          >
            Share
          </button>

          {openMenu === "share" && (
            <div
              className="fig-pop absolute right-0 top-9 w-72 rounded-figma bg-figma-panel p-3 shadow-figma-menu"
              style={{ ["--fig-pop-origin" as string]: "top right" }}
            >
              <p className="fig-section-title">Anyone with the link can edit</p>
              <p className="mt-1 text-ui text-figma-text-secondary">
                Everyone in this room draws on the same canvas and sees each other&apos;s cursors.
              </p>
              <button
                type="button"
                onClick={copyLink}
                className="mt-3 flex h-7 w-full items-center justify-center gap-1.5 rounded-figma
                  bg-figma-blue text-ui font-medium text-white transition-colors hover:bg-figma-blue-hover"
              >
                <LinkIcon size={13} />
                {copied ? "Link copied" : "Copy link"}
              </button>
            </div>
          )}
        </div>

        <Tooltip label="Export as PDF">
          <button
            type="button"
            onClick={exportToPdf}
            aria-label="Export as PDF"
            className="hidden h-7 w-7 items-center justify-center rounded-figma text-white
              transition-colors hover:bg-figma-toolbar-hover sm:flex"
          >
            <ExportIcon size={15} />
          </button>
        </Tooltip>

        <div ref={zoomRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={openMenu === "zoom"}
            onClick={() => setOpenMenu((m) => (m === "zoom" ? null : "zoom"))}
            className={`flex h-7 items-center gap-1 rounded-figma px-2 text-ui tabular-nums text-white
              transition-colors ${openMenu === "zoom" ? "bg-figma-toolbar-hover" : "hover:bg-figma-toolbar-hover"}`}
          >
            {Math.round(zoom * 100)}%
            <ChevronDownIcon size={10} className="text-figma-on-dark-secondary" />
          </button>

          {openMenu === "zoom" && (
            <div
              role="menu"
              className="fig-pop absolute right-0 top-9 w-52 rounded-figma bg-figma-menu p-1.5 shadow-figma-menu"
              style={{ ["--fig-pop-origin" as string]: "top right" }}
            >
              <button className="fig-menu-item" onClick={() => runFromMenu(() => setZoom("in"))}>
                <PlusIcon size={14} className="text-figma-on-dark-secondary" />
                Zoom in
                <span className="fig-menu-shortcut">+</span>
              </button>
              <button className="fig-menu-item" onClick={() => runFromMenu(() => setZoom("out"))}>
                <MinusIcon size={14} className="text-figma-on-dark-secondary" />
                Zoom out
                <span className="fig-menu-shortcut">−</span>
              </button>
              <div className="fig-menu-divider" />
              <button className="fig-menu-item" onClick={() => runFromMenu(() => setZoom(1))}>
                <span className="w-3.5" />
                Zoom to 100%
                <span className="fig-menu-shortcut">⇧0</span>
              </button>
              <button className="fig-menu-item" onClick={() => runFromMenu(() => setZoom(2))}>
                <span className="w-3.5" />
                Zoom to 200%
              </button>
            </div>
          )}
        </div>
      </div>

      {showShortcuts && (
        <div
          ref={shortcutsRef}
          className="fig-pop fixed bottom-4 right-4 z-[80] w-72 rounded-figma bg-figma-menu p-3 shadow-figma-menu"
          style={{ ["--fig-pop-origin" as string]: "bottom right" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-ui-lg font-semibold text-white">Keyboard shortcuts</h2>
            <button
              type="button"
              aria-label="Close shortcuts"
              onClick={() => setShowShortcuts(false)}
              className="flex h-5 w-5 items-center justify-center rounded-figma-sm text-figma-on-dark-secondary
                transition-colors hover:bg-figma-menu-hover hover:text-white"
            >
              <CloseIcon size={12} />
            </button>
          </div>
          <dl className="grid grid-cols-1 gap-y-0.5">
            {shortcuts.map((s) => (
              <div key={s.key} className="flex items-center justify-between py-0.5">
                <dt className="text-ui text-white/90">{s.name}</dt>
                <dd className="text-ui text-figma-on-dark-secondary">{s.shortcut}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <input
        type="file"
        className="hidden"
        ref={imageInputRef}
        accept="image/*"
        onChange={handleImageUpload}
      />
    </nav>
  );
}
