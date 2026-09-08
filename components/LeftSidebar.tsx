import React, { useMemo } from "react";
import { fabric } from "fabric";

import { getShapeInfo } from "@/lib/utils";
import { CustomFabricObject } from "@/types/type";
import Tooltip from "./Tooltip";
import { EyeIcon, EyeOffIcon, ShapeIcon } from "./icons";

type Props = {
  allShapes: [string, any][];
  fabricRef: React.RefObject<fabric.Canvas | null>;
  selectedObjectId: string | null;
  syncShapeInStorage: (shape: fabric.Object) => void;
};

export default function LeftSidebar({
  allShapes,
  fabricRef,
  selectedObjectId,
  syncShapeInStorage,
}: Props) {
  /**
   * Figma lists the top-most layer first and numbers repeats of the same kind,
   * so the panel order matches the stacking order on the canvas.
   */
  const layers = useMemo(() => {
    const counts: Record<string, number> = {};

    return allShapes
      .slice()
      // Match the canvas: draw order comes from the stored zIndex, and the panel
      // lists the top-most layer first.
      .sort((a, b) => (a[1]?.zIndex ?? 0) - (b[1]?.zIndex ?? 0))
      .map(([objectId, shape]) => {
        const { icon, name } = getShapeInfo(shape?.type);
        counts[name] = (counts[name] ?? 0) + 1;

        return {
          objectId,
          icon,
          label: `${name} ${counts[name]}`,
          visible: shape?.visible !== false,
        };
      })
      .reverse();
  }, [allShapes]);

  const findObject = (objectId: string) =>
    fabricRef.current
      ?.getObjects()
      .find((obj) => (obj as CustomFabricObject<fabric.Object>).objectId === objectId);

  const handleSelect = (objectId: string) => {
    const canvas = fabricRef.current;
    const object = findObject(objectId);
    if (!canvas || !object) return;

    canvas.setActiveObject(object);
    canvas.requestRenderAll();
  };

  const toggleVisibility = (objectId: string) => {
    const canvas = fabricRef.current;
    const object = findObject(objectId);
    if (!canvas || !object) return;

    object.set({ visible: !object.visible });
    if (!object.visible && canvas.getActiveObject() === object) canvas.discardActiveObject();

    canvas.requestRenderAll();
    syncShapeInStorage(object);
  };

  return (
    <aside
      className="fig-scroll relative z-10 hidden h-full w-60 shrink-0 flex-col overflow-y-auto border-r md:flex
        border-figma-border bg-figma-panel"
      aria-label="Layers"
    >
      <div className="border-b border-figma-border px-2 py-2">
        <h2 className="px-2 pb-1 fig-section-title">Pages</h2>
        <div
          className="flex h-7 items-center gap-2 rounded-figma-sm bg-figma-blue-wash px-2 text-ui
            text-figma-text"
          aria-current="page"
        >
          Page 1
        </div>
      </div>

      <div className="px-2 py-2">
        <h2 className="px-2 pb-1 fig-section-title">Layers</h2>

        {layers.length === 0 ? (
          <p className="px-2 py-2 text-ui leading-4 text-figma-text-secondary">
            Nothing here yet. Pick a shape from the toolbar, then drag on the canvas.
          </p>
        ) : (
          <ul className="flex flex-col">
            {layers.map((layer) => {
              const isSelected = layer.objectId === selectedObjectId;

              return (
                <li key={layer.objectId} className="group/layer relative">
                  <button
                    type="button"
                    onClick={() => handleSelect(layer.objectId)}
                    aria-current={isSelected}
                    className={`flex h-7 w-full items-center gap-2 rounded-figma-sm pl-2 pr-8 text-left
                      transition-colors ${
                        isSelected
                          ? "bg-figma-blue-wash text-figma-blue"
                          : "text-figma-text hover:bg-figma-hover"
                      } ${layer.visible ? "" : "opacity-40"}`}
                  >
                    <ShapeIcon name={layer.icon} size={14} className="shrink-0" />
                    <span className="truncate text-ui">{layer.label}</span>
                  </button>

                  <Tooltip label={layer.visible ? "Hide" : "Show"} side="left">
                    <button
                      type="button"
                      onClick={() => toggleVisibility(layer.objectId)}
                      aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.label}`}
                      className={`absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center
                        justify-center rounded-figma-sm text-figma-text-secondary transition-opacity
                        hover:bg-figma-hover hover:text-figma-text
                        focus-visible:opacity-100 group-hover/layer:opacity-100
                        ${layer.visible ? "opacity-0" : "opacity-100"}`}
                    >
                      {layer.visible ? <EyeIcon size={13} /> : <EyeOffIcon size={13} />}
                    </button>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
