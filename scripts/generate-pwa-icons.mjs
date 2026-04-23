import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const outputs = [
  ["medilink-icon.png", 1024],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
];

const targets = [
  {
    directory: "public/icons",
    variant: "patient",
  },
  {
    directory: "provider-ui/public/icons",
    variant: "provider",
  },
];

function clamp(value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function mixColor(a, b, t) {
  return [
    mix(a[0], b[0], t),
    mix(a[1], b[1], t),
    mix(a[2], b[2], t),
  ];
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function blend(buffer, size, x, y, color, alpha = 1) {
  if (x < 0 || y < 0 || x >= size || y >= size || alpha <= 0) return;
  const index = (Math.floor(y) * size + Math.floor(x)) * 4;
  const existingAlpha = buffer[index + 3] / 255;
  const nextAlpha = alpha + existingAlpha * (1 - alpha);
  if (nextAlpha <= 0) return;

  buffer[index] = clamp((color[0] * alpha + buffer[index] * existingAlpha * (1 - alpha)) / nextAlpha);
  buffer[index + 1] = clamp((color[1] * alpha + buffer[index + 1] * existingAlpha * (1 - alpha)) / nextAlpha);
  buffer[index + 2] = clamp((color[2] * alpha + buffer[index + 2] * existingAlpha * (1 - alpha)) / nextAlpha);
  buffer[index + 3] = clamp(nextAlpha * 255);
}

function drawCircle(buffer, size, cx, cy, radius, color, alpha = 1, softness = 1.25) {
  const minX = Math.max(0, Math.floor(cx - radius - softness * 2));
  const maxX = Math.min(size - 1, Math.ceil(cx + radius + softness * 2));
  const minY = Math.max(0, Math.floor(cy - radius - softness * 2));
  const maxY = Math.min(size - 1, Math.ceil(cy + radius + softness * 2));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const coverage = 1 - smoothstep(radius - softness, radius + softness, distance);
      blend(buffer, size, x, y, color, alpha * coverage);
    }
  }
}

function drawRoundedRect(buffer, size, x, y, width, height, radius, color, alpha = 1, softness = 1.15) {
  const minX = Math.max(0, Math.floor(x - softness * 2));
  const maxX = Math.min(size - 1, Math.ceil(x + width + softness * 2));
  const minY = Math.max(0, Math.floor(y - softness * 2));
  const maxY = Math.min(size - 1, Math.ceil(y + height + softness * 2));
  const right = x + width;
  const bottom = y + height;

  for (let py = minY; py <= maxY; py += 1) {
    for (let px = minX; px <= maxX; px += 1) {
      const qx = Math.max(x + radius - (px + 0.5), 0, px + 0.5 - (right - radius));
      const qy = Math.max(y + radius - (py + 0.5), 0, py + 0.5 - (bottom - radius));
      const distance = Math.hypot(qx, qy);
      const coverage = 1 - smoothstep(radius - softness, radius + softness, distance);
      blend(buffer, size, px, py, color, alpha * coverage);
    }
  }
}

function drawLinkMark(buffer, size, cx, cy, scale, cutoutColor = "#12a889") {
  const white = hexToRgb("#ffffff");
  const stroke = scale * 0.032;
  drawRoundedRect(buffer, size, cx - scale * 0.16, cy - scale * 0.055, scale * 0.20, scale * 0.11, stroke, white, 0.92, 0.9);
  drawRoundedRect(buffer, size, cx - scale * 0.11, cy - scale * 0.018, scale * 0.10, scale * 0.036, stroke * 0.5, hexToRgb(cutoutColor), 1, 0.8);
  drawRoundedRect(buffer, size, cx - scale * 0.02, cy - scale * 0.055, scale * 0.20, scale * 0.11, stroke, white, 0.92, 0.9);
  drawRoundedRect(buffer, size, cx + scale * 0.03, cy - scale * 0.018, scale * 0.10, scale * 0.036, stroke * 0.5, hexToRgb(cutoutColor), 1, 0.8);
  drawRoundedRect(buffer, size, cx - scale * 0.055, cy - scale * 0.018, scale * 0.11, scale * 0.036, stroke * 0.5, white, 0.92, 0.8);
}

