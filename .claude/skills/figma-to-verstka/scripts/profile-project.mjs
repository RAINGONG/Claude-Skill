#!/usr/bin/env node
// figma-to-react-pixel-perfect / profile-project.mjs
// Detects project tech stack + conventions, outputs .figma-page-builder/profile.json.
// Usage: node profile-project.mjs [--cwd <path>] [--out <path>] [--verbose]

import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// ---------- arg parsing ----------

function parseArgs(argv) {
  const args = { cwd: process.cwd(), out: null, verbose: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cwd') args.cwd = path.resolve(argv[++i]);
    else if (a === '--out') args.out = path.resolve(argv[++i]);
    else if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: profile-project.mjs [--cwd <path>] [--out <path>] [--verbose]');
      process.exit(0);
    }
  }
  if (!args.out) args.out = path.join(args.cwd, '.figma-page-builder', 'profile.json');
  return args;
}

const ARGS = parseArgs(process.argv);
const ROOT = ARGS.cwd;
const log = (...a) => ARGS.verbose && console.error('[profiler]', ...a);

// ---------- fs helpers ----------

async function readJSON(rel, fallback = null) {
  const fp = path.join(ROOT, rel);
  try {
    const raw = await readFile(fp, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function readText(rel, fallback = '') {
  const fp = path.join(ROOT, rel);
  try {
    return await readFile(fp, 'utf8');
  } catch {
    return fallback;
  }
}

async function fileExists(rel) {
  return existsSync(path.join(ROOT, rel));
}

async function dirExists(rel) {
  try {
    const s = await stat(path.join(ROOT, rel));
    return s.isDirectory();
  } catch {
    return false;
  }
}

// recursive file listing with extension filter and depth limit
async function listFiles(rel, exts, maxDepth = 6, maxFiles = 5000) {
  const root = path.join(ROOT, rel);
  if (!existsSync(root)) return [];
  const out = [];
  const skipDirs = new Set(['node_modules', '.git', '.next', '.turbo', '.cache', 'dist', 'build', 'out', '__visual-tests__', 'temp-outputs', 'coverage']);
  async function walk(dir, depth) {
    if (depth > maxDepth || out.length >= maxFiles) return;
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      if (skipDirs.has(e.name) || e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full, depth + 1);
      } else if (e.isFile()) {
        const ext = path.extname(e.name).toLowerCase();
        if (!exts || exts.includes(ext)) {
          out.push(path.relative(ROOT, full).replace(/\\/g, '/'));
          if (out.length >= maxFiles) return;
        }
      }
    }
  }
  await walk(root, 0);
  return out;
}

// ---------- detection helpers ----------

function depHas(pkg, name) {
  if (!pkg) return false;
  return Boolean(
    pkg.dependencies?.[name] ||
    pkg.devDependencies?.[name] ||
    pkg.peerDependencies?.[name] ||
    pkg.optionalDependencies?.[name]
  );
}

function depVersion(pkg, name) {
  if (!pkg) return null;
  return (
    pkg.dependencies?.[name] ||
    pkg.devDependencies?.[name] ||
    pkg.peerDependencies?.[name] ||
    pkg.optionalDependencies?.[name] ||
    null
  );
}

function depMatch(pkg, prefix) {
  if (!pkg) return [];
  const all = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  return Object.keys(all).filter(k => k.startsWith(prefix));
}

// ---------- detectors ----------

async function detectFramework(pkg) {
  const out = { framework: 'unknown', frameworkVersion: null, secondary: [] };

  if (depHas(pkg, 'astro')) {
    out.framework = 'astro';
    out.frameworkVersion = depVersion(pkg, 'astro');
  } else if (depHas(pkg, 'next')) {
    // distinguish app vs pages router
    const hasAppDir = (await dirExists('app')) || (await dirExists('src/app'));
    const hasPagesDir = (await dirExists('pages')) || (await dirExists('src/pages'));
    if (hasAppDir && !hasPagesDir) out.framework = 'next-app';
    else if (hasPagesDir && !hasAppDir) out.framework = 'next-pages';
    else if (hasAppDir && hasPagesDir) out.framework = 'next-app'; // app wins (modern)
    else out.framework = 'next-app'; // default for new projects
    out.frameworkVersion = depVersion(pkg, 'next');
  } else if (depHas(pkg, 'nuxt')) {
    out.framework = 'nuxt';
    out.frameworkVersion = depVersion(pkg, 'nuxt');
  } else if (depHas(pkg, 'remix') || depHas(pkg, '@remix-run/react')) {
    out.framework = 'remix';
    out.frameworkVersion = depVersion(pkg, 'remix') || depVersion(pkg, '@remix-run/react');
  } else if (depHas(pkg, '@sveltejs/kit')) {
    out.framework = 'sveltekit';
    out.frameworkVersion = depVersion(pkg, '@sveltejs/kit');
  } else if (depHas(pkg, 'vue')) {
    out.framework = 'vue-vite';
    out.frameworkVersion = depVersion(pkg, 'vue');
  } else if (depHas(pkg, 'react') && depHas(pkg, 'vite')) {
    out.framework = 'react-vite';
    out.frameworkVersion = depVersion(pkg, 'react');
  } else if (depHas(pkg, 'react') && depHas(pkg, 'react-scripts')) {
    out.framework = 'react-cra';
    out.frameworkVersion = depVersion(pkg, 'react');
  }

  // secondary integrations
  if (out.framework === 'astro') {
    if (depHas(pkg, '@astrojs/react')) out.secondary.push('react-island');
    if (depHas(pkg, '@astrojs/vue')) out.secondary.push('vue-island');
    if (depHas(pkg, '@astrojs/svelte')) out.secondary.push('svelte-island');
  }

  return out;
}

async function detectLanguage(pkg) {
  const hasTs = await fileExists('tsconfig.json');
  const hasJs = await fileExists('jsconfig.json');
  if (hasTs) return 'ts';
  if (depHas(pkg, 'typescript')) return 'ts';
  if (hasJs) return 'js';
  return 'js';
}

async function detectPackageManager() {
  if (await fileExists('pnpm-lock.yaml')) return 'pnpm';
  if (await fileExists('bun.lockb') || await fileExists('bun.lock')) return 'bun';
  if (await fileExists('yarn.lock')) return 'yarn';
  if (await fileExists('package-lock.json')) return 'npm';
  return 'npm';
}

async function detectStyling(pkg) {
  const out = { approach: 'css', tailwindVersion: null, uiLibrary: null };

  // Tailwind detection
  if (depHas(pkg, 'tailwindcss')) {
    out.approach = 'tailwind';
    const v = depVersion(pkg, 'tailwindcss') || '';
    if (v.match(/[\^~]?4\./) || depHas(pkg, '@tailwindcss/vite') || depHas(pkg, '@tailwindcss/postcss')) {
      out.tailwindVersion = 'v4';
    } else {
      out.tailwindVersion = 'v3';
    }
  } else {
    // check CSS files for @import "tailwindcss" (v4 css-first config)
    const cssFiles = await listFiles('src', ['.css'], 4, 50);
    for (const f of cssFiles.slice(0, 20)) {
      const content = await readText(f);
      if (/@import\s+["']tailwindcss/.test(content)) {
        out.approach = 'tailwind';
        out.tailwindVersion = 'v4';
        break;
      }
    }
  }

  if (out.approach === 'css') {
    if (depHas(pkg, 'styled-components')) out.approach = 'styled-components';
    else if (depHas(pkg, '@emotion/react') || depHas(pkg, '@emotion/styled')) out.approach = 'emotion';
    else if (depHas(pkg, '@vanilla-extract/css')) out.approach = 'vanilla-extract';
    else if (depHas(pkg, '@pandacss/dev')) out.approach = 'panda';
    // CSS Modules detection — heuristic: presence of *.module.css files
    else {
      const moduleFiles = await listFiles('src', ['.css'], 4, 200);
      if (moduleFiles.some(f => f.endsWith('.module.css'))) out.approach = 'css-modules';
    }
  }

  // UI library detection (priority order)
  if (await fileExists('components.json')) {
    out.uiLibrary = 'shadcn';
  } else if (depHas(pkg, '@mui/material')) {
    out.uiLibrary = 'mui';
  } else if (depHas(pkg, '@mantine/core')) {
    out.uiLibrary = 'mantine';
  } else if (depHas(pkg, '@chakra-ui/react')) {
    out.uiLibrary = 'chakra';
  } else if (depHas(pkg, 'antd')) {
    out.uiLibrary = 'antd';
  } else if (depMatch(pkg, '@radix-ui/').length > 0) {
    out.uiLibrary = 'radix-bare';
  } else if (depHas(pkg, '@headlessui/react') || depHas(pkg, '@headlessui/vue')) {
    out.uiLibrary = 'headless-ui';
  }

  return out;
}

function detectIconLibrary(pkg) {
  if (depHas(pkg, 'lucide-react') || depHas(pkg, 'lucide-vue-next') || depHas(pkg, 'lucide-svelte')) return 'lucide';
  if (depHas(pkg, '@heroicons/react') || depHas(pkg, '@heroicons/vue')) return 'heroicons';
  if (depHas(pkg, '@tabler/icons-react') || depHas(pkg, '@tabler/icons-vue')) return 'tabler';
  if (depHas(pkg, 'react-icons')) return 'react-icons';
  if (depHas(pkg, 'phosphor-react') || depHas(pkg, '@phosphor-icons/react')) return 'phosphor';
  return null;
}

async function detectI18n(pkg) {
  const out = {
    enabled: false,
    library: null,
    locales: null,
    translationKeyPattern: null,
    stringInterpolation: null,
    examplePath: null,
  };

  if (depHas(pkg, 'next-intl')) { out.enabled = true; out.library = 'next-intl'; out.stringInterpolation = "t('key')"; }
  else if (depHas(pkg, 'react-i18next') || depHas(pkg, 'i18next')) { out.enabled = true; out.library = 'i18next'; out.stringInterpolation = "t('key')"; }
  else if (depHas(pkg, 'astro-i18n') || depHas(pkg, '@astrojs/i18n')) { out.enabled = true; out.library = 'astro-i18n'; }
  else if (depHas(pkg, 'vue-i18n')) { out.enabled = true; out.library = 'vue-i18n'; out.stringInterpolation = "$t('key')"; }
  else if (depHas(pkg, '@inlang/paraglide-js') || depHas(pkg, '@inlang/paraglide-next') || depMatch(pkg, '@inlang/').length) {
    out.enabled = true;
    out.library = 'paraglide';
  }

  // detect locale files / dirs
  const localeDirs = ['locales', 'messages', 'i18n', 'src/locales', 'src/messages', 'src/i18n', 'public/locales'];
  for (const d of localeDirs) {
    if (await dirExists(d)) {
      out.examplePath = d;
      try {
        const entries = await readdir(path.join(ROOT, d));
        const locales = entries
          .filter(n => /^[a-z]{2}(-[A-Z]{2})?(\.json|$)/i.test(n))
          .map(n => n.replace(/\.json$/i, ''));
        if (locales.length > 0) {
          out.locales = locales;
          if (!out.enabled) out.enabled = true;  // locale dir without lib = could be custom impl
        }
      } catch {}
      break;
    }
  }

  // additional check: grep for useTranslation/t( in components
  if (!out.enabled) {
    const sample = await listFiles('src', ['.tsx', '.jsx', '.vue', '.astro', '.svelte'], 4, 30);
    for (const f of sample.slice(0, 10)) {
      const content = await readText(f);
      if (/useTranslation\(|i18nKey=|\$t\(['"]|getTranslations\(/.test(content)) {
        out.enabled = true;
        if (!out.library) out.library = 'unknown';
        break;
      }
    }
  }

  return out;
}

function detectDataFetching(pkg) {
  const out = { library: null, queryClient: null, examplePath: null };

  if (depHas(pkg, '@tanstack/react-query') || depHas(pkg, '@tanstack/vue-query')) {
    out.library = 'react-query';
    out.queryClient = 'global';
  } else if (depHas(pkg, 'swr')) {
    out.library = 'swr';
  } else if (depHas(pkg, '@reduxjs/toolkit') && depHas(pkg, 'react-redux')) {
    out.library = 'rtk-query';
  } else if (depHas(pkg, 'urql') || depHas(pkg, '@urql/core')) {
    out.library = 'urql';
  } else if (depHas(pkg, '@apollo/client')) {
    out.library = 'apollo';
  }
  // astro content collections — detected later via file structure

  return out;
}

async function detectRouting(framework) {
  const out = { approach: 'manual', pageDirectory: null, pageNamingConvention: null, exampleRoute: null };

  // file-based by framework
  switch (framework) {
    case 'astro':
      if (await dirExists('src/pages')) { out.approach = 'file-based'; out.pageDirectory = 'src/pages'; }
      break;
    case 'next-app':
      if (await dirExists('app')) { out.approach = 'file-based'; out.pageDirectory = 'app'; }
      else if (await dirExists('src/app')) { out.approach = 'file-based'; out.pageDirectory = 'src/app'; }
      break;
    case 'next-pages':
      if (await dirExists('pages')) { out.approach = 'file-based'; out.pageDirectory = 'pages'; }
      else if (await dirExists('src/pages')) { out.approach = 'file-based'; out.pageDirectory = 'src/pages'; }
      break;
    case 'sveltekit':
      if (await dirExists('src/routes')) { out.approach = 'file-based'; out.pageDirectory = 'src/routes'; }
      break;
    case 'remix':
      if (await dirExists('app/routes')) { out.approach = 'file-based'; out.pageDirectory = 'app/routes'; }
      break;
    case 'nuxt':
      if (await dirExists('pages')) { out.approach = 'file-based'; out.pageDirectory = 'pages'; }
      break;
  }

  // infer naming convention from existing pages
  if (out.pageDirectory) {
    const files = await listFiles(out.pageDirectory, ['.astro', '.tsx', '.jsx', '.vue', '.svelte'], 3, 50);
    const sample = files.find(f => !f.includes('layout') && !f.includes('_app') && !f.includes('index'));
    if (sample) {
      out.exampleRoute = '/' + path.basename(sample, path.extname(sample)).replace(/^\[|\]$/g, '');
      const baseName = path.basename(sample, path.extname(sample));
      if (/^[a-z]/.test(baseName) && baseName.includes('-')) out.pageNamingConvention = 'kebab-case';
      else if (/^[a-z]+$/.test(baseName)) out.pageNamingConvention = 'lowercase';
      else if (/^[A-Z]/.test(baseName)) out.pageNamingConvention = 'PascalCase';
      else out.pageNamingConvention = 'kebab-case';
    } else {
      out.pageNamingConvention = 'kebab-case';
    }
  }

  return out;
}

async function detectFileStructure() {
  const out = {
    componentsDir: 'src/components',
    componentSubfolders: 'flat',
    namingConvention: 'PascalCase',
    indexFiles: false,
    barrelFiles: false,
  };

  const candidates = ['src/components', 'components', 'src/lib/components', 'app/components'];
  for (const c of candidates) {
    if (await dirExists(c)) { out.componentsDir = c; break; }
  }

  if (!(await dirExists(out.componentsDir))) return out;

  const entries = await readdir(path.join(ROOT, out.componentsDir), { withFileTypes: true });
  const subdirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'));
  const files = entries.filter(e => e.isFile() && /\.(tsx|jsx|vue|astro|svelte)$/.test(e.name));

  // determine subfolder pattern
  if (subdirs.length === 0) {
    out.componentSubfolders = 'flat';
  } else {
    // sample one subdir to see if it's atomic (atoms/molecules) or feature-based
    const sampleDir = subdirs[0].name;
    if (['ui', 'atoms', 'molecules', 'organisms', 'templates'].includes(sampleDir.toLowerCase())) {
      out.componentSubfolders = 'atomic';
    } else if (subdirs.length > files.length) {
      // one folder per component
      out.componentSubfolders = 'feature-based';
      // check if there's an index file inside
      try {
        const inner = await readdir(path.join(ROOT, out.componentsDir, sampleDir));
        if (inner.some(n => n === 'index.ts' || n === 'index.tsx' || n === 'index.js' || n === 'index.jsx')) {
          out.indexFiles = true;
          out.componentSubfolders = 'feature-with-index';
        }
      } catch {}
    } else {
      out.componentSubfolders = 'flat';
    }
  }

  // naming convention from sample
  const sample = subdirs[0]?.name || files[0]?.name?.replace(/\.(tsx|jsx|vue|astro|svelte)$/, '');
  if (sample) {
    if (/^[A-Z]/.test(sample)) out.namingConvention = 'PascalCase';
    else if (/-/.test(sample)) out.namingConvention = 'kebab-case';
    else out.namingConvention = 'camelCase';
  }

  // barrel files
  for (const c of ['src/components/index.ts', 'src/components/index.tsx', 'components/index.ts']) {
    if (await fileExists(c)) { out.barrelFiles = true; break; }
  }

  return out;
}

async function detectFonts(pkg) {
  // local files win — это primary источник, остальное secondary
  const out = { approach: 'system', fontFiles: null, secondaryApproaches: [] };

  // 1. local woff2 (highest priority — это что пользователь явно положил в проект)
  if (await dirExists('public/fonts')) {
    out.approach = 'local-woff2';
    out.fontFiles = 'public/fonts';
  } else if (await dirExists('static/fonts')) {
    out.approach = 'local-woff2';
    out.fontFiles = 'static/fonts';
  } else if (depHas(pkg, 'next/font') || depHas(pkg, '@next/font')) {
    out.approach = 'next-font';
  } else if (depMatch(pkg, '@fontsource/').length > 0 || depMatch(pkg, '@fontsource-variable/').length > 0) {
    out.approach = 'fontsource';
  } else {
    // google fonts CDN — check index.html or layout files
    const candidates = ['index.html', 'src/app.html', 'app/layout.tsx', 'src/app/layout.tsx', 'pages/_document.tsx', 'src/layouts/Layout.astro'];
    for (const c of candidates) {
      if (await fileExists(c)) {
        const content = await readText(c);
        if (/fonts\.googleapis\.com/.test(content)) { out.approach = 'google-fonts-link'; break; }
      }
    }
  }

  // secondary approaches — отметить остальное что нашлось, но не primary
  if (out.approach !== 'fontsource' && (depMatch(pkg, '@fontsource/').length > 0 || depMatch(pkg, '@fontsource-variable/').length > 0)) {
    out.secondaryApproaches.push('fontsource');
  }
  if (out.approach !== 'next-font' && (depHas(pkg, 'next/font') || depHas(pkg, '@next/font'))) {
    out.secondaryApproaches.push('next-font');
  }

  return out;
}

async function readSampleComponents(componentsDir, count = 2) {
  const files = await listFiles(componentsDir, ['.tsx', '.jsx', '.vue', '.astro', '.svelte'], 4, 100);
  // exclude UI lib folder (shadcn auto-generated)
  const filtered = files.filter(f => !f.includes('/ui/') && !f.endsWith('index.ts') && !f.endsWith('index.tsx'));
  const sampled = [];
  for (const f of filtered.slice(0, count * 3)) {
    if (sampled.length >= count) break;
    const content = await readText(f);
    if (content.length > 200 && content.length < 20000) {
      sampled.push({ path: f, content });
    }
  }
  return sampled;
}

function inferConventions(samples) {
  const out = {
    componentExportStyle: 'named',
    propsTyping: 'type',
    stateManagement: null,
    formLibrary: null,
    linkComponent: 'anchor',
  };

  if (samples.length === 0) return out;

  let namedExports = 0, defaultExports = 0;
  let typeKeyword = 0, interfaceKeyword = 0;

  for (const { content } of samples) {
    if (/export\s+default\s+(function|class|const)/.test(content)) defaultExports++;
    if (/export\s+(function|const|class)\s+[A-Z]/.test(content)) namedExports++;
    if (/^\s*type\s+\w+Props/m.test(content)) typeKeyword++;
    if (/^\s*interface\s+\w+Props/m.test(content)) interfaceKeyword++;
  }

  out.componentExportStyle = namedExports >= defaultExports ? 'named' : 'default';
  out.propsTyping = typeKeyword >= interfaceKeyword ? 'type' : 'interface';

  return out;
}

function detectStateManagement(pkg) {
  if (depHas(pkg, 'jotai')) return 'jotai';
  if (depHas(pkg, 'zustand')) return 'zustand';
  if (depHas(pkg, 'redux') || depHas(pkg, '@reduxjs/toolkit')) return 'redux';
  if (depHas(pkg, 'mobx')) return 'mobx';
  if (depHas(pkg, 'pinia')) return 'pinia';
  if (depHas(pkg, 'valtio')) return 'valtio';
  if (depHas(pkg, '@xstate/react') || depHas(pkg, 'xstate')) return 'xstate';
  return null;
}

function detectFormLibrary(pkg) {
  if (depHas(pkg, 'react-hook-form')) return 'react-hook-form';
  if (depHas(pkg, 'formik')) return 'formik';
  if (depHas(pkg, 'felte') || depHas(pkg, '@felte/react')) return 'felte';
  if (depHas(pkg, '@tanstack/react-form')) return 'tanstack-form';
  return null;
}

function detectLinkComponent(framework, pkg) {
  if (framework === 'next-app' || framework === 'next-pages') return 'next-link';
  if (framework === 'astro') return 'astro-anchor';
  if (depHas(pkg, 'react-router-dom')) return 'react-router-link';
  if (depHas(pkg, '@tanstack/react-router')) return 'tanstack-router-link';
  if (depHas(pkg, 'wouter')) return 'wouter-link';
  return 'anchor';
}

async function detectScreenshotStrategy(framework) {
  switch (framework) {
    case 'astro': return 'astro-localhost';
    case 'next-app':
    case 'next-pages': return 'next-localhost';
    case 'react-vite':
    case 'vue-vite': return 'vite-localhost';
    case 'sveltekit': return 'sveltekit-localhost';
    case 'remix': return 'remix-localhost';
    default: return 'preview-build';
  }
}

function detectCommands(pkg, packageManager) {
  // pm "run" prefix — нужен для npm и yarn (npm run dev), pnpm/bun могут без него но run работает везде
  const pmRun = packageManager === 'npm' ? 'npm run' : packageManager;
  // pm "exec" prefix — для запуска бинарей напрямую (tsc, eslint и т.д.)
  const pmExec = packageManager === 'pnpm' ? 'pnpm exec'
              : packageManager === 'yarn' ? 'yarn'
              : packageManager === 'bun' ? 'bun x'
              : 'npx';
  const scripts = pkg?.scripts || {};
  const has = (s) => Object.prototype.hasOwnProperty.call(scripts, s);

  // typecheck: предпочитаем script, иначе синтезируем через exec, если есть TS
  const hasTs = depHas(pkg, 'typescript');
  let typecheck = null;
  if (has('typecheck')) typecheck = `${pmRun} typecheck`;
  else if (has('type-check')) typecheck = `${pmRun} type-check`;
  else if (has('tsc')) typecheck = `${pmRun} tsc`;
  else if (hasTs) typecheck = `${pmExec} tsc --noEmit`;

  // lint: предпочитаем script, иначе через exec если есть eslint
  let lint = null;
  if (has('lint')) lint = `${pmRun} lint`;
  else if (depHas(pkg, 'eslint')) lint = `${pmExec} eslint .`;

  return {
    dev: has('dev') ? `${pmRun} dev` : has('start') ? `${pmRun} start` : null,
    build: has('build') ? `${pmRun} build` : null,
    lint,
    typecheck,
    preview: has('preview') ? `${pmRun} preview` : null,
    test: has('test') ? `${pmRun} test` : null,
  };
}

async function detectClaudeMd() {
  return await fileExists('CLAUDE.md');
}

async function detectMcpJson() {
  const mcp = await readJSON('.mcp.json');
  if (!mcp) return { hasMcpJson: false, hasFigmaMcp: false, hasPlaywrightMcp: false };
  const servers = mcp.mcpServers || {};
  const hasFigmaMcp = Object.keys(servers).some(k => /figma/i.test(k));
  const hasPlaywrightMcp = Object.keys(servers).some(k => /playwright/i.test(k));
  return { hasMcpJson: true, hasFigmaMcp, hasPlaywrightMcp };
}

// ---------- main ----------

async function main() {
  log('cwd:', ROOT);

  const pkg = await readJSON('package.json');
  if (!pkg) {
    console.error('[profiler] No package.json found in', ROOT);
    process.exit(2);
  }

  const frameworkInfo = await detectFramework(pkg);
  const language = await detectLanguage(pkg);
  const packageManager = await detectPackageManager();
  const styling = await detectStyling(pkg);
  const iconLibrary = detectIconLibrary(pkg);
  const i18n = await detectI18n(pkg);
  const dataFetching = detectDataFetching(pkg);
  const routing = await detectRouting(frameworkInfo.framework);
  const fileStructure = await detectFileStructure();
  const fonts = await detectFonts(pkg);
  const screenshotStrategy = await detectScreenshotStrategy(frameworkInfo.framework);
  const commands = detectCommands(pkg, packageManager);
  const claudeMdExisting = await detectClaudeMd();
  const mcpStatus = await detectMcpJson();

  const samples = await readSampleComponents(fileStructure.componentsDir, 3);
  const conventions = inferConventions(samples);
  conventions.stateManagement = detectStateManagement(pkg);
  conventions.formLibrary = detectFormLibrary(pkg);
  conventions.linkComponent = detectLinkComponent(frameworkInfo.framework, pkg);

  const examples = {
    existingComponentPath: samples[0]?.path || null,
    existingPagePath: routing.pageDirectory ? (await listFiles(routing.pageDirectory, ['.tsx', '.jsx', '.vue', '.astro', '.svelte'], 3, 5))[0] || null : null,
    existingLayoutPath: null,
  };
  // try common layout locations
  for (const lp of ['src/layouts/Layout.astro', 'src/layouts/MainLayout.astro', 'src/app/layout.tsx', 'app/layout.tsx', 'src/components/Layout.tsx']) {
    if (await fileExists(lp)) { examples.existingLayoutPath = lp; break; }
  }

  const profile = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    cwd: ROOT,

    framework: frameworkInfo.framework,
    frameworkVersion: frameworkInfo.frameworkVersion,
    secondary: frameworkInfo.secondary,
    language,
    packageManager,

    styling,
    iconLibrary,
    i18n,
    dataFetching,
    routing,
    fileStructure,
    fonts,
    commands,
    screenshotStrategy,
    conventions,
    examples,

    claudeMdExisting,
    mcp: mcpStatus,

    sampleComponents: samples.map(s => s.path),

    warnings: [],
  };

  // collect warnings for orchestrator escalation
  if (profile.framework === 'unknown') profile.warnings.push('framework=unknown — orchestrator should escalate stack choice');
  if (!profile.styling.approach || profile.styling.approach === 'css') profile.warnings.push('styling=css (no Tailwind/CSS-in-JS detected) — pixel-perfect output may need CSS file edits');
  if (!profile.commands.typecheck && profile.language === 'ts') profile.warnings.push('no typecheck script and no typescript dep — Implementer cannot run TS validation');
  if (!profile.commands.lint) profile.warnings.push('no lint script and no eslint dep — Implementer cannot run lint');
  if (!profile.mcp.hasFigmaMcp) profile.warnings.push('no figma-mcp-go (or figma) in .mcp.json — extraction will fail');
  if (!profile.mcp.hasPlaywrightMcp) profile.warnings.push('no playwright in .mcp.json — verification will fail');

  // ensure output directory
  await mkdir(path.dirname(ARGS.out), { recursive: true });
  await writeFile(ARGS.out, JSON.stringify(profile, null, 2) + '\n', 'utf8');

  console.log(JSON.stringify({
    ok: true,
    profilePath: ARGS.out,
    framework: profile.framework,
    styling: profile.styling.approach + (profile.styling.tailwindVersion ? ' ' + profile.styling.tailwindVersion : ''),
    uiLibrary: profile.styling.uiLibrary,
    iconLibrary: profile.iconLibrary,
    i18n: profile.i18n.enabled ? profile.i18n.library : 'none',
    warnings: profile.warnings.length,
  }, null, 2));
}

main().catch(err => {
  console.error('[profiler] FATAL:', err.stack || err.message);
  process.exit(1);
});
