import * as ort from "onnxruntime-web/wasm";

export async function potatoImageTensor(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    if (Math.min(bitmap.width, bitmap.height) < 128 || Math.max(bitmap.width, bitmap.height) > 8000) {
      throw new Error("Image dimensions are out of range");
    }
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 224;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Image processing is unavailable");
    context.drawImage(bitmap, 0, 0, 224, 224);
    const rgba = context.getImageData(0, 0, 224, 224).data;
    const pixels = new Float32Array(3 * 224 * 224);
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];
    for (let i = 0; i < 224 * 224; i += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        pixels[channel * 224 * 224 + i] = (rgba[i * 4 + channel] / 255 - mean[channel]) / std[channel];
      }
    }
    return new ort.Tensor("float32", pixels, [1, 3, 224, 224]);
  } finally {
    bitmap.close();
  }
}
