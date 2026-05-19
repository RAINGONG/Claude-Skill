# CLAUDE.md — правила pixel-perfect вёрстки (React + Vite + Tailwind)

## Стек (фиксирован)

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (через @tailwindcss/vite)
- shadcn/ui (style: new-york)
- lucide-react для иконок
- pnpm как package manager
- Все алиасы пути: `@/` → `src/`

## Структура папок

- `src/components/ui/` — shadcn-компоненты, не редактировать без явной просьбы.
- `src/components/<Feature>/` — компоненты экранов и фич (feature-based).
- `src/components/modals/` — отдельные модалки (Dialog wrappers).
- `src/components/pages/` — Page-компоненты (когда дойдём до Composer).
- `src/lib/utils.ts` — `cn()` helper.
- `src/components/<Feature>/__visual-tests__/` — pixel-diff baseline (artifacts cycle).

## Правила вёрстки

### 1. Pixel-perfect — цель
- ≤5% pixel diff против Figma reference (исключая текстовые регионы — там floor ~3-5% из-за rendering Figma vs Chrome).
- Двухфазный workflow: extract → review → generate → screenshot → diff.
- Не показывай креативность. Делай точно как в Figma.

### 2. Multi-breakpoint (mobile + desktop)
- Mobile-first: дефолтные классы — для 375. `lg:` префикс для 1920.
- Когда DOM-структуры разные — рендерим обе, скрываем CSS'ом (`hidden` / `lg:hidden`). На скрытом — `aria-hidden="true"` + `tabIndex={-1}` на интерактивных детях.
- Не используй `useMediaQuery` JS-swap.

### 3. Токены — режим без Figma Variables (временно)
- Если в Figma пока нет Variables — хардкод hex и arbitrary values (`p-[13px]`, `text-[15.5px]`) **разрешён**.
- НО: если значение повторяется ≥3 раз внутри компонента — вынеси в локальную CSS-переменную в `@theme` блоке `src/index.css`.
- В отчёте Phase 2 выводи кандидатов в общий `@theme` после 2-3 компонентов.

### 4. TEXT в Figma = HTML, ВСЕГДА (banner/hero/overlay)
- Если в Figma есть TEXT-нода — рендерить как HTML (`<h1>`, `<p>` etc.). **Никогда не растеризовать в PNG.**
- Для banner/hero/card-with-overlay-text:
  1. `mcp__figma-mcp-go__scan_nodes_by_types({ types: ['TEXT'] })` → найти все text node ID.
  2. `mcp__figma-mcp-go__set_visible(ids, false)` → скрыть.
  3. `get_screenshot(frameId, scale=2)` → чистый фон.
  4. `set_visible(ids, true)` (try/finally) → восстановить.
  5. JSX: `<div className="relative">` + `<img>` фон + HTML text overlay.
- Без этого ломается i18n, accessibility, SEO.

### 5. Точные размеры из measurements.json — никаких догадок
- Перед JSX для любого элемента (иконки, toggles, badges, картинки) — читай width/height из `measurements.json`.
- **Canonical Tailwind class приоритетнее arbitrary value.** Tailwind v4 поддерживает дробные (`w-4.5` = 18px, `w-7.5` = 30px). Сначала canonical, fall back на `[Npx]` только если canonical класса нет.
- Маппинг: 4=w-1, 8=w-2, 12=w-3, 14=w-3.5, 16=w-4, 18=w-4.5, 20=w-5, 24=w-6, 28=w-7, 30=w-7.5, 32=w-8, 40=w-10, 44=w-11, 48=w-12, 64=w-16. Для 46/17/22 etc. — arbitrary `[Npx]`.
- В отчёте Phase 2 — аудит «JSX class → Figma size» для всех non-text элементов. MISMATCH = блокер.
- Обоснование: маленькие размерные ошибки иконок (4-6px) теряются в шуме text-AA → diff < target, но визуально неправильно.

### 5.5. Effects (glow/shadow/blur) — через CSS/Tailwind, не запекать в export
- Figma экспортирует иконки/элементы вместе с effect-bounds. Иконка 18×18 + 6px glow → файл 30×30 с маленьким телом в transparent canvas.
- В JSX `<img w-[30px]>` рендерит этот файл, тело иконки выглядит **меньше** относительно container'а.
- **Решение:** экспортировать только body (без effects), effects накладывать через Tailwind: `drop-shadow-[0_0_8px_rgba(255,85,8,0.5)]` (для img/svg), `shadow-[...]` (для div).
- measurements.json для каждой ноды должен содержать `boundingBox` (без effects, для размеров JSX), `renderBounds` (с effects, инфо), `effects[]` (для конвертации в Tailwind).

