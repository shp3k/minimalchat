const MAX_CLIPBOARD_IMAGE_SIZE = 25 * 1024 * 1024;

async function copyImageUrlToClipboard(url, dependencies) {
  if (typeof url !== "string" || !dependencies.isSafeExternalUrl(url)) {
    return { ok: false, code: "INVALID_IMAGE_URL" };
  }

  try {
    const response = await dependencies.fetch(url);

    if (!response.ok) {
      return { ok: false, code: "IMAGE_DOWNLOAD_FAILED" };
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

    if (!contentType.startsWith("image/")) {
      return { ok: false, code: "NOT_AN_IMAGE" };
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (!buffer.length || buffer.length > MAX_CLIPBOARD_IMAGE_SIZE) {
      return { ok: false, code: "INVALID_IMAGE_SIZE" };
    }

    const image = dependencies.createImage(buffer);

    if (image.isEmpty()) {
      return { ok: false, code: "IMAGE_DECODE_FAILED" };
    }

    dependencies.writeImage(image);
    return { ok: true };
  } catch {
    return { ok: false, code: "IMAGE_DOWNLOAD_FAILED" };
  }
}

module.exports = { copyImageUrlToClipboard };
