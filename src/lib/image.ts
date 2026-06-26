"use client";

// 캡처 이미지를 캔버스로 리사이즈·압축해 data URL(JPEG)로 변환.
// localStorage/RTDB에 그대로 저장할 수 있을 만큼 작게 만든다(보통 30~120KB).
export async function compressImage(
  file: Blob,
  maxDim = 900,
  quality = 0.6
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas context를 만들 수 없어요.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", quality);
}
