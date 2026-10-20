export type FieldAction = { id: string; date: string; text: string; district: string; kind: "task" | "observation" };

export const FIELD_ACTIONS_KEY = "alusathi-field-actions-v1";

export function readFieldActions(): FieldAction[] {
  try {
    const value = JSON.parse(localStorage.getItem(FIELD_ACTIONS_KEY) || "[]");
    return Array.isArray(value)
      ? value.filter((item): item is FieldAction => item && typeof item.id === "string" && typeof item.date === "string" && typeof item.text === "string" && typeof item.district === "string" && (item.kind === "task" || item.kind === "observation")).slice(0, 100)
      : [];
  } catch { return []; }
}

export function saveFieldActions(actions: FieldAction[]): void {
  localStorage.setItem(FIELD_ACTIONS_KEY, JSON.stringify(actions));
}
