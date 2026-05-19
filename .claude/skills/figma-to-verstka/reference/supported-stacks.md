# Supported stacks matrix

Поддержка стеков по инкрементам skill'а. Цифры в колонках — целевая стабильность вёрстки на этом стеке.

## Легенда

- ✅ **Primary** — основной стек, тестируется регулярно, ожидаемый pixel-diff floor 4-6%.
- 🟢 **Supported** — хорошо работает, минорные расхождения возможны, ожидаемый floor 5-8%.
- 🟡 **Partial / best-effort** — работает на простых компонентах; на сложных эскалирует «стек поддержан частично, продолжать?». Floor может быть 8-15%.
- ❌ **Not supported** — skill отказывается работать, эскалирует пользователю.

## Frameworks × Increments

| Стек | I1 (Profiler detect) | I2 (single component) | I2.5 (multi-bp) | I3 (multi-comp) | I3.5 (modals) | I4 (decompose) | I4.5 (page multi-bp) | I5 (composer) | I6 (CLI) |
|---|---|---|---|---|---|---|---|---|---|
| **React + Vite + TS + Tailwind v4 + shadcn** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Next.js App Router + TS + Tailwind v4** | ✅ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| **Next.js Pages Router + TS + Tailwind** | ✅ | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| **Astro + Tailwind (+ React/Vue/Svelte islands)** | ✅ | 🟢 | 🟢 | 🟢 | 🟡 | 🟢 | 🟢 | 🟢 | 🟢 |
| **Remix + TS + Tailwind** | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | 🟡 |
| **Vue 3 + Vite + Tailwind** | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | 🟡 |
| **Nuxt 3 + Tailwind** | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | 🟡 | 🟡 | ❌ | 🟡 |
| **SvelteKit + Tailwind** | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | 🟡 | 🟡 | ❌ | 🟡 |
| **React + Vite + MUI/Mantine/Chakra** | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| **React + Vite + CSS Modules (no Tailwind)** | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| **React + Vite + styled-components** | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| **Pure HTML/CSS (no framework)** | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Что значит «partial / best-effort» в I2

- Skill сгенерирует код в форме обнаруженного стека (Vue SFC, Svelte component, MUI sx-prop'ы), но шаблон менее проверен → выше шанс tsc/lint падения после генерации.
- Polisher heuristics не оптимизированы под не-Tailwind подходы.
- Pixel-perfect floor может быть выше из-за того, что Implementer не знает framework-специфичных трюков (Vue scoped styles, Svelte tick(), и т.п.).
- Реакция skill'а: эскалация с предложением выбора («продолжать с best-effort или abort?»).

## Что значит ❌ в I3.5/I5

- Modals (I3.5): модалки требуют specific Dialog компонента из UI lib проекта (shadcn `<Dialog>`, MUI `<Modal>`). На неподдерживаемых стеках skill эскалирует или генерирует raw HTML5 `<dialog>`.
- Composer (I5): Page composition сильно framework-specific — особенно роутинг (Astro pages, Next App Router layouts, Remix nested routes). Без явного шаблона skill отказывается сборкой и оставляет компоненты доступными, но не Page.

## Расширение поддержки

После I6 матрица расширяется по запросу пользователей. Для нового стека добавляется:
1. Detection в `scripts/profile-project.mjs`.
2. Шаблон в `reference/claude-md-templates/<stack>.md`.
3. Шаблон компонента в `templates/component.<framework>.tmpl`.
4. Шаблон page-композиции в `templates/page.<framework>.tmpl` (если для I5).
5. Запись в эту матрицу.

## Что НЕ планируется (ever)

- Pure WebComponents / Lit без framework wrapper'а.
- Backbone, Knockout, jQuery — устаревшие стеки.
- Server-rendered Rails/Django/Laravel views — backend coupling out of scope.
- Mobile native (React Native, Flutter, SwiftUI, Jetpack Compose).
- Email HTML (другой rendering pipeline).

## Текущий primary тестовый стек

- `c:\Users\slava\Documents\Projects\Work\test_figma`
- React + Vite + React 19 + TS + Tailwind v4 + shadcn (new-york / neutral) + lucide-react + Euclid Circular A в public/fonts/.
- Достигнутые floor'ы: Header 4.35%, HelpCategories 1.54%.
- Любые улучшения skill'а в первую очередь проверяются на этом проекте.
