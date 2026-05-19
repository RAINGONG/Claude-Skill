# CLAUDE.md — правила pixel-perfect вёрстки (Next.js App Router + Tailwind)

## Стек (фиксирован)

- Next.js 15+ (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (через @tailwindcss/postcss)
- shadcn/ui (style: new-york)
- lucide-react для иконок
- pnpm как package manager
- Все алиасы пути: `@/` → `./` (next.js convention)

## Структура папок

- `app/` — file-based routing.
  - `app/<route>/page.tsx` — Server Component страницы.
  - `app/<route>/layout.tsx` — Layout этой ветки.
  - `app/_preview/page.tsx` — preview-render для Verifier во время вёрстки.
- `components/ui/` — shadcn-компоненты, не редактировать.
- `components/<Feature>/` — компоненты экранов (feature-based).
- `components/modals/` — Dialog-обёртки.
- `lib/utils.ts` — `cn()`.
- `messages/` или `locales/` — i18n locale-файлы (если используется).

## Server vs Client components — главная специфика App Router

- **Дефолт = Server Component.** Никаких `'use client'`, никаких хуков, можно прямые `await fetch()`.
- **Добавь `'use client'` ТОЛЬКО если** компоненту нужны:
  - useState / useReducer / useEffect / useRef.
  - Event handlers (onClick, onChange и т.п.).
  - Browser-only API (window, document, localStorage).
  - Context providers/consumers.
- Pixel-perfect Header / Hero / static sections — обычно Server Components.
- Modals, interactive forms, dropdowns — Client Components.

## Правила вёрстки

### 1. Pixel-perfect — цель
- ≤5% pixel diff против Figma reference.
- Двухфазный workflow extract → review → generate → screenshot → diff.
- Не показывай креативность.

### 2. Multi-breakpoint (mobile + desktop)
- Mobile-first: дефолтные классы для 375. `lg:` для 1920.
- Разные DOM — обе версии в коде, скрываем `hidden`/`lg:hidden`.
- Никакого `useMediaQuery` JS-swap (ломает SSR в Next App Router).

### 3. Токены — режим без Figma Variables
- Хардкод hex и arbitrary values разрешены.
- Повторяющиеся ≥3 раз — в `@theme` блок `app/globals.css`.

### 4. TEXT в Figma = HTML, ВСЕГДА
- Текст в Figma → HTML (`<h1>`, `<p>` etc.). Никогда не растеризовать в PNG.
- Banner/hero/overlay-text: `scan_nodes_by_types({types:['TEXT']})` → `set_visible(ids,false)` → screenshot → `set_visible(ids,true)` (try/finally) → JSX `<div className="relative">` + `<img>` фон + HTML текст поверх.
- Без этого ломается i18n, accessibility, SEO. Подробно в `phase-2-implementation.md` секция «Text-aware asset extraction».

### 5. Hidden layers = мусор
- Скрытые в Figma слои игнорируй.

### 6. Внутренние ссылки → `next/link`
```tsx
import Link from 'next/link';
<Link href="/about">О нас</Link>
```
Не используй `<a>` для внутренних роутов.

### 7. Изображения → `next/image` (опционально)
Для иллюстраций можно использовать `<Image />` от Next.js — даёт автоматический optimization (webp/avif), lazy loading, sizes.

```tsx
import Image from 'next/image';
<Image src="/help-categories/category-01.png" alt="" width={702} height={644} loading="lazy" />
```

Однако для pixel-perfect verification обычный `<img>` иногда проще (нет optimization → точнее матчинг с Figma). Решает Implementer по контексту.

### 8. Шрифты → `next/font`
Если возможно (а не `local-woff2` в `public/fonts/`) — `next/font/local` для собственных, `next/font/google` для Google.

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ru" className={inter.className}><body>{children}</body></html>;
}
```

Если шрифты в `public/fonts/` — `@font-face` в `app/globals.css`.

### 9. Семантический HTML, States, TypeScript, Запреты
Те же правила что и в react-vite-tailwind.md (см. полный список там).

## Workflow для компонента из Figma

1. **Phase 1 — Extraction**: `temp-outputs/` через figma-mcp-go.
2. **Phase 2 — Implementation**:
   - `components/<Name>/<Name>.tsx`.
   - Решаем server vs client. Если useState/onClick/useEffect — `'use client';` в первой строке.
   - Импорт в `app/_preview/page.tsx`.
3. **Phase 3 — Visual verification**: `pnpm dev` → Playwright на `/_preview` → diff.
4. **Phase 3.5 — Polish**: точечные правки.
5. **Cleanup**: `__visual-tests__/`, удаляем `temp-outputs/`.

## Команды разработчика

| Команда | Что делает |
|---|---|
| `pnpm dev` | Next dev (port 3000) |
| `pnpm build` | Production build |
| `pnpm exec tsc --noEmit` | TS type check |
| `pnpm lint` | next lint / eslint |
| `pnpm dlx shadcn@latest add <name>` | shadcn компонент |
| `pnpm diff ...` | Pixel diff (см. scripts/diff.mjs) |

## Если ты не уверен
- Спроси меня. Не угадывай server vs client.
- Не делай «улучшений» дизайна по своему вкусу.
