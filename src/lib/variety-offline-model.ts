import * as ort from "onnxruntime-web/wasm";
import { potatoImageTensor } from "@/lib/potato-image";

const CLASSES = ["diamant", "asterix"] as const;
const MODEL_URL = "/models/potato_variety_pair.onnx";
let sessionPromise: Promise<ort.InferenceSession | null> | null = null;

async function getSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const response = await fetch("/models/potato_variety_pair.json");
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return null;
      const metadata = await response.json();
      if (metadata.model !== "potato_variety_pair.onnx" ||
          JSON.stringify(metadata.classes) !== JSON.stringify(CLASSES)) {
        throw new Error("Invalid variety model manifest");
      }
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmPaths = "/";
      return ort.InferenceSession.create(MODEL_URL, { executionProviders: ["wasm"] });
    })().catch(error => {
      sessionPromise = null;
      throw error;
    });
  }
  return sessionPromise;
}

export async function scanPotatoVarietyOffline(file: File): Promise<{ label: typeof CLASSES[number]; score: number } | null> {
  const session = await getSession();
  if (!session) return null;
  const output = await session.run({ [session.inputNames[0]]: await potatoImageTensor(file) });
  const logits = Array.from(output[session.outputNames[0]].data, Number);
  if (logits.length !== CLASSES.length || logits.some(value => !Number.isFinite(value))) {
    throw new Error("Invalid variety model output");
  }
  const best = logits.indexOf(Math.max(...logits));
  const relative = logits.map(value => Math.exp(value - logits[best]));
  return { label: CLASSES[best], score: 1 / relative.reduce((sum, value) => sum + value, 0) };
}
