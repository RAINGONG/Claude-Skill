#!/usr/bin/env node
// figma-to-verstka / ensure-prereqs.mjs
// Проверяет prereqs текущего проекта для skill'а figma-to-verstka:
// - .mcp.json (playwright обязателен; figma — info-only, потому что
//   plugin:figma:figma живёт как HTTP MCP в claude config и проверяется
//   через runtime skill availability, не файлами)
// - MAX_MCP_OUTPUT_TOKENS в .claude/settings.local.json (≥100000)
// - scripts/diff.mjs (копирует из skill'а если нет)
// - scripts/validate-no-baked-ui.mjs (копирует из skill'а если нет)
// - CLAUDE.md (warn-only, не перезаписывает)
// - public/fonts/ (info-only)
// - Node version (≥20)
//
// Auto-fix включается флагом --auto-fix.
// Иначе — только диагностика в stdout JSON.
//
// Usage: node ensure-prereqs.mjs [--cwd <path>] [--auto-fix] [--verbose]

import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILL_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { cwd: process.cwd(), autoFix: false, verbose: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cwd') args.cwd = path.resolve(argv[++i]);
    else if (a === '--auto-fix') args.autoFix = true;
    else if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: ensure-prereqs.mjs [--cwd <path>] [--auto-fix] [--verbose]');
      process.exit(0);
    }
  }
  return args;
}

const ARGS = parseArgs(process.argv);
const ROOT = ARGS.cwd;
const log = (...a) => ARGS.verbose && console.error('[prereqs]', ...a);

async function readJSON(rel, fallback = null) {
  try { return JSON.parse(await readFile(path.join(ROOT, rel), 'utf8')); }
  catch { return fallback; }
}

function fileExists(rel) { return existsSync(path.join(ROOT, rel)); }

async function checkNodeVersion() {
  const v = process.versions.node.split('.').map(Number);
  const ok = v[0] >= 20;
  return {
    ok,
    detail: `node ${process.versions.node}`,
    fix: ok ? null : 'Upgrade Node ≥ 20 (Playwright MCP требует современный Node).',
  };
}

// Playwright MCP обязателен (нужен для verification). Figma MCP — info-only,
// потому что plugin:figma:figma живёт как HTTP MCP в claude global config,
// а не в .mcp.json. Скилл проверяет его доступность через runtime
// (figma:figma-implement-design must be in available skills list).
async function checkMcpJson() {
  const mcp = await readJSON('.mcp.json');
  const servers = mcp?.mcpServers || {};
  const names = Object.keys(servers);
  const hasFigmaLocal = names.some(n => /figma/i.test(n));
  const hasPlaywright = names.some(n => /playwright/i.test(n));

  if (!hasPlaywright) {
    return {
      ok: false,
      detail: mcp
        ? `playwright MCP не подключён. Найдено в .mcp.json: ${names.join(', ') || '(пусто)'}`
        : '.mcp.json отсутствует, playwright MCP не подключён',
      fix: 'Подключи Playwright MCP (для verification phase):\n  claude mcp add -s project playwright -- npx -y @playwright/mcp@latest\n\nFigma MCP `plugin:figma:figma` — отдельная HTTP MCP, авторизуется через `/mcp` команду в Claude Code.',
      autoFixable: false,
    };
  }

  const figmaInfo = hasFigmaLocal
    ? `figma local MCP найден (${names.filter(n => /figma/i.test(n)).join(', ')}). Опционально — primary остаётся plugin:figma:figma (HTTP).`
    : 'figma local MCP не подключён в .mcp.json (это норма — plugin:figma:figma подключается как HTTP MCP отдельно через `/mcp`).';

  return {
    ok: true,
    detail: `playwright подключён. ${figmaInfo}`,
    fix: null,
    autoFixable: false,
  };
}

