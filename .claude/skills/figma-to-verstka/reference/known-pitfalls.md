# Known pitfalls

Короткий каталог реальных проблем, которые остаются даже когда `figma:figma-implement-design` отрабатывает корректно. Все остальные проблемы (запекание UI, потеря effects, отсутствующие masks) при правильно работающем Figma's skill НЕ должны возникать — если возникают, это баг в pre-prompt augmentation или в pose-refinement, не в Figma.

## 1. Text anti-aliasing на скриншотах

**Симптом:** diff показывает 2-4% расхождения, и diff.png подсвечен по контурам букв.

**Причина:** браузер рисует текст с ОС-специфичным subpixel-AA (DirectWrite на Windows, CoreText на macOS). Figma экспорт использует свой rasterizer. Расхождения по контурам букв — норма.

**Как обращаться:** не пытаться добиться 0%. Цель ≤5% (иногда ≤7% если много текста). Если текстовые регионы — единственное расхождение, считай passed.

**Mitigation (если нужно):** в `pnpm diff` поднять `--threshold` до 0.15 (default 0.1). Это переносит толерантность для AA-пикселей.

## 2. Sub-pixel borders / 1px artifacts

**Симптом:** граница 1px иногда даёт 2px diff на конкретных DPI / scale.

**Причина:** half-pixel positioning + AA. Если Figma frame на `x: 100.5` или `width: 199.5`, browser округляет, экспорт другой rasterizer.

**Mitigation:** redesign в Figma на integer pixel grid (попросить дизайнера). Или принять как noise.

## 3. Custom fonts отсутствуют в `public/fonts/`

**Симптом:** компонент рендерится с fallback-шрифтом (Times / system-ui), diff > 30%.

**Причина:** Figma использует custom font (например Euclid Circular A), а в проекте его нет в `public/fonts/`.

**Action:** Phase 0 escalate пользователю:
> «Figma использует font Euclid Circular A. В `public/fonts/` его нет. Загрузи woff2 файлы вручную или используй Inter как fallback (diff будет ~10% из-за font metrics)».

Skill должен прочитать `profile.fonts.fontFiles`, проверить наличие font-family из Figma, иначе ask.

## 4. Element-locator picks больше, чем элемент

**Симптом:** Playwright `browser_take_screenshot` element-locator'ом захватил соседний элемент или обрезал свой.

**Причина:** селектор подбирает не то, или элемент имеет shadow, выходящий за `boundingBox`.

**Mitigation:**
- Использовать data-attribute (`data-component="<Name>"`) для надёжного селектора. Skill должен инжектить его в root компонента.
- Сделать viewport screenshot + crop через sharp по координатам (если diff падает на 100% — проверь что actual.png имеет правильный crop region).
- В `pnpm diff` использовать `--crop-actual-top <px>` если viewport был выше компонента.

## 5. Локальные ассеты не доступны в `pnpm dev`

**Симптом:** в браузере 404 на `/feature/woman.png`. В DOM `<img src="/feature/woman.png" />`.

**Причина:** файл не в `public/<feature>/` (Vite сервит только из `public/`).

**Action:** проверить что post-refinement скачал асет в `public/<feature>/<slug>.png`, не в `src/assets/...`. Если случайно положил в src — переместить.

## 6. shadcn `<Button>` не повторяет точно raw Figma button

**Симптом:** заменили raw `<button>` на `<Button>`, но визуал отличается (другой radius, padding, hover).

**Причина:** `<Button variant="default">` имеет жёстко прописанные styles в `<componentsDir>/ui/button.tsx`. Если Figma даёт нестандартный padding (например `px-6 py-3.5`) — нужно `variant="ghost"` + `className` override через `cn()`.

**Action:** если match не точный — НЕ редактировать `<componentsDir>/ui/button.tsx`, а:
1. Использовать `variant="ghost"` или `variant="outline"` как basic.
2. Override через `className="..."` в caller.
3. Если нужен сильно кастомный вариант — добавить новый variant в `button.tsx` через `cva` (это редкий случай).

