# CLAUDE.md — правила pixel-perfect вёрстки (generic / unknown stack)

> Этот шаблон используется когда Profiler не смог точно определить стек (`framework: unknown`) или стек не входит в supported-матрицу (Vue without Vite, Solid, Qwik, etc.). Skill эскалирует «стек не поддержан, использовать best-effort?» — если пользователь соглашается, копируется этот файл как baseline. Затем пользователь дописывает stack-specific правила.

## Стек (заполняется пользователем)

- **Framework:** [Astro / Next / React+Vite / Vue / Svelte / etc — впиши обнаруженный]
- **Language:** [TypeScript / JavaScript]
- **Styling:** [Tailwind / CSS Modules / styled-components / etc]
- **UI library:** [shadcn / MUI / Mantine / Chakra / radix-bare / none]
- **Icon library:** [lucide / heroicons / tabler / etc]
- **Package manager:** [pnpm / npm / yarn / bun]
- **Алиасы пути:** [@/* → src/* / @/* → ./ / etc]

## Правила вёрстки

### 1. Pixel-perfect — цель
- ≤5% pixel diff против Figma reference (исключая текстовые регионы — там floor ~3-5% из-за rendering Figma vs Chrome).
- Двухфазный workflow: extract → review → generate → screenshot → diff.
- Не показывай креативность. Делай точно как в Figma.

### 2. Multi-breakpoint (mobile + desktop)
- Mobile-first: дефолтные классы для 375. Responsive префикс (`lg:`, `md:` и т.п. в Tailwind, или media-query в CSS) для 1920.
- Когда DOM-структуры разные — рендерим обе версии, скрываем CSS'ом (`display: none` / Tailwind `hidden`).
- Никакого JS-swap через `useMediaQuery` или эквивалент — ломает SSR в большинстве framework'ов.

### 3. TEXT в Figma = HTML, ВСЕГДА
- Текст в Figma → HTML (`<h1>`, `<p>` etc.). Никогда не растеризовать в PNG.
- Banner/hero/overlay-text: через MCP найти TEXT-узлы, временно скрыть через `set_visible`, screenshot фона, восстановить, в коде — `<div className="relative">` + `<img>` + HTML текст поверх.
- Без этого ломается i18n, accessibility, SEO. Подробно в `phase-2-implementation.md` секция «Text-aware asset extraction».

### 4. Hidden layers = мусор
- В Figma слой со «зачёркнутым глазиком» (`visible: false`) — мусор.
- Не используй такие слои как источник данных.

### 5. Семантический HTML
- `<button>` для действий, `<a>` для навигации.
- `<header>`, `<main>`, `<nav>`, `<section>`, `<article>`, `<footer>`.
- `<h1>...<h6>` иерархично.
- Все интерактивные доступны с клавиатуры (focus-visible).

### 6. States и transitions (минимум)
- Если в Figma есть Component Variants `state=hover|active|disabled` — извлеки и сгенерируй соответствующие CSS состояния.
- Если variants нет — `transition: color 0.15s, background-color 0.15s` на интерактивных + видимый focus-outline.
- Никаких сложных анимаций (drag, gesture, framer-motion и т.п.) — out of scope.

### 7. Токены
- Если в проекте есть design tokens (CSS Variables / Tailwind config) — используй их.
- Если нет (например, в Figma пока нет Variables) — хардкод **разрешён**, но повторы ≥3 раз внутри компонента вынеси в локальную CSS-переменную с понятным именем.

### 8. Существующий стиль проекта первичен
- Перед написанием с нуля — прочитай 1-2 существующих компонента в проекте.
- Скопируй export-стиль (named/default), props typing pattern, file header conventions.
- Если в проекте уже есть UI-library (shadcn/MUI/etc) — переиспользуй её компоненты.

### 9. Семантика и accessibility
- Все user-facing текст — в осмысленном HTML, не div-soup.
- Изображения с meaningful content — с `alt`. Декоративные — с `alt=""` или `aria-hidden="true"`.
- Интерактивные — keyboard-accessible.

### 10. Запреты
- Никакого `position: absolute`, кроме модалок/тултипов/badge'ей.
- Никакого inline-style, кроме случаев когда значение из props.
- Никаких новых CSS файлов без согласования (используй существующий стилевой entry-point).
- Никакого `!important`.
- Никаких `console.log` / debug-стейтментов в финальном коде.

## Workflow для компонента из Figma

1. **Phase 1 — Extraction**: `temp-outputs/` через figma-mcp-go MCP.
2. **Review checkpoint**: краткое резюме данных + список потенциальных проблем. Жди «ок».
3. **Phase 2 — Implementation**: компонент в форме обнаруженного стека, прогон typecheck + lint до зелёного.
4. **Phase 3 — Visual verification**: dev-сервер + Playwright + `pnpm diff`.
5. **Phase 3.5 — Polish**: точечные правки. Максимум 3 итерации.
6. **Cleanup**: `__visual-tests__/`, удаляем `temp-outputs/`.

## Команды разработчика (заполнить из profile.json)

| Команда | Что делает |
|---|---|
| `<commands.dev>` | Dev сервер |
| `<commands.build>` | Production build |
| `<commands.typecheck>` | Type check |
| `<commands.lint>` | Lint |
| `pnpm diff ...` | Pixel diff |

## Visual diff (`pnpm diff`)

Скрипт `scripts/diff.mjs` — переиспользуемая утилита. Стек: `sharp` (resize + alpha-flatten) + `pixelmatch` (per-pixel) + `pngjs`. ImageMagick не нужен.

Флаги: `--actual`, `--reference`, `--out`, `--width`, `--height`, `--crop-actual-top` (опц.), `--threshold` (default 0.1).

## Если ты не уверен

- Спроси меня. Не угадывай.
- Покажи 2-3 варианта с разницей в подходе.
- Не делай «улучшений» дизайна по своему вкусу.

---

> **Примечание:** этот файл — generic baseline. Перед началом работы с skill'ом рекомендуется заменить на stack-specific шаблон из `~/.claude/skills/figma-to-react-pixel-perfect/reference/claude-md-templates/` (react-vite-tailwind / next-app-router / astro), либо адаптировать generic под свой стек вручную.
