import type { MouseEvent as ReactMouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/** Start OS window drag unless the event hit an interactive control. */
export function startWindowDrag(e: ReactMouseEvent | MouseEvent) {
  if (e.button !== 0) return;
  const target = e.target as HTMLElement | null;
  if (
    target?.closest(
      "button,a,input,select,textarea,label,[role='button'],[data-no-drag],[contenteditable='true']",
    )
  ) {
    return;
  }
  void getCurrentWindow().startDragging();
}
