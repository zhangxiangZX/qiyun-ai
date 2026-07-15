/**
 * Client-side watermark for raster / SVG images. Works entirely in the browser
 * (preview mode and upstream mode for images), so no backend round-trip is
 * needed for the most common case. PDF / office docs are delegated to the
 * backend watermark service in upstream mode.
 */

export interface WatermarkOptions {
  text: string;
  owner?: string;
}

export async function watermarkImageBlob(
  blob: Blob,
  options: WatermarkOptions,
): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width || 800;
    canvas.height = img.naturalHeight || img.height || 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    drawTiledWatermark(ctx, canvas.width, canvas.height, options);
    return await canvasToBlob(canvas, "image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = src;
  });
}

function drawTiledWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: WatermarkOptions,
): void {
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(15, 23, 42, 0.35)";
  ctx.lineWidth = 2;
  const fontSize = Math.max(16, Math.round(Math.min(width, height) / 26));
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.textBaseline = "middle";
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-24 * Math.PI) / 180);

  const stepX = Math.max(width / 2.4, 220);
  const stepY = Math.max(height / 5, 120);
  const lines = options.owner ? [options.text, options.owner] : [options.text];
  const lineHeight = fontSize * 1.35;

  for (let y = -height; y < height; y += stepY) {
    for (let x = -width; x < width; x += stepX) {
      ctx.fillText(lines[0], x, y);
      if (lines[1]) ctx.fillText(lines[1], x, y + lineHeight);
    }
  }
  ctx.restore();
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("水印合成失败"))),
      type,
    );
  });
}