async function checkMaxMcpOutputTokens(autoFix) {
  const TARGET = 100000;
  const settingsPath = '.claude/settings.local.json';
  const settings = await readJSON(settingsPath, {});
  const env = settings.env || {};
  const current = env.MAX_MCP_OUTPUT_TOKENS;
  const currentNum = current ? parseInt(current, 10) : null;
  const ok = currentNum && currentNum >= TARGET;

  if (ok) return { ok: true, detail: `MAX_MCP_OUTPUT_TOKENS=${current}` };

  if (autoFix) {
    const newSettings = {
      ...settings,
      env: { ...env, MAX_MCP_OUTPUT_TOKENS: String(TARGET) },
    };
    await mkdir(path.join(ROOT, '.claude'), { recursive: true });
    await writeFile(
      path.join(ROOT, settingsPath),
      JSON.stringify(newSettings, null, 2) + '\n',
      'utf8',
    );
    log('auto-fixed:', settingsPath);
    return {
      ok: true,
      detail: `MAX_MCP_OUTPUT_TOKENS=${TARGET} (auto-fixed)`,
      autoFixed: true,
    };
  }

  return {
    ok: false,
    detail: current ? `MAX_MCP_OUTPUT_TOKENS=${current}, нужно ≥${TARGET}` : 'MAX_MCP_OUTPUT_TOKENS не установлен',
    fix: `Добавь в .claude/settings.local.json:\n  { "env": { "MAX_MCP_OUTPUT_TOKENS": "${TARGET}" } }\nИли запусти ensure-prereqs --auto-fix.`,
    autoFixable: true,
  };
}

async function checkDiffScript(autoFix) {
  const targetPath = 'scripts/diff.mjs';
  if (fileExists(targetPath)) {
    return { ok: true, detail: `${targetPath} есть` };
  }

  if (autoFix) {
    const sourcePath = path.join(SKILL_ROOT, 'scripts', 'diff.mjs');
    if (!existsSync(sourcePath)) {
      return {
        ok: false,
        detail: `${targetPath} нет, но и в skill'е нет — внутренняя ошибка установки skill'а`,
        fix: null,
        autoFixable: false,
      };
    }
    await mkdir(path.join(ROOT, 'scripts'), { recursive: true });
    await copyFile(sourcePath, path.join(ROOT, targetPath));
    log('auto-fixed: copied', sourcePath, '→', targetPath);

    // регистрируем "diff" script в package.json если его нет
    const pkgPath = path.join(ROOT, 'package.json');
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
      pkg.scripts = pkg.scripts || {};
      if (!pkg.scripts.diff) {
        pkg.scripts.diff = 'node scripts/diff.mjs';
        await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
        log('auto-fixed: added "diff" script to package.json');
      }
    } catch {} // package.json может отсутствовать — не блокер

    // добавляем pixelmatch + sharp + pngjs если их ещё нет (only check, don't install)
    return {
      ok: true,
      detail: `${targetPath} скопирован из skill'а (auto-fixed). ВАЖНО: добавь deps вручную:\n  pnpm add -D pixelmatch pngjs sharp`,
      autoFixed: true,
    };
  }

  return {
    ok: false,
    detail: `${targetPath} нет`,
    fix: 'Запусти ensure-prereqs --auto-fix чтобы скопировать diff.mjs из skill\'а. Также добавь deps:\n  pnpm add -D pixelmatch pngjs sharp',
    autoFixable: true,
  };
}

async function checkValidateNoBakedUiScript(autoFix) {
  const targetPath = 'scripts/validate-no-baked-ui.mjs';
  if (fileExists(targetPath)) {
    return { ok: true, detail: `${targetPath} есть` };
  }

  if (autoFix) {
    const sourcePath = path.join(SKILL_ROOT, 'scripts', 'validate-no-baked-ui.mjs');
    if (!existsSync(sourcePath)) {
      return {
        ok: false,
        detail: `${targetPath} нет, но и в skill'е нет — внутренняя ошибка установки skill'а`,
        fix: null,
        autoFixable: false,
      };
    }
    await mkdir(path.join(ROOT, 'scripts'), { recursive: true });
    await copyFile(sourcePath, path.join(ROOT, targetPath));
    log('auto-fixed: copied', sourcePath, '→', targetPath);
    return {
      ok: true,
      detail: `${targetPath} скопирован из skill'а (auto-fixed)`,
      autoFixed: true,
    };
  }

  return {
    ok: false,
    detail: `${targetPath} нет`,
    fix: 'Запусти ensure-prereqs --auto-fix чтобы скопировать validate-no-baked-ui.mjs из skill\'а.',
    autoFixable: true,
  };
}

