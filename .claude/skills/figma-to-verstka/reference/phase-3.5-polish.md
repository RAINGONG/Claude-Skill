# Phase 3.5 — Targeted polish (template для Polisher agent'а)

Цель: на основе region-report от Verifier'а применить **точечные** patches к компоненту, без переписывания. Re-verify до достижения target ИЛИ `max-iterations` (default 3).

## Inputs

- Региональный report от Verifier (топ-3 худших регионов по diff'у).
- Путь к `<Name>.tsx`.
- `iteration` (1 / 2 / 3) — какой круг полировки.
- `prevDiff` — предыдущая метрика, чтобы оценить delta.

## Каталог patches (по симптомам)

Каждый patch — точечный, низкорисковый, проверенный на реальных компонентах.

### P1: Сomponent border 1px не совпадает (1-2px смещение)

**Симптом:** в diff красная рамка по периметру кнопки/контейнера.

**Причина:** CSS `border` в Chrome иногда ложится на полупиксели при определённом scale. Tailwind `border` (1px solid) может рендериться чуть иначе, чем Figma stroke.

**Patch:** заменить `border` на `box-shadow inset`:

```diff
- border border-black bg-...
+ shadow-[inset_0_0_0_1px_#000] bg-...
```

`box-shadow inset` рисует чётко по краю box-model.

**Эффект (доказан на Header):** -1.77pp на регионе с 2 кнопками.

### P2: Текст anti-aliasing смещён на 1px

**Симптом:** в diff красные «ореолы» вокруг каждой буквы текста.

**Причина:** Chrome (DirectWrite/Skia) и Figma render шрифты по-разному.

**Patch:** добавить font-smoothing на корневой элемент компонента:

```diff
- <header className="...">
+ <header className="... [-webkit-font-smoothing:antialiased] [-moz-osx-font-smoothing:grayscale]">
```

Или в `src/index.css` в `@layer base`:
```css
header { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
```
**ТОЛЬКО** для конкретного компонента, не глобально на body.

**Эффект:** -0.3 до -0.5pp на текстовых регионах. Marginal, но почти бесплатно.

### P3: Auto-wrap многострочного заголовка ≠ Figma

**Симптом:** в Figma заголовок «Безопасность и верификация» разбит на 2 строки в конкретных местах. В коде CSS auto-wrap делит по другим словам → diff на тексте.

**Причина:** Figma использует ` ` (line separator) для явных переносов. У нас в data — единая строка, browser сам решает где переносить.

**Patch:**
1. В `temp-outputs/layer-tree.txt` или `measurements.json` найти текстовую ноду, скопировать raw string с ` `.
2. Заменить ` ` на `\n` в data file (например `categories.data.ts`):
   ```diff
   - title: "Безопасность и верификация"
   + title: "Безопасность\nи верификация"
   ```
3. В компоненте уже должен быть `whitespace-pre-line` на текстовом элементе (если нет — добавить).

**Эффект:** -1 до -3pp на компонентах с multi-line headlines.

### P4: Placeholder-фон даёт лишний diff

**Симптом:** красный круг/квадрат на месте, где у нас фон, а в Figma пустой rect.

**Причина:** в Figma это placeholder для будущего ассета (флаг, иконка) — без fill, прозрачный. У нас `bg-[#d9d9d9]` для визуальности.

**Patch:** убрать заливку placeholder'у:

```diff
- <div className="w-4 h-4 rounded-full bg-[#d9d9d9]" />
+ <div className="w-4 h-4 rounded-full bg-transparent" />
```

**Эффект:** небольшой, но cleanup'ит правую зону.

### P5: Иконка lucide ≠ Figma по форме

**Симптом:** красный «отпечаток» иконки. lucide ChevronDown 12×12, Figma 9×5 (другая пропорция).

**Причина:** lucide-минимум — 12px и форма геометрически другая.

**Patch:** заменить lucide на inline-SVG с точным path из Figma. См. Phase 2 раздел "Inline SVG (мелкие иконки)". Скопировать path через MCP, написать локальный компонент в файле:

```tsx
function ChevronDown9x5({ className }: { className?: string }) {
  return (
    <svg width="9" height="5" viewBox="0 0 9 5" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M1 0.5L4.5 4L8 0.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

**Эффект:** небольшой, но устраняет визуально заметное расхождение.

### P6: Asset (логотип PNG) отличается на anti-aliasing

**Симптом:** красные точки внутри логотипа/иллюстрации.

**Причина:** PNG рендерится Chrome'ом по-разному vs Figma (особенно при downscale).

**Patch (опции):**
1. **Re-export reference в 1x** (если был 2x). Через MCP `get_screenshot` SCALE=1. Diff падает на ~0.4pp.
2. **Конвертация лого в inline SVG.** Только если шрифт логотипа известен и можно отрисовать точно.
3. **Принять как floor.** Если 1-2 опции не помогают — это physical limit ~1pp, дальше не двигается.

### P7: Sub-pixel size mismatch (351 vs 352)

**Симптом:** одна из карточек в grid'е 352px, остальные 351 — Figma sub-pixel rounding. У нас grid даёт всем 351.2 → одна не совпадает.

**Patch:** игнорировать. Это fundamental Figma export artifact, в реальном grid'е никто не заметит. Если очень нужно — заменить grid-cols-N на flex-row + явные width'ы.

### P8: Modal overlay прозрачность

**Симптом:** в diff красный фон за модалкой.

**Причина:** Dialog overlay в shadcn по умолчанию `bg-black/80`, в Figma может быть другая прозрачность.

**Patch:** override через className:

```tsx
<DialogOverlay className="bg-black/50" />
```

## Применение patches

### Iteration 1
Применить ВСЕ применимые из топ-3 регионов. Если регион «text AA» — P2. Если регион «button border» — P1. И т.д.

### Iteration 2
Если diff ещё не достигнут — анализ delta:
- Diff упал → продолжить точечные patches на оставшихся регионах.
- Diff вырос → откатить последние изменения, эскалация: «patch навредил».

### Iteration 3 (last)
Если до сих пор не target — accept текущий diff, log предупреждение, не блокировать pipeline.

## Output (отчёт для orchestrator'а)

```json
{
  "iterations": 2,
  "patchesApplied": ["P1", "P2", "P3"],
  "diffHistory": [
    { "iter": 0, "diff": 4.79 },
    { "iter": 1, "diff": 4.39 },
    { "iter": 2, "diff": 4.10 }
  ],
  "finalDiff": 4.10,
  "passedTarget": true,
  "floor": "P6 (logo PNG anti-aliasing) — physical limit ~1pp"
}
```

## Жёсткие правила

- **Не менять структуру DOM** между iteration'ами. Только классы и атрибуты.
- **Не менять размеры** наугад (`14px → 15px` чтобы текст «лёг лучше»). Это каскадирует в line-height и ломает другие регионы.
- **Не менять компоненты ui/*** (shadcn). Editing запрещён по правилам CLAUDE.md.
- **Не отключать font-loading** для маскировки text AA.
- Если patch не дал улучшения — откатить.
- 8 итераций максимум absolute (даже без флага).

## Чего НЕ делать (anti-patches)

| Не делай | Почему |
|---|---|
| Менять `font-size` или `line-height` чтобы «попасть» | Каскадирует в layout, ломает соседние элементы |
| Добавлять `transform: scale(...)` | Меняет hit-area и читаемость, нечестно |
| `letter-spacing` подгонять без Figma value | Ломает внешний вид при изменении шрифта |
| Заменять Tailwind классы на arbitrary с `.5px` | Sub-pixel, не воспроизводимо |
| `position: absolute` вместо flex чтобы «попасть» | Ломает responsive |
| Disable smoothing для sharp edges | Криво на retina |
