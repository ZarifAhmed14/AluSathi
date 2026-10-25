export type FieldAction = {
  id: string; date: string; text: string; district: string; kind: "task" | "observation";
  category?: "photo" | "fertilizer" | "spray" | "field";
  status?: string; details?: string; variety?: string; cropAge?: string;
  cause?: string; advice?: "healthy" | "observe" | "late-blight" | "fusarium-wilt" | "leaf-roll-vector"; title?: string; body?: string; image?: string;
  nextDueDate?: string;
};

export const FIELD_ACTIONS_KEY = "alusathi-field-actions-v1";
export const FIELD_ACTIONS_EVENT = "alusathi-field-actions-changed";

export function readFieldActions(): FieldAction[] {
  try {
    const value = JSON.parse(localStorage.getItem(FIELD_ACTIONS_KEY) || "[]");
    return Array.isArray(value)
      ? value.filter((item): item is FieldAction => item && typeof item.id === "string" && typeof item.date === "string" && typeof item.text === "string" && typeof item.district === "string" && (item.kind === "task" || item.kind === "observation") && (!item.category || ["photo", "fertilizer", "spray", "field"].includes(item.category))).slice(0, 100)
      : [];
  } catch { return []; }
}

export function saveFieldActions(actions: FieldAction[]): void {
  localStorage.setItem(FIELD_ACTIONS_KEY, JSON.stringify(actions));
  window.dispatchEvent(new Event(FIELD_ACTIONS_EVENT));
}
