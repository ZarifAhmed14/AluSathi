export type DiseaseLabel = "early_blight" | "healthy" | "late_blight" | "unknown";

export interface DiseaseResult {
  label: DiseaseLabel;
  labels: { en: string; bn: string };
  confidence: number;
  quality_warning: boolean;
  quality: { brightness: number; contrast: number; issues: string[] };
  rejection_reasons: string[];
  field_validated: boolean;
  needs_expert_review: boolean;
  probabilities: Record<string, number>;
  next_steps: { en: string[]; bn: string[] };
  model_scope: string;
  treatment_status: string;
  inference_mode?: "online" | "offline";
}

export interface ModelHealth {
  status: "ready" | "model_missing";
  device?: string;
  model?: string;
  model_version?: string;
  classes?: string[];
  controlled_test_accuracy?: number;
  regional_test_accuracy?: number;
  regional_test_images?: number;
  field_validated?: boolean;
  demo_only: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function scanPotatoLeaf(file: File): Promise<DiseaseResult> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${API_BASE_URL}/disease/predict`, { method: "POST", body, signal: AbortSignal.timeout(20000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || "We could not check this photo. Please try again.");
  return { ...payload, inference_mode: "online" };
}

export async function getModelHealth(): Promise<ModelHealth | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
