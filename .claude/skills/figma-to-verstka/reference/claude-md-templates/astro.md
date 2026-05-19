# CLAUDE.md — правила pixel-perfect вёрстки (Astro + Tailwind)

## Стек (фиксирован)

- Astro 5+
- Tailwind CSS v4 (через `@astrojs/tailwind` или `@tailwindcss/vite`)
- React/Vue/Svelte islands (если нужны)
- TypeScript
- pnpm как package manager
- Алиасы пути: `@/` → `src/`

## Структура папок

- `src/pages/` — file-based routing (`.astro` файлы).
- `src/layouts/` — layout-обёртки (`MainLayout.astro` и т.п.).
- `src/components/` — переиспользуемые компоненты.
  - `.astro` для full-static компонентов.
  - `.tsx`/`.vue`/`.svelte` для интерактивных islands.
- `src/components/ui/` — shadcn-аналоги если используются (через React island).
- `public/` — статические ассеты (logo.png, fonts/, etc.).

## Astro-специфика

### Static-by-default
Astro рендерит на сервере, отдаёт чистый HTML. **Без JS на клиенте по умолчанию** — это и есть astro-magic для pixel-perfect static sections.

### Islands (когда нужна интерактивность)
Если компонент **должен** иметь state/event handlers — заверни в React/Vue/Svelte и подключи как island:

```astro
---
import InteractiveModal from '@/components/InteractiveModal.tsx';
---
<InteractiveModal client:load />
```

`client:*` directives:
- `client:load` — hydrate сразу при загрузке страницы.
- `client:idle` — после load + idle.
- `client:visible` — когда виден в viewport (lazy).
- `client:media="(max-width: 768px)"` — только в условиях.

**Используй минимально.** Static-only `.astro` — pixel-perfect floor лучше из-за отсутствия hydration mismatch.

### Frontmatter
Между `---` (top of file) — серверный код: импорты, fetch, props.
Body — markup (HTML + JSX-like).

```astro
---
import { Image } from 'astro:assets';
const { title } = Astro.props;
---
<header class="flex items-center">
  <h1>{title}</h1>
</header>
```

## Правила вёрстки

### 1. Pixel-perfect — цель
- ≤5% pixel diff против Figma reference.
- Двухфазный workflow extract → review → generate → screenshot → diff.

### 2. Multi-breakpoint (mobile + desktop)
- Mobile-first: дефолтные Tailwind классы для 375. `lg:` для 1920.
- Разные DOM — обе версии в `.astro` файле, скрываем `hidden`/`lg:hidden`.
- Никакого `useMediaQuery` (no client JS).

### 3. Токены — режим без Figma Variables
- Хардкод hex и arbitrary values разрешены.
- Повторяющиеся ≥3 раз — в `@theme` блок `src/styles/global.css`.

### 4. TEXT в Figma = HTML, ВСЕГДА
- Текст в Figma → HTML (`<h1>`, `<p>` etc.). Никогда не растеризовать в PNG.
- Banner/hero/overlay-text: `scan_nodes_by_types({types:['TEXT']})` → `set_visible(ids,false)` → screenshot → `set_visible(ids,true)` (try/finally) → `<div class="relative">` + `<img>` фон + HTML текст поверх.
- Без этого ломается i18n, accessibility, SEO. Подробно в `phase-2-implementation.md`.

### 5. Hidden layers = мусор

### 6. Ссылки — нативный `<a>`
В Astro нет `<Link>` (как в Next). Просто `<a href="/about">О нас</a>` — Astro автоматически делает client-side navigation в SPA-mode (если включён) или full reload (default).

### 7. Изображения — `astro:assets` (рекомендую)
```astro
---
import { Image } from 'astro:assets';
import heroImg from '@/assets/hero.png';
---
<Image src={heroImg} alt="" loading="lazy" />
```
Даёт автоматический optimization без сторонних либ.

Альтернатива — обычный `<img src="/assets/hero.png">` если в `public/`.

### 8. Шрифты — fontsource или local woff2
- `pnpm add @fontsource/inter` → `import '@fontsource/inter/400.css';` в layout.
- Или `@font-face` в `src/styles/global.css` если файлы в `public/fonts/`.

### 9. Семантический HTML
Те же правила: `<header>`, `<main>`, `<nav>`, `<section>`, `<button>`/`<a>` правильно.

### 10. States и transitions (минимум)
- Если в Figma есть Component Variants — генерируй `hover:`, `focus-visible:`, `active:`.
- Smart default: `transition-colors duration-150` на интерактивных.
- В чистых `.astro` без islands hover/focus всё равно работают через CSS — JS не нужен.

### 11. Запреты
- Никакого `position: absolute` кроме модалок/тултипов.
- Никаких CSS-файлов помимо `src/styles/global.css` без согласования.
- Никакого `client:*` без явной потребности (sticking к static-only).

## Workflow для компонента из Figma

1. **Phase 1 — Extraction**: `temp-outputs/` через figma-mcp-go.
2. **Phase 2 — Implementation**:
   - Решаем формат: `.astro` (static, дефолт) или `.tsx`/`.vue` (если interactive).
   - Создаём `src/components/<Name>/<Name>.astro`.
   - Импорт в `src/pages/_preview.astro`.
3. **Phase 3 — Visual verification**: `pnpm dev` → Playwright на `/_preview` → diff.
4. **Phase 3.5 — Polish**.
5. **Cleanup**.

## Команды разработчика

| Команда | Что делает |
|---|---|
| `pnpm dev` | Astro dev (port 4321) |
| `pnpm build` | Static build → `dist/` |
| `pnpm exec astro check` | Type check (Astro-aware) |
| `pnpm preview` | Preview built site |
| `pnpm diff ...` | Pixel diff |

## Если ты не уверен
- Спроси прежде чем добавлять `client:*`.
- Спроси если непонятно `.astro` vs `.tsx` для island'а.
- Не делай «улучшений» дизайна по своему вкусу.
