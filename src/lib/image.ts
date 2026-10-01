/**
 * Фото задания: уменьшаем до 1600 px по длинной стороне и сохраняем в JPEG —
 * так снимок с телефона (4–10 МБ) превращается в ~300 КБ и быстро уходит на сервер.
 * Отдельно делаем маленькое превью для истории чата.
 */
async function load(file: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    // запасной путь для форматов, которые createImageBitmap не понимает
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return img;
    } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
}

function draw(src: CanvasImageSource & { width: number; height: number }, max: number, quality: number) {
  const k = Math.min(1, max / Math.max(src.width, src.height));
  const w = Math.round(src.width * k), h = Math.round(src.height * k);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
  g.drawImage(src, 0, 0, w, h);
  return c.toDataURL("image/jpeg", quality);
}

export async function prepareImage(file: Blob) {
  const src = await load(file);
  return { image: draw(src, 1600, 0.85), thumb: draw(src, 360, 0.7) };
}
