#!/usr/bin/env node
/**
 * Pixel diff utility used in the Figma → React pixel-perfect workflow.
 *
 * Usage:
 *   pnpm diff --actual <path> --reference <path> --out <path> \
 *             --width <px> --height <px> [--crop-actual-top <px>] \
 *             [--threshold <0..1>]
 *
 * Both inputs are resized to width × height (sharp 'fill') so pixelmatch
 * can run on identical dimensions. If --crop-actual-top is provided, the
 * actual screenshot is first cropped to its top N pixels (full width)
 * before resize — handy when the screenshot includes empty space below
 * the component.
 *
 * Prints a JSON report to stdout. Exit 1 on any failure (stderr details).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i += 1;
      }
    }
  }
  return out;
}

async function loadAndNormalize(filePath, targetW, targetH, cropTop, flatten) {
  const raw = await readFile(filePath);
  const meta = await sharp(raw).metadata();

  let pipeline = sharp(raw);
  if (flatten) {
    pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
  }
  if (cropTop && cropTop > 0 && cropTop < meta.height) {
    pipeline = pipeline.extract({
      left: 0,
      top: 0,
      width: meta.width,
      height: cropTop,
    });
  }

  const normalized = await pipeline
    .resize(targetW, targetH, { fit: 'fill' })
    .png()
    .toBuffer();

  return {
    originalSize: `${meta.width}x${meta.height}`,
    png: PNG.sync.read(normalized),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { actual, reference, out } = args;
  const width = Number(args.width);
  const height = Number(args.height);
  const cropActualTop = args['crop-actual-top']
    ? Number(args['crop-actual-top'])
    : 0;
  const threshold = args.threshold ? Number(args.threshold) : 0.1;
  const flatten = args['no-flatten'] !== true;

  if (!actual || !reference || !out || !width || !height) {
    throw new Error(
      'Required: --actual, --reference, --out, --width, --height'
    );
  }

  const [actualImg, referenceImg] = await Promise.all([
    loadAndNormalize(actual, width, height, cropActualTop, flatten),
    loadAndNormalize(reference, width, height, 0, flatten),
  ]);

  const diff = new PNG({ width, height });
  const totalPixels = width * height;
  const differentPixels = pixelmatch(
    actualImg.png.data,
    referenceImg.png.data,
    diff.data,
    width,
    height,
    { threshold, includeAA: true }
  );

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, PNG.sync.write(diff));

  const report = {
    actual_size: actualImg.originalSize,
    actual_crop_top: cropActualTop || null,
    reference_size: referenceImg.originalSize,
    compare_size: `${width}x${height}`,
    threshold,
    alpha_flattened: flatten,
    total_pixels: totalPixels,
    different_pixels: differentPixels,
    diff_percent: `${((differentPixels / totalPixels) * 100).toFixed(2)}%`,
    diff_image: out,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`diff.mjs failed: ${err.stack || err.message}\n`);
  process.exit(1);
});
