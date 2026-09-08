"use client";

import React, { useRef, useState, useTransition } from "react";
import Link from "next/link";

import { deleteDesign, renameDesign } from "@/app/actions/designs";
import type { DesignSummary } from "@/lib/designs";
import { relativeTime } from "@/lib/utils";
import useDismiss from "@/hooks/useDismiss";
import { FileIcon, MoreIcon, TrashIcon } from "@/components/icons";

function DeleteDialog({
  name,
  pending,
  onCancel,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Delete ${name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <div
        className="fig-pop w-[320px] rounded-[6px] bg-figma-panel p-4 shadow-figma-menu"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-ui-xl font-semibold text-figma-text">Delete design?</h2>
        <p className="mt-1.5 text-ui-lg leading-5 text-figma-text-secondary">
          <span className="font-medium text-figma-text">{name}</span> will be removed for
          everyone. This can&apos;t be undone.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-7 rounded-figma px-3 text-ui-lg font-medium text-figma-text
              transition-colors hover:bg-figma-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            disabled={pending}
            onClick={onConfirm}
            className="h-7 rounded-figma bg-figma-danger px-3 text-ui-lg font-medium text-white
              transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DesignCard({ design }: { design: DesignSummary }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(design.name);
  const [pending, startTransition] = useTransition();

  const menuRef = useRef<HTMLDivElement>(null);
  useDismiss(menuRef, menuOpen, () => setMenuOpen(false));

  const commitRename = (next: string) => {
    setRenaming(false);

    const trimmed = next.trim() || "Untitled";
    if (trimmed === name) return;

    setName(trimmed);
    startTransition(() => void renameDesign(design.id, trimmed));
  };

  return (
    <li className="group/card relative">
      <Link
        href={`/design/${design.id}`}
        aria-label={`Open ${name}`}
        className="block aspect-[4/3] overflow-hidden rounded-figma border border-figma-border
          bg-figma-panel outline-none transition-shadow group-hover/card:border-figma-blue
          focus-visible:border-figma-blue focus-visible:ring-2 focus-visible:ring-figma-blue/40"
      >
        {design.thumbnail ? (
          // A data URL straight from the canvas — nothing for next/image to optimise.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={design.thumbnail}
            alt=""
            className="h-full w-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-figma-canvas">
            <FileIcon size={22} className="text-figma-text-tertiary" />
          </div>
        )}
      </Link>

      <div className="mt-2 flex items-start gap-1">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              autoFocus
              defaultValue={name}
              aria-label="Design name"
              onBlur={(e) => commitRename(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename(e.currentTarget.value);
                if (e.key === "Escape") setRenaming(false);
              }}
              className="w-full rounded-figma-sm bg-figma-panel px-1.5 py-0.5 text-ui-lg font-medium
                text-figma-text outline-none ring-1 ring-figma-blue"
            />
          ) : (
            <p
              className="truncate px-1.5 py-0.5 text-ui-lg font-medium text-figma-text"
              title={name}
            >
              {name}
            </p>
          )}

          {/* Server and client can disagree by a second on how long ago this was. */}
          <p className="px-1.5 text-ui text-figma-text-secondary" suppressHydrationWarning>
            {pending ? "Saving…" : `Edited ${relativeTime(design.updatedAt)}`}
          </p>
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`More options for ${name}`}
            onClick={() => setMenuOpen((open) => !open)}
            className={`flex h-6 w-6 items-center justify-center rounded-figma-sm text-figma-text-secondary
              transition-colors hover:bg-figma-hover hover:text-figma-text
              ${menuOpen ? "bg-figma-hover text-figma-text" : "opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100"}`}
          >
            <MoreIcon size={14} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="fig-pop absolute right-0 top-7 z-20 w-40 rounded-figma bg-figma-menu p-1.5
                shadow-figma-menu"
              style={{ ["--fig-pop-origin" as string]: "top right" }}
            >
              <button
                className="fig-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  setRenaming(true);
                }}
              >
                Rename
              </button>
              <button
                className="fig-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirming(true);
                }}
              >
                <TrashIcon size={13} className="text-figma-on-dark-secondary" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {confirming && (
        <DeleteDialog
          name={name}
          pending={pending}
          onCancel={() => setConfirming(false)}
          onConfirm={() =>
            startTransition(() => {
              setConfirming(false);
              void deleteDesign(design.id);
            })
          }
        />
      )}
    </li>
  );
}
