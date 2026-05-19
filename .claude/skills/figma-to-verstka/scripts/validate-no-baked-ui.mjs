#!/usr/bin/env node
// figma-to-verstka / validate-no-baked-ui.mjs
//
// Hard validator: банит UI-элементы зашитые как PNG в `<img src="*.png">`.
// Если в коде компонента встретилось <img src="...chip..." />, <img src="...button..." />
// и т.п. — это регрессия (Figma's skill должен рендерить UI как HTML).
//
// Usage:
//   node scripts/validate-no-baked-ui.mjs --component <Name> [--cwd <path>]
//   node scripts/validate-no-baked-ui.mjs --path <relPath>      [--cwd <path>]
//
// Exit codes:
//   0 — clean
//   1 — found baked UI (printed offending lines)
//   2 — invalid args / file not found

import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const UI_KEYWORDS = [
  'chip', 'badge', 'button', 'toggle', 'pill',
  'tab', 'tag', 'switch', 'checkbox', 'radio',
  'input', 'field', 'avatar', 'tooltip', 'dropdown',
  'select', 'modal', 'dialog', 'menu',
];

function parseArgs(argv) {
  const args = { component: null, file: null, cwd: process.cwd(), verbose: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--component') args.component = argv[++i];
    else if (a === '--path' || a === '--file') args.file = argv[++i];
    else if (a === '--cwd') args.cwd = path.resolve(argv[++i]);
    else if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: validate-no-baked-ui.mjs --component <Name> | --path <relPath> [--cwd <path>]');
      process.exit(0);
    }
  }
  return args;
}

async function pickComponentFiles(cwd, name) {
  // По умолчанию ищем в src/components/<Name>/<Name>.{tsx,jsx,vue,astro,svelte}
  // Если такого пути нет — fallback: рекурсивно ищем file <Name>.{...} под src/components/
  const exts = ['.tsx', '.jsx', '.vue', '.astro', '.svelte'];
  const candidates = exts.map(e => path.join('src/components', name, `${name}${e}`));
  const found = candidates.filter(rel => existsSync(path.join(cwd, rel)));
  if (found.length > 0) return found;

  // fallback search
  const componentsDir = path.join(cwd, 'src', 'components');
  if (!existsSync(componentsDir)) return [];

  const out = [];
  async function walk(dir, depth = 0) {
    if (depth > 6) return;
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === '__visual-tests__' || e.name === 'temp-outputs') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full, depth + 1);
      else if (e.isFile()) {
        const ext = path.extname(e.name);
        const base = path.basename(e.name, ext);
        if (exts.includes(ext) && base === name) {
          out.push(path.relative(cwd, full).replace(/\\/g, '/'));
        }
      }
    }
  }
  await walk(componentsDir);
  return out;
}

function findBakedUI(content) {
  // Match <img ... src="..." ... /> (multiline-tolerant) and grab src
  const offending = [];
  const imgRe = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  const lines = content.split(/\r?\n/);

  let m;
  while ((m = imgRe.exec(content)) !== null) {
    const src = m[1];
    const lower = src.toLowerCase();
    if (!/\.(png|jpg|jpeg|webp|avif)(\?|$)/.test(lower)) continue;

    const matchedKeyword = UI_KEYWORDS.find(kw => {
      // word-boundary-ish: kw встретился, и не часть длинного слова кроме разделителей -_/
      const re = new RegExp(`(^|[\\W_])${kw}([\\W_]|$)`, 'i');
      return re.test(lower);
    });
    if (matchedKeyword) {
      // вычислить line number
      const offset = m.index;
      let lineNo = 1, acc = 0;
      for (const line of lines) {
        if (acc + line.length + 1 > offset) break;
        acc += line.length + 1;
        lineNo++;
      }
      offending.push({ keyword: matchedKeyword, src, line: lineNo, fullMatch: m[0].trim() });
    }
  }
  return offending;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.component && !args.file) {
    console.error('[validate-no-baked-ui] Need --component <Name> or --path <relPath>');
    process.exit(2);
  }

  const files = args.file
    ? [args.file]
    : await pickComponentFiles(args.cwd, args.component);

  if (files.length === 0) {
    console.error(`[validate-no-baked-ui] No files found for component "${args.component}" under src/components/`);
    process.exit(2);
  }

  const allOffending = [];
  for (const rel of files) {
    const fp = path.join(args.cwd, rel);
    if (!existsSync(fp)) {
      console.error(`[validate-no-baked-ui] File not found: ${rel}`);
      continue;
    }
    const content = await readFile(fp, 'utf8');
    const offending = findBakedUI(content);
    if (offending.length > 0) {
      allOffending.push({ file: rel, hits: offending });
    } else if (args.verbose) {
      console.error(`[validate-no-baked-ui] OK: ${rel}`);
    }
  }

  if (allOffending.length === 0) {
    console.log(JSON.stringify({ ok: true, scanned: files }, null, 2));
    process.exit(0);
  }

  console.error('[validate-no-baked-ui] FAIL — UI элементы запечены в PNG:');
  for (const { file, hits } of allOffending) {
    console.error(`\n  ${file}:`);
    for (const h of hits) {
      console.error(`    line ${h.line}: keyword="${h.keyword}" src="${h.src}"`);
      console.error(`      → ${h.fullMatch}`);
    }
  }
  console.error('\nFix: render UI элементы как HTML (Tailwind classes), не как <img>. См. SKILL.md правила 1-3.');
  console.log(JSON.stringify({ ok: false, scanned: files, offending: allOffending }, null, 2));
  process.exit(1);
}

main().catch(err => {
  console.error('[validate-no-baked-ui] FATAL:', err.stack || err.message);
  process.exit(2);
});