async function checkClaudeMd() {
  if (fileExists('CLAUDE.md')) {
    return { ok: true, detail: 'CLAUDE.md есть' };
  }
  return {
    ok: false,
    detail: 'CLAUDE.md отсутствует',
    fix: 'CLAUDE.md задаёт правила вёрстки для агента (pixel-perfect, hidden layers как мусор, mobile-first и т.д.). Orchestrator после Profiler предложит auto-create CLAUDE.md из reference/claude-md-templates/ по обнаруженному стеку.',
    autoFixable: false, // делается отдельно после Profiler
  };
}

async function checkPublicFonts() {
  // info-only — fonts могут не понадобиться
  if (fileExists('public/fonts')) return { ok: true, detail: 'public/fonts есть' };
  if (fileExists('static/fonts')) return { ok: true, detail: 'static/fonts есть' };
  return { ok: true, detail: 'локальных шрифтов нет (если в Figma кастомные шрифты — нужны .woff2 в public/fonts/)' };
}

async function checkPixelmatchDeps() {
  const pkg = await readJSON('package.json', {});
  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const need = ['pixelmatch', 'pngjs', 'sharp'];
  const missing = need.filter(d => !allDeps[d]);
  if (missing.length === 0) return { ok: true, detail: 'pixelmatch + pngjs + sharp установлены' };
  return {
    ok: false,
    detail: `не хватает devDeps: ${missing.join(', ')}`,
    fix: `Установи pixel-diff зависимости:\n  ${path.basename(detectPm()) === 'pnpm' ? 'pnpm' : 'npm'} add -D ${missing.join(' ')}`,
    autoFixable: false, // не лезем в lockfile автоматически
  };
}

function detectPm() {
  if (fileExists('pnpm-lock.yaml')) return 'pnpm';
  if (fileExists('bun.lockb') || fileExists('bun.lock')) return 'bun';
  if (fileExists('yarn.lock')) return 'yarn';
  return 'npm';
}

// ---------- main ----------

async function main() {
  log('cwd:', ROOT, 'auto-fix:', ARGS.autoFix);

  const checks = {
    node: await checkNodeVersion(),
    mcpJson: await checkMcpJson(),
    maxMcpOutputTokens: await checkMaxMcpOutputTokens(ARGS.autoFix),
    diffScript: await checkDiffScript(ARGS.autoFix),
    validateNoBakedUiScript: await checkValidateNoBakedUiScript(ARGS.autoFix),
    claudeMd: await checkClaudeMd(),
    publicFonts: await checkPublicFonts(),
    pixelmatchDeps: await checkPixelmatchDeps(),
  };

  // categorize
  const blockers = [];        // skill не может работать
  const warnings = [];         // skill может работать, но качество ниже
  const autoFixed = [];

  if (!checks.node.ok) blockers.push({ id: 'node', ...checks.node });
  if (!checks.mcpJson.ok) blockers.push({ id: 'mcpJson', ...checks.mcpJson });
  if (!checks.maxMcpOutputTokens.ok) blockers.push({ id: 'maxMcpOutputTokens', ...checks.maxMcpOutputTokens });
  if (!checks.diffScript.ok) blockers.push({ id: 'diffScript', ...checks.diffScript });
  if (!checks.validateNoBakedUiScript.ok) blockers.push({ id: 'validateNoBakedUiScript', ...checks.validateNoBakedUiScript });
  if (!checks.pixelmatchDeps.ok) blockers.push({ id: 'pixelmatchDeps', ...checks.pixelmatchDeps });

  if (!checks.claudeMd.ok) warnings.push({ id: 'claudeMd', ...checks.claudeMd });

  if (checks.maxMcpOutputTokens.autoFixed) autoFixed.push('maxMcpOutputTokens');
  if (checks.diffScript.autoFixed) autoFixed.push('diffScript');
  if (checks.validateNoBakedUiScript.autoFixed) autoFixed.push('validateNoBakedUiScript');

  const ok = blockers.length === 0;

  const report = {
    ok,
    cwd: ROOT,
    autoFix: ARGS.autoFix,
    autoFixed,
    summary: {
      passed: Object.entries(checks).filter(([, v]) => v.ok).map(([k]) => k),
      blockers: blockers.map(b => b.id),
      warnings: warnings.map(w => w.id),
    },
    blockers,
    warnings,
    details: checks,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch(err => {
  console.error('[prereqs] FATAL:', err.stack || err.message);
  process.exit(2);
});