### 6. Hidden layers = мусор
- В Figma слой со «зачёркнутым глазиком» (`visible: false`) — мусор.
- Никогда не используй такие слои как источник данных.
- Видимая «недоделанная» версия — это и есть финальная.

### 7. shadcn/ui первичен (с оговоркой)
- Перед своим Button/Input/Card — проверь `src/components/ui/`.
- Если cva-варианты shadcn'а мешают точному воспроизведению (специфичные размеры, padding, border, custom bg) — пиши native JSX с явными классами. **Не насилуй cva.** Существующий ui/Button оставляй как есть.

### 8. Семантический HTML
- `<button>` для действий, `<a>` для навигации.
- `<header>`, `<main>`, `<nav>`, `<section>`, `<article>`, `<footer>` — где смысл подходит.
- `<h1>...<h6>` иерархично.
- Все интерактивные доступны с клавиатуры (focus-visible).

### 9. States и transitions (минимум)
- Если в Figma есть Component Variants `state=hover|active|disabled` — извлеки и сгенерируй `hover:`, `focus-visible:`, `active:`, `disabled:` Tailwind classes.
- Если variants нет — добавь `transition-colors duration-150` на интерактивные элементы (smart default) + shadcn-дефолтный focus-visible.
- Никаких сложных анимаций (drag, gesture, framer-motion) — out of scope.

### 10. TypeScript
- Все props типизированы и экспортированы через `type ComponentNameProps = {...}`.
- Никакого `any`, `as unknown`. Если нужен — объясни в комменте.
- React 19: предпочитай `use()` вместо useEffect для async, где применимо.

### 11. Запреты
- Никакого `position: absolute`, кроме модалок/тултипов/badge'ей.
- Никакого inline-style, кроме случаев когда значение из props.
- Никаких CSS-файлов помимо `src/index.css` без согласования.
- Никакого `!important`.
- Никаких `console.log` в финальном коде.
- Не редактируй `src/components/ui/*` без явной просьбы.

## Workflow для компонента из Figma

1. **Phase 1 — Extraction**: `temp-outputs/` через figma-mcp-go MCP. Если multi-bp — `temp-outputs/mobile/` + `temp-outputs/desktop/`.
2. **Review checkpoint**: краткое резюме данных + список потенциальных проблем. Жди «ок».
3. **Phase 2 — Implementation**: `<Name>.tsx`, прогон `pnpm tsc --noEmit && pnpm lint`. До зелёного билда не показывай.
4. **Phase 3 — Visual verification**: Playwright MCP screenshot + `pnpm diff`. Per breakpoint, если multi-bp.
5. **Phase 3.5 — Polish**: точечные правки по топ-регионам diff'а (см. Phase 3.5 каталог patches). Максимум 3 итерации.
6. **Cleanup**: переместить финальные актуал/референс/diff в `__visual-tests__/`, удалить `temp-outputs/`.

## Команды разработчика

| Команда | Что делает |
|---|---|
| `pnpm dev` | Запуск vite dev-сервера (port 5173) |
| `pnpm build` | Production билд |
| `pnpm exec tsc --noEmit` | TS type check |
| `pnpm lint` | ESLint |
| `pnpm dlx shadcn@latest add <name>` | Добавить shadcn-компонент |
| `pnpm diff --actual <p> --reference <p> --out <p> --width <px> --height <px>` | Pixel diff |

## Visual diff (`pnpm diff`)

Скрипт `scripts/diff.mjs` — переиспользуемая утилита. Стек: `sharp` (resize/crop + alpha-flatten) + `pixelmatch` (per-pixel) + `pngjs`. ImageMagick не нужен.

Флаги: `--actual`, `--reference`, `--out`, `--width`, `--height`, `--crop-actual-top` (опц.), `--threshold` (default 0.1).

## Если ты не уверен
- Спроси меня. Не угадывай.
- Покажи 2-3 варианта с разницей в подходе.
- Не делай «улучшений» дизайна по своему вкусу.
