import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

type Rgba = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function readPng(path: string) {
  const buffer = readFileSync(path);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];

  expect(bitDepth).toBe(8);
  expect(colorType).toBe(6);

  const chunks: Buffer[] = [];
  let offset = 33;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") {
      chunks.push(buffer.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }

  const inflated = inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const pixels = Buffer.alloc(width * height * 4);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const rowStart = y * stride;

    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[sourceOffset + x];
      const left = x >= 4 ? pixels[rowStart + x - 4] : 0;
      const up = y > 0 ? pixels[rowStart + x - stride] : 0;
      const upLeft = y > 0 && x >= 4 ? pixels[rowStart + x - stride - 4] : 0;
      let value = raw;

      if (filter === 1) {
        value += left;
      } else if (filter === 2) {
        value += up;
      } else if (filter === 3) {
        value += Math.floor((left + up) / 2);
      } else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }

      pixels[rowStart + x] = value & 255;
    }

    sourceOffset += stride;
  }

  function getPixel(x: number, y: number): Rgba {
    const index = (y * width + x) * 4;
    return {
      r: pixels[index]!,
      g: pixels[index + 1]!,
      b: pixels[index + 2]!,
      a: pixels[index + 3]!,
    };
  }

  return { width, height, getPixel };
}

describe("PWA manifest", () => {
  it("keeps the install manifest modern and web-only", () => {
    const result = manifest();

    expect(result).toEqual({
      id: "/",
      name: "Calm Wallet",
      short_name: "Calm Wallet",
      description: "A calm AI notebook for tracking expenses and income.",
      start_url: "/assistant",
      scope: "/",
      display: "standalone",
      background_color: "#f8fafc",
      theme_color: "#f8fafc",
      orientation: "portrait-primary",
      icons: [
        {
          src: "/icons/calm-wallet-icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icons/calm-wallet-icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icons/calm-wallet-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    });

    expect(result).not.toHaveProperty("related_applications");
    expect(result).not.toHaveProperty("prefer_related_applications");
  });

  it("references icon files that exist in public", () => {
    const result = manifest();

    expect(result.icons).toBeDefined();
    for (const icon of result.icons ?? []) {
      if (typeof icon === "string") {
        continue;
      }

      expect(existsSync(join(process.cwd(), "public", icon.src))).toBe(true);
    }
  });

  it("keeps install icon PNGs sized and free of black splash corners", () => {
    const icon192 = readPng(join(process.cwd(), "public", "icons", "calm-wallet-icon-192.png"));
    const icon512 = readPng(join(process.cwd(), "public", "icons", "calm-wallet-icon-512.png"));
    const maskable = readPng(join(process.cwd(), "public", "icons", "calm-wallet-maskable-512.png"));

    expect({ width: icon192.width, height: icon192.height }).toEqual({ width: 192, height: 192 });
    expect({ width: icon512.width, height: icon512.height }).toEqual({ width: 512, height: 512 });
    expect({ width: maskable.width, height: maskable.height }).toEqual({ width: 512, height: 512 });

    expect(icon192.getPixel(0, 0)).toEqual({ r: 248, g: 250, b: 252, a: 255 });
    expect(icon512.getPixel(0, 0)).toEqual({ r: 248, g: 250, b: 252, a: 255 });
    expect(maskable.getPixel(0, 0)).toEqual({ r: 248, g: 250, b: 252, a: 255 });
    expect(maskable.getPixel(511, 511)).toEqual({ r: 248, g: 250, b: 252, a: 255 });

    for (const image of [icon192, icon512, maskable]) {
      const corner = image.getPixel(0, 0);
      expect(corner).not.toMatchObject({ r: 0, g: 0, b: 0, a: 255 });
    }
  });
});
