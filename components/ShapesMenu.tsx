import React, { useMemo, useRef, useState } from "react";

import { ActiveElement, ShapesMenuProps } from "@/types/type";
import useDismiss from "@/hooks/useDismiss";
import Tooltip from "./Tooltip";
import { CheckIcon, ChevronDownIcon, ShapeIcon } from "./icons";

export default function ShapesMenu({
  item,
  activeElement,
  handleActiveElement,
  imageInputRef,
}: ShapesMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useDismiss(containerRef, isOpen, () => setIsOpen(false));

  const isShapeActive = item.value.some(
    (shape: ActiveElement) => shape?.value === activeElement?.value
  );

  // Remember the last shape picked so clicking the icon repeats it, as Figma does.
  const activeShape: ActiveElement = useMemo(
    () =>
      item.value.find((shape: ActiveElement) => shape?.value === activeElement?.value) ??
      item.value[0] ??
      null,
    [activeElement, item.value]
  );

  const handleShapeClick = (shape: ActiveElement) => {
    if (!shape) return;

    if (shape.value === "image") {
      imageInputRef.current?.click();
    }

    handleActiveElement(shape);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex items-stretch">
      <Tooltip label={activeShape?.name ?? item.name} shortcut={activeShape?.shortcut}>
        <button
          type="button"
          aria-pressed={isShapeActive}
          onClick={() => handleActiveElement(activeShape)}
          className={`flex h-10 w-10 items-center justify-center transition-colors
            ${isShapeActive ? "bg-figma-blue text-white" : "text-white hover:bg-figma-toolbar-hover"}`}
        >
          <ShapeIcon name={activeShape?.icon ?? item.icon} size={20} />
        </button>
      </Tooltip>

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Choose a shape"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex h-10 w-4 items-center justify-center transition-colors
          ${isShapeActive || isOpen ? "bg-figma-blue text-white" : "text-white hover:bg-figma-toolbar-hover"}`}
      >
        <ChevronDownIcon
          size={9}
          className={`transition-opacity ${
            isOpen || isShapeActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="fig-pop absolute left-0 top-11 z-50 w-52 rounded-figma bg-figma-menu p-1.5 shadow-figma-menu"
          style={{ ["--fig-pop-origin" as string]: "top left" }}
        >
          {item.value.map((shape: ActiveElement) =>
            shape ? (
              <button
                key={shape.value}
                type="button"
                role="menuitemradio"
                aria-checked={activeElement?.value === shape.value}
                onClick={() => handleShapeClick(shape)}
                className="fig-menu-item"
              >
                <span className="flex w-3.5 justify-center">
                  {activeElement?.value === shape.value && <CheckIcon size={12} />}
                </span>
                <ShapeIcon name={shape.icon} size={14} className="text-figma-on-dark-secondary" />
                {shape.name}
                {shape.shortcut && <span className="fig-menu-shortcut">{shape.shortcut}</span>}
              </button>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