function drawProviderBadge(buffer, size, center, markRadius) {
  const badgeX = center + markRadius * 0.24;
  const badgeY = center - markRadius * 0.62;
  const badgeW = markRadius * 0.68;
  const badgeH = markRadius * 0.34;
  const blue = hexToRgb("#1d4ed8");
  const white = hexToRgb("#ffffff");

  drawRoundedRect(buffer, size, badgeX, badgeY, badgeW, badgeH, badgeH * 0.32, hexToRgb("#001b3b"), 0.18, size * 0.004);
  drawRoundedRect(buffer, size, badgeX, badgeY, badgeW, badgeH, badgeH * 0.32, blue, 0.96, size * 0.004);
  drawCircle(buffer, size, badgeX + badgeW * 0.26, badgeY + badgeH * 0.34, badgeH * 0.14, white, 0.96, size * 0.003);
  drawRoundedRect(buffer, size, badgeX + badgeW * 0.16, badgeY + badgeH * 0.52, badgeW * 0.20, badgeH * 0.20, badgeH * 0.08, white, 0.96, size * 0.003);
  drawRoundedRect(buffer, size, badgeX + badgeW * 0.45, badgeY + badgeH * 0.28, badgeW * 0.34, badgeH * 0.12, badgeH * 0.06, white, 0.9, size * 0.003);
  drawRoundedRect(buffer, size, badgeX + badgeW * 0.45, badgeY + badgeH * 0.52, badgeW * 0.24, badgeH * 0.10, badgeH * 0.05, white, 0.72, size * 0.003);
}

function makeIcon(size, variant = "patient") {
  const buffer = Buffer.alloc(size * size * 4);
  const isProvider = variant === "provider";
  const dark = hexToRgb(isProvider ? "#061633" : "#052f44");
  const blue = hexToRgb(isProvider ? "#1d4ed8" : "#007ca8");
  const teal = hexToRgb(isProvider ? "#0ea5e9" : "#009b82");
  const linkColor = isProvider ? "#2563eb" : "#13b58f";
  const linkCutout = isProvider ? "#2563eb" : "#12a889";

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = x / (size - 1);
      const ny = y / (size - 1);
      const diagonal = (nx * 0.52 + ny * 0.48);
      const radial = Math.hypot(nx - 0.25, ny - 0.18);
      const color = mixColor(mixColor(blue, teal, diagonal), dark, clamp(radial * 0.64, 0, 0.46));
      const vignette = clamp(Math.hypot(nx - 0.5, ny - 0.5) * 0.28, 0, 0.2);
      const index = (y * size + x) * 4;
      buffer[index] = clamp(color[0] * (1 - vignette));
      buffer[index + 1] = clamp(color[1] * (1 - vignette));
      buffer[index + 2] = clamp(color[2] * (1 - vignette));
      buffer[index + 3] = 255;
    }
  }

  drawCircle(buffer, size, size * 0.73, size * 0.2, size * 0.19, hexToRgb("#ffffff"), 0.07, size * 0.006);
  drawCircle(buffer, size, size * 0.22, size * 0.83, size * 0.28, hexToRgb(isProvider ? "#60a5fa" : "#00d0a2"), 0.13, size * 0.006);

  const center = size / 2;
  const markRadius = size * 0.29;
  drawCircle(buffer, size, center, center + size * 0.005, markRadius * 1.03, hexToRgb("#001b2b"), 0.2, size * 0.012);
  drawCircle(buffer, size, center, center, markRadius, hexToRgb(isProvider ? "#2563eb" : "#0796bb"), 1, size * 0.006);
  drawCircle(buffer, size, center + markRadius * 0.18, center + markRadius * 0.28, markRadius * 0.88, hexToRgb(isProvider ? "#0891b2" : "#009b82"), 0.55, size * 0.006);
  drawCircle(buffer, size, center - markRadius * 0.36, center - markRadius * 0.42, markRadius * 0.62, hexToRgb(isProvider ? "#60a5fa" : "#3aa9d4"), 0.24, size * 0.006);

  const plusThickness = markRadius * 0.17;
  const plusLength = markRadius * 1.08;
  drawRoundedRect(buffer, size, center - plusLength / 2, center - plusThickness / 2, plusLength, plusThickness, plusThickness / 2, hexToRgb("#ffffff"), 1, size * 0.004);
  drawRoundedRect(buffer, size, center - plusThickness / 2, center - plusLength / 2, plusThickness, plusLength, plusThickness / 2, hexToRgb("#ffffff"), 1, size * 0.004);

  const linkRadius = markRadius * 0.24;
  const linkCx = center + markRadius * 0.78;
  const linkCy = center + markRadius * 0.76;
  drawCircle(buffer, size, linkCx, linkCy, linkRadius, hexToRgb(linkColor), 1, size * 0.004);
  drawLinkMark(buffer, size, linkCx, linkCy, markRadius, linkCutout);

  if (isProvider) {
    drawProviderBadge(buffer, size, center, markRadius);
  }

  return encodePng(buffer, size, size);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(rgba, width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND"),
  ]);
}

for (const [fileName, size] of outputs) {
  for (const target of targets) {
    writeFileSync(join(target.directory, fileName), makeIcon(size, target.variant));
  }
}
