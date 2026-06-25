import fs from "node:fs/promises";
import path from "node:path";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const root = process.cwd();
const buildDir = path.join(root, "apps", "desktop", "build");
const sourceDir = path.join(buildDir, "source");
const generatedDir = path.join(buildDir, "generated");
const appSource = path.join(sourceDir, "app-icon.png");
const traySource = path.join(sourceDir, "tray-icon.png");
const iconSizes = [16, 24, 32, 48, 64, 128, 256];

await fs.mkdir(generatedDir, { recursive: true });

const appIcon = await prepareSquare(appSource, 0.06);
const pngPaths = [];

for (const size of iconSizes) {
  const output = path.join(generatedDir, `app-${size}.png`);
  await appIcon.clone().resize(size, size, { fit: "contain" }).png().toFile(output);
  pngPaths.push(output);
}

await fs.writeFile(path.join(buildDir, "icon.ico"), await pngToIco(pngPaths));
await appIcon.clone().resize(512, 512, { fit: "contain" }).png().toFile(path.join(buildDir, "icon.png"));

const trayIcon = await prepareSquare(traySource, 0.08);
await trayIcon.clone().resize(32, 32, { fit: "contain" }).png().toFile(path.join(buildDir, "tray.png"));
await trayIcon.clone().resize(64, 64, { fit: "contain" }).png().toFile(path.join(buildDir, "tray@2x.png"));

async function prepareSquare(source, paddingRatio) {
  const sourceImage = sharp(source).ensureAlpha();
  const { data, info } = await sourceImage.raw().toBuffer({ resolveWithObject: true });

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] <= 16) {
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
      data[index + 3] = 0;
    }
  }

  const cleanedBuffer = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .png()
    .toBuffer();
  const trimmedBuffer = await sharp(cleanedBuffer)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 12 })
    .png()
    .toBuffer();
  const metadata = await sharp(trimmedBuffer).metadata();
  const width = metadata.width ?? 1;
  const height = metadata.height ?? 1;
  const contentEdge = Math.max(width, height);
  const padding = Math.max(1, Math.round(contentEdge * paddingRatio));
  const canvasEdge = contentEdge + padding * 2;
  const horizontalSpace = canvasEdge - width;
  const verticalSpace = canvasEdge - height;

  const paddedBuffer = await sharp(trimmedBuffer)
    .extend({
      top: Math.floor(verticalSpace / 2),
      bottom: Math.ceil(verticalSpace / 2),
      left: Math.floor(horizontalSpace / 2),
      right: Math.ceil(horizontalSpace / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  return sharp(paddedBuffer);
}