## 7. Figma-export PNG имеет transparent gaps

**Симптом:** diff визуально выглядит correct, но % большой; diff.png показывает «ореолы» по краям иллюстраций.

**Причина:** Figma экспортирует transparent gaps на кромках, browser screenshot opaque (composited на белый фон).

**Mitigation:** `pnpm diff` по умолчанию делает alpha-flatten на белый. Если он отключён через `--no-flatten` — включи обратно. Это уже built-in в `scripts/diff.mjs`.

## 8. Mobile-first responsive: hidden / lg:hidden не работает на breakpoint edge

**Симптом:** на 1024px (точка breakpoint'а) виден ОБА варианта (mobile menu + desktop nav), либо ни один.

**Причина:** Tailwind `lg:` breakpoint = `min-width: 1024px`. На 1023.5px показывается mobile, на 1024px desktop. На точно 1024 поведение зависит от CSS rounding.

**Action:** не паниковать на edge cases. Тестировать на 375 (mobile) и 1280+ (desktop). Если требуется чёткий cut-off — изменить breakpoint в Tailwind config (это design decision).

## 9. Skill вернул JSX но не скачал ассеты

**Симптом:** `<img src="localhost:figma-export-..." />` в коде, но файлов в `public/` нет.

**Причина:** Figma's skill завершился до того как ассеты были скачаны (или auth token expired в середине вызова).

**Action:** post-refinement обязан грепать `localhost:` URLs в коде, для каждого вызывать `mcp__plugin_figma_figma__get_image` (или эквивалент), сохранять в `public/<feature>/<slug>.png`, заменять src. Это не optional.

## 10. Blend mode потерян → белый фон вместо blending

**Симптом:** иллюстрация / decoration в Figma выглядит naturally вписанной (тень, тон сливается с фоном), а в браузере — белый прямоугольник или резкий контраст.

**Причина:** у ноды в Figma blendMode = `MULTIPLY` / `OVERLAY` / `SCREEN` / другой non-NORMAL, при export'е в PNG Figma не запекает blend (он применяется на canvas во время render'а). Skill (или Figma's skill) не добавил соответствующий `mix-blend-*` Tailwind class.

**Action:**
- Перед save'ом — посмотреть в Figma node data поле `blendMode`. Если != `NORMAL` / `PASS_THROUGH` — добавить `mix-blend-multiply` (или соответствующий) на JSX элемент.
- Ассет должен быть **transparent PNG** (Figma export бывает flatten'ит на белый — проверить альфа-канал; если нет, скачать с явным `format=PNG, transparent=true` параметром если поддерживается).
- Маппинг Figma blendMode → Tailwind class — см. правило 4b в `post-refinement.md`.

**Воспроизведение:** AudienceSection (PayoutsSection-related), компонент с фото женщины над gradient bg — белый фон вокруг фигуры остался, потому что не применился `mix-blend-multiply` на shadow-слое.

## 11. SVG bytes под URL'ом с .png → corrupted asset

**Симптом:** иконки рендерятся как чёрные квадраты / пустые / размытые квадратные blob'ы. В DOM `<img src="/feature/icon-x.png" />` или `.svg`. Файл существует но visual broken.

**Причина:** Figma's MCP `get_image` иногда отдаёт SVG bytes под URL'ом который выглядит как `*.png`. Если skill доверился URL extension и сохранил как `.png` — файл в действительности SVG content в файле с PNG-расширением. Браузер видит магические байты `<svg>`/`<?xml` в `.png` файле — рендер varies (Chrome иногда parses SVG anyway, но часто 0×0).

Хуже: skill детектит проблему через runtime (naturalWidth=0) и **переименовывает `.png` → `.svg` POST-FACTUM**. Если оригинал был binary corrupted bytes (или skill случайно зацепил false positive — реальный PNG со странными метаданными) — после rename получаем `.svg` файл который не валидный SVG.

**Action:**
- Sniff content **перед save**. Алгоритм + magic numbers — см. правило 2.4.1 в `post-refinement.md`.
- Save с правильным extension с первой попытки.
- Никогда не делать «save → detect via runtime → rename»: это создаёт corrupted файлы.
- Для SVG content (особенно icon'ы): inline в JSX, не `<img src="*.svg" />`. Это даёт recolor + меньше runtime weight.

**Воспроизведение:** PayoutsSection — 6 иконок были SVG bytes под `.png` URL'ами. Skill сохранил как PNG, потом renamed в SVG, иконки стали «ужасными» (визуальный artefact из-за corrupted save).

## 12. Z-order overlay-слоёв слетает при flatten

**Симптом:** в Figma chip визуально лежит НАД фотом (zIndex = 4), в браузере фото перекрывает chip (chip оказывается ниже).

**Причина:** при post-refinement / при склейке absolute-positioned элементов skill (или Figma's skill) полагался на DOM order (later DOM = top), но не выставил явные `z-N` classes. Любая reorder при рефакторе → z-order слетает невидимо.

**Action:**
- При render overlay-композиции (несколько `position: absolute` слоёв в одном контейнере): выставлять явные Tailwind `z-N` классы:
  - 0: `z-0` (decoration_below — gradient bg, decorative shapes ПОД UI)
  - 1: `z-10`, 2: `z-20`, 3: `z-30`, и т.д. (ui_layer / decoration_above — chips, photos, icons)
  - Шаг 10 для будущей вставки слоёв без коллизий.
- z-index ДОЛЖЕН отражать `zIndex` из Figma children array (0 = bottom, N = top).
- Если есть chip/badge поверх фото — у chip должен быть БОЛЬШЕ z, чем у фото. Pixel-perfect требование.

**Воспроизведение:** PayoutsSection — chips потеряли z-index, ушли под фото женщины.

## 13. Reference screenshot downscaled (~0.56×) → AA noise floor

**Симптом:** diff floor около 3-4% даже при правильно отрендеренном компоненте; diff.png показывает «hairline halo» на КАЖДОМ контуре.

**Причина:** Figma's MCP `get_screenshot` для крупных frame'ов (1920+ width) возвращает downscaled image (1024×684 для frame 1821×922). diff comparison сравнивает actual screenshot (точные frame size) против upscaled-обратно reference → bilinear interpolation создаёт AA-смесь ВДОЛЬ КАЖДОГО edge'а.

**Action:**
- Перед diff: проверить размер reference. Если меньше actual — downscale **actual** до reference dimensions через `sharp.resize()` перед pixelmatch (не upscale reference: bilinear upscale создаёт artifacts).
- В `scripts/diff.mjs` — добавить `--match-reference-dims` флаг (или сделать default behavior).
- Понимать пол: 3-4% — это noise floor от downscaled reference, не от твоей вёрстки.

**Воспроизведение:** PayoutsSection — diff 9.37% где ~3-4% объясняется downscaling, остальное — Geist vs Euclid font width.

## 14. figma-mcp-go limitation (HISTORICAL — не использовать)

**Не относится к текущему workflow**, но для context:

`figma-mcp-go` (community plugin) имеет архитектурный баг — его сериализатор отдаёт только `SOLID` fills + cornerRadius, отбрасывая `effects[]`, `gradients`, `IMAGE` fills, `blendMode`. Поэтому AI не может вывести Tailwind drop-shadow / gradient из его данных. Это причина всех regression'ов с baked PNG в старом workflow.

`figma:figma-implement-design` (official) этой проблемы не имеет — он ходит во внутренний Figma API напрямую и видит все effects/gradients/masks. Поэтому wrapper-архитектура работает.

Если по какой-то причине пользователь хочет вернуться на figma-mcp-go — escalate: «figma-mcp-go теряет effects данные, regression в baked PNG неизбежен. Используй plugin:figma:figma вместо».
