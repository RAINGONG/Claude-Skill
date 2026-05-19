# Post-refinement — augmented prompt + правила пост-обработки

Здесь — шаблон prompt'а который skill инжектит при вызове `figma:figma-implement-design`, плюс правила, как причёсывать вывод Figma's skill под conventions проекта.

---

## 1. Augmented prompt template

После того как `scripts/profile-project.mjs` создал `profile.json`, skill собирает следующий блок и **передаёт его как user-message при вызове `figma:figma-implement-design`** (через Skill tool). Подстановки `<...>` заполняются из `profile.json`.

```
## Project context (auto-detected — соблюдай)

- Framework:      <framework> <frameworkVersion>
- Language:       <language>          # ts / js
- Package mgr:    <packageManager>
- Styling:        <styling.approach> <styling.tailwindVersion>
- UI library:     <styling.uiLibrary>            # shadcn / mui / mantine / chakra / radix-bare / null
- Icon library:   <iconLibrary>                  # lucide / heroicons / tabler / null
- Components dir: <fileStructure.componentsDir>
- Subfolder:      <fileStructure.componentSubfolders>     # flat / feature-based / feature-with-index / atomic
- Naming:         <fileStructure.namingConvention>        # PascalCase / kebab-case / camelCase
- Path alias:     @/ → src/
- Fonts:          <fonts.approach> @ <fonts.fontFiles>
- i18n:           <i18n.enabled ? i18n.library : 'none'>  # если enabled — текст ОБЯЗАТЕЛЬНО в JSX
- Link component: <conventions.linkComponent>             # next-link / astro-anchor / react-router-link / anchor
- Props typing:   <conventions.propsTyping>               # type / interface
- Export style:   <conventions.componentExportStyle>      # named / default
- Routing:        <routing.approach> @ <routing.pageDirectory>
- Sample comp:    <examples.existingComponentPath>        # для миметизма стиля
- TS check cmd:   <commands.typecheck>
- Lint cmd:       <commands.lint>
- Dev cmd:        <commands.dev>

## IMPORTANT rules (strict — ни один не нарушать)

1. **TEXT в Figma → HTML, всегда.** Любая нода type=TEXT превращается в `<h1>`/`<h2>`/`<h3>`/`<p>`/`<span>`. НИКОГДА не запекать текст в `<img>`. Это требование i18n.
2. **UI элементы → HTML+CSS, никогда `<img src="*.png">`.** Chip / badge / button / toggle / pill / input / card / dialog — это HTML с Tailwind классами. Картинками рендерить можно ТОЛЬКО photo / illustration / decorative shape.
3. **Effects через Tailwind classes.** drop-shadow / shadow / glow / blur / backdrop-blur / inner-shadow — все через Tailwind utilities (включая arbitrary `drop-shadow-[0_4px_12px_rgba(...)]`). НИКОГДА не запекать тень в PNG.
4. **Маски и overlay-слои → отдельные JSX элементы с z-index.** Если в Figma есть mask group или overlay-композиция — render каждый слой отдельным `<div>`/`<img>` и используй абсолютное позиционирование + z-index. НЕ flatten в одну картинку, если только это не цельная иллюстрация.
4a. **Z-order overlay-слоёв ДОЛЖЕН точно совпадать с Figma.** Когда несколько перекрывающихся слоёв (chip над фотом, decoration над gradient bg, иконка-glow над иконкой) — в JSX сохрани ту же последовательность, что в Figma children array (0 = bottom, N = top). Если используешь `position: absolute` + `z-N` — явные z-классы (z-0/z-10/z-20/z-30), не полагайся на DOM order. Невидимая регрессия: chip оказывается ПОД фотом вместо над ним.
4b. **Blend modes preserved.** Если у ноды Figma `blendMode != "NORMAL" / "PASS_THROUGH"` — render с соответствующим Tailwind class:
   - `MULTIPLY` → `mix-blend-multiply`
   - `SCREEN` → `mix-blend-screen`
   - `OVERLAY` → `mix-blend-overlay`
   - `DARKEN` → `mix-blend-darken` / `LIGHTEN` → `mix-blend-lighten`
   - `COLOR_DODGE` → `mix-blend-color-dodge` / `COLOR_BURN` → `mix-blend-color-burn`
   - `HARD_LIGHT` → `mix-blend-hard-light` / `SOFT_LIGHT` → `mix-blend-soft-light`
   - `DIFFERENCE` → `mix-blend-difference` / `EXCLUSION` → `mix-blend-exclusion`
   - `HUE` / `SATURATION` / `COLOR` / `LUMINOSITY` → `mix-blend-{value}`
   Ассет должен быть transparent PNG (без white background), иначе blend не сработает.
5. **Иконки.**
   - Если icon-library `lucide` / `heroicons` / `tabler` / `phosphor` подключена — используй её. Подбери ближайшую иконку по форме (chevron, x, plus, arrow-right и т.п.).
   - Если иконка нестандартная (логотип, custom shape) — **inline SVG в JSX**, не `<img src="*.svg" />`. Это даёт recolor через `currentColor`, лучше grouping/sizing, меньше runtime weight. БЕЗ `<filter>` / без baked drop-shadow внутри SVG — тень делать через Tailwind `drop-shadow-*` на родительском элементе.
6. **Картинки/фото/иллюстрации/decorative shapes → PNG в `public/<feature>/<slug>.png`.** Имя slug в kebab-case. Транспарент-PNG (без бэкграунда) предпочтительно для декоративных элементов.
7. **Семантический HTML.** `<header>` / `<main>` / `<section>` / `<nav>` / `<button>` / `<a>` — где смысл подходит. Никаких `<div onClick>` для кликабельного.
8. **shadcn-first** (если `uiLibrary=shadcn`). Перед созданием своего Button/Input/Card/Dialog — смотри `<componentsDir>/ui/`. Если есть — используй и расширяй через `cn()`. Если нет — добавить через `pnpm dlx shadcn@latest add <name>` (не писать с нуля).
9. **Размеры через canonical Tailwind > arbitrary `[Npx]`** (см. таблицу маппинга ниже).
10. **Mobile-first.** Default classes = mobile (375px baseline). Префикс `lg:` для desktop (≥1024px). Никакого desktop-first каскада с overrides.
11. **TypeScript** (если `language=ts`): все props типизированы и экспортированы. Никакого `any`, `as unknown`. `<propsTyping>` keyword (type или interface).
12. **Запреты.**
    - `position: absolute` кроме модалок/тултипов/overlay-слоёв.
    - Inline-style кроме случаев когда значение из props.
    - `console.log` в финальном коде.
    - Редактировать `<componentsDir>/ui/*` (shadcn auto-generated).

## Output expectations

- File: `<componentsDir>/<Name>/<Name>.<ext>` (feature-based folder per component, ext = `.tsx`/`.jsx`/`.vue`/`.astro`/`.svelte` по framework).
- Imports через `@/` alias.
- Assets pre-downloaded в `public/<kebab-slug-of-feature>/`.
- Code passes `<commands.typecheck>` + `<commands.lint>` без ошибок.

## Multi-breakpoint guidance (только если переданы оба URL)

- Mobile URL: `<mobile-url>`
- Desktop URL: `<desktop-url>`
- Generate ОДИН компонент, mobile-first:
  - Default classes = mobile (375px).
  - `lg:` prefix для desktop (1920px).
  - Если разные DOM (hamburger vs inline nav) — render обе версии, скрытие через `hidden` / `lg:hidden`.
  - На скрытом блоке: `aria-hidden="true"` + `tabIndex={-1}`.
  - Никакого `useMediaQuery` / JS-based responsive — только CSS.
```

После заполнения подстановок — передать как input в `Skill(skill="figma:figma-implement-design", args=...)` либо как text-prefix к URL'у в args.

---

## 2. Post-refinement правила (после возврата Figma's skill)

Идём по сгенерированному коду и применяем точечные refactors. Каждый refactor — атомарный edit. Не «переписывать всё».

### 2.1. File paths / structure

- Если Figma вернула `src/components/Hero.tsx` (flat), а profile говорит `feature-based` → создать `<componentsDir>/Hero/Hero.tsx` и обновить импорты.
- Если профиль `feature-with-index` → дополнительно создать `<componentsDir>/Hero/index.ts` с `export * from './Hero';`.
- Имя файла = имя компонента в `<namingConvention>`.

### 2.2. Иконки → lucide-react / heroicons / tabler

Если `iconLibrary` ≠ null и Figma вернула inline `<svg>` — попытайся узнать иконку по форме / size 24×24. Маппинг типичных:

| Forma SVG                            | lucide-react        | heroicons       |
| ------------------------------------ | ------------------- | --------------- |
| Chevron вниз                         | `<ChevronDown />`   | `ChevronDown`   |
| Chevron вправо                       | `<ChevronRight />`  | `ChevronRight`  |
| X / close                            | `<X />`             | `XMark`         |
| Plus                                 | `<Plus />`          | `Plus`          |
| Arrow right                          | `<ArrowRight />`    | `ArrowRight`    |
| Search (лупа)                        | `<Search />`        | `MagnifyingGlass` |
| Menu (3 линии)                       | `<Menu />`          | `Bars3`         |
| Heart                                | `<Heart />`         | `Heart`         |
| Star                                 | `<Star />`          | `Star`          |
| Check                                | `<Check />`         | `Check`         |

Размер передаём через `className="w-<n> h-<n>"` (см. canonical mapping). Если форма нестандартная (логотип, custom) — оставить inline SVG, удалить любые `<filter>` / `feDropShadow` (тень делать через Tailwind на родителе).

### 2.3. shadcn компоненты (если `uiLibrary=shadcn`)

Если Figma вернула raw элементы, заменить на shadcn-эквивалент:

| Raw                                                            | shadcn                                          | Когда применять                                          |
| -------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| `<button class="bg-primary text-white px-4 py-2 rounded">`     | `<Button>`                                       | Любой clickable rectangular CTA                          |
| `<button class="border bg-transparent ...">`                   | `<Button variant="outline">`                     | Outlined button                                          |
| `<button class="hover:bg-accent ...">`                         | `<Button variant="ghost">`                       | Text-only / ghost button                                 |
| `<input class="border rounded px-3 py-2 ...">`                 | `<Input>`                                        | Text input                                               |
| `<label class="text-sm font-medium ...">`                      | `<Label>`                                        | Form label                                               |
| `<div class="rounded-lg border bg-card p-6 ...">`              | `<Card><CardContent>...</CardContent></Card>`    | Card container                                           |
| Native `<dialog>` или модалка с overlay                        | `<Dialog>`                                       | Modal / overlay                                          |
| `<div role="checkbox">` или `<input type="checkbox">`          | `<Checkbox>`                                     | Checkbox                                                 |
| Toggle switch                                                  | `<Switch>`                                       | On/off toggle                                            |

**Правило:** если raw классы совпадают по семантике с shadcn-компонентом из `<componentsDir>/ui/` — заменить. Не править `<componentsDir>/ui/*` файлы.

### 2.4. Asset paths

- Figma's skill возвращает иллюстрации как `localhost:figma-export-...` URLs. Скачать каждый через Figma's MCP tool (`get_image` или эквивалент). Сохранить в `public/<feature-slug>/<image-slug>.<ext>` где `<ext>` определяется по **реальному content** (см. 2.4.1).
- Заменить `src="localhost:..."` на `src="/<feature-slug>/<image-slug>.<ext>"`.
- Slug = kebab-case от имени Figma-ноды (e.g. `WomanWithCard` → `woman-with-card`).

### 2.4.1. Asset format detection — content-sniff обязателен

**НЕ доверять URL-extension**. Figma's MCP периодически отдаёт SVG bytes под URL'ом с `.png` (или наоборот). Если сохранить как `.png` файл что в действительности SVG — браузер либо рендерит чёрный квадрат, либо вообще ничего, либо `naturalWidth=0`.

Workflow на КАЖДЫЙ asset:

1. **Скачать bytes** (binary safe — не decode как text).
2. **Sniff первые ~16 байт magic numbers:**
   - `\x89PNG\r\n\x1a\n` (8 bytes) → PNG
   - `\xff\xd8\xff` → JPEG
   - `GIF87a` / `GIF89a` → GIF
   - `RIFF....WEBP` (bytes 0-3 = RIFF, bytes 8-11 = WEBP) → WebP
   - `\x00\x00\x00 ftypavif` или `\x00\x00\x00.ftypavif` → AVIF
   - `<?xml` или `<svg` (после optional UTF-8 BOM `\xef\xbb\xbf`) → SVG
   - `\x1f\x8b` → gzip-compressed (часто SVGZ — gunzip → SVG)
3. **Сохранить с правильным extension** на основе sniff'а, НЕ URL.
4. **Если SVG content** — НЕ использовать как `<img src="*.svg" />` для UI-icons. Inline в JSX:
   ```tsx
   // Вместо <img src="/feature/chevron.svg" />
   function ChevronIcon({ className }: { className?: string }) {
     return (
       <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
         <path d="..." />
       </svg>
     )
   }
   ```
   Если SVG — декоративная иллюстрация (не icon) — `<img src="*.svg" />` ок.
5. **Если PNG/JPEG/WebP** — `<img src="/feature/<slug>.<ext>" />`.

**Запрет:** сохранить как `.png`, потом обнаружить через runtime check (naturalWidth=0) и переименовать `.png → .svg`. Это создаёт corrupted файлы (особенно если переименовали binary PNG в SVG из-за false positive). Делай sniff ПЕРЕД save, один раз.

Helper-snippet для агента (Node):

```js
function detectFormat(bytes) {
  const b = bytes.subarray(0, 16);
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'gif';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  if (b[0] === 0x1f && b[1] === 0x8b) return 'gzip'; // probably SVGZ — gunzip first
  // SVG: text-based, may have BOM
  const text = bytes.subarray(0, 256).toString('utf8').trimStart();
  if (text.startsWith('<?xml') || text.startsWith('<svg')) return 'svg';
  return 'unknown';
}
```

### 2.5. Размеры → canonical Tailwind

Карта arbitrary `[Npx]` → canonical Tailwind v4 (имеет fractional spacing):

```
4   → w-1 / h-1                  18 → w-4.5 / h-4.5
8   → w-2 / h-2                  20 → w-5 / h-5
10  → w-2.5 / h-2.5              24 → w-6 / h-6
12  → w-3 / h-3                  28 → w-7 / h-7
14  → w-3.5 / h-3.5              30 → w-7.5 / h-7.5
16  → w-4 / h-4                  32 → w-8 / h-8
                                 36 → w-9 / h-9
                                 40 → w-10 / h-10
                                 44 → w-11 / h-11
                                 48 → w-12 / h-12
                                 56 → w-14 / h-14
                                 64 → w-16 / h-16
                                 80 → w-20 / h-20
                                 96 → w-24 / h-24
```

Padding/margin/gap — те же spacing tokens (`p-1` = 4px, `p-4.5` = 18px, `gap-2` = 8px). Если значение не в каноне (например 13px, 22px) — оставить arbitrary `[13px]`. Это нормально.

**Tailwind v3 (без fractional):** `w-4.5` нет, использовать `w-[18px]`. Skill смотрит на `styling.tailwindVersion`.

### 2.6. Имена / экспорт

- Component name = PascalCase (если `namingConvention=PascalCase`).
- Export style = `<conventions.componentExportStyle>`:
  - `named` → `export function Hero() {...}`
  - `default` → `export default function Hero() {...}`
- Props type/interface → следовать `<conventions.propsTyping>`.

### 2.7. Routing / page integration (только в `page` mode)

Когда верстаем целую страницу — после генерации компонента странички, прописать routing:

- **next-app:** `app/<slug>/page.tsx` с `import { <Page> } from '@/components/pages/<Page>/<Page>'; export default function() { return <<Page> />; }`
- **next-pages:** `pages/<slug>.tsx` аналогично.
- **astro:** `src/pages/<slug>.astro` с `<Layout>...<Page client:load /></Layout>`.
- **react-vite:** добавить `<Route path="/<slug>" element={<Page />} />` в `App.tsx`.

### 2.8. Mobile-first responsive merge (Step 3)

Когда переданы 2 URL (mobile + desktop), Figma's skill вызывается дважды (или пользователь должен дать два frame'а в одном вызове — TBD). После двух выводов skill structurally diff'ит код:

- **Common elements** (есть в обоих): mobile-first классы + `lg:` overrides только для размеров/gaps если они отличаются.
- **Только в mobile** (hamburger menu): добавить `lg:hidden`.
- **Только в desktop** (inline nav): `hidden lg:flex`.
- На скрытых блоках: `aria-hidden="true"` + `tabIndex={-1}`.
- Никакого `useMediaQuery`.

Подробнее — `reference/multi-breakpoint-merge.md` (появится на Step 3).

---

## 3. Post-refinement self-validation

После всех refactors — прогнать:

```bash
<commands.typecheck>   # должен быть exit 0
<commands.lint>        # должен быть exit 0
node <projectRoot>/scripts/validate-no-baked-ui.mjs --component <Name>
```

Если что-то падает — self-fix макс 3 итерации. На 4-й — escalate с error log'ом.

`validate-no-baked-ui.mjs` грепает сгенерированный код, fail'ит если UI-имена (chip/badge/button/toggle/pill) встречаются в `<img src="*.png">`. С Figma's skill это срабатывать НЕ должно — Figma рендерит UI как HTML. Если сработало — баг в рефайне или Figma вернула неожиданное.

---

## 4. Чего НЕ делать

- **Не переписывать вывод Figma's skill «с нуля».** Только targeted refactors по правилам выше.
- **Не править файлы внутри `<componentsDir>/ui/`** — они auto-generated shadcn.
- **Не добавлять собственные «улучшения»** дизайна (CTA отступы, цвета). Pixel-perfect, не «креативная интерпретация».
- **Не переименовывать SVG icon если она уже узнаваемая lucide.** Если Figma уже отдала `<ChevronDown />` — не трогай.
- **Не запускать post-refinement до того как Figma's skill завершился.** Сначала ждать его output, потом рефайнить.
