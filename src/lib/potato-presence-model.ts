import * as ort from "onnxruntime-web/wasm";
import { potatoImageTensor } from "@/lib/potato-image";

let sessionPromise: Promise<ort.InferenceSession> | null = null;

function getSession() {
  if (!sessionPromise) {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = "/";
    sessionPromise = ort.InferenceSession.create("/models/potato_presence.onnx", { executionProviders: ["wasm"] })
      .catch(error => { sessionPromise = null; throw error; });
  }
  return sessionPromise;
}

export async function potatoPresenceScore(file: File) {
  const [session, tensor] = await Promise.all([getSession(), potatoImageTensor(file)]);
  const output = await session.run({ [session.inputNames[0]]: tensor });
  const logits = Array.from(output[session.outputNames[0]].data, Number);
  if (logits.length !== 2 || logits.some(value => !Number.isFinite(value))) {
    throw new Error("Invalid potato presence model output");
  }
  return 1 / (1 + Math.exp(logits[0] - logits[1]));
}
