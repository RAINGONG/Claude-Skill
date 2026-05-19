---
name: figma-to-verstka
description: "Pixel-perfect верстка из Figma в React / Next / Astro / Vue. Тонкий wrapper вокруг официального Figma-скилла `figma:figma-implement-design`: инжектит профиль проекта, вызывает Figma's skill, рефайнит вывод под conventions проекта (paths, shadcn, lucide, assets), верифицирует Playwright + pixelmatch. Triggers: «figma to react», «свёрстай из figma», «pixel-perfect figma», «figma make page», «figma to verstka»."
---

# Figma → Verstka

Skill — тонкий orchestration-слой над **`figma:figma-implement-design`** (официальный скилл Figma, требует Pro + auth `plugin:figma:figma`). Не пытаемся конкурировать с Figma за генерацию JSX: Figma сама умеет правильно отдавать effects / masks / overlays / gradients / IMAGE assets. Мы делаем три вещи:

1. **Pre-prompt augmentation** — инжектим профиль проекта (стек, paths, shadcn, иконки, fonts, i18n) + жёсткие правила.
2. **Post-refinement** — приводим вывод Figma к conventions проекта (paths, lucide, shadcn, assets).
3. **Verification loop** — Playwright screenshot → pixelmatch diff → polish patches если diff > target.

## Когда триггерится

- Пользователь даёт Figma URL и просит сверстать.
- Упоминание «figma to react / verstka», «pixel-perfect figma», «свёрстай из figma», «figma make page».
- В проекте подключен `plugin:figma:figma` MCP (требует Figma Pro + Dev seat) и доступен skill `figma:figma-implement-design`.

## Архитектура

```
┌─ Layer 1: figma:figma-implement-design (Figma's official) ───────┐
│  Returns ready React+Tailwind JSX with effects/masks/overlays/   │
│  gradients/IMAGE assets (localhost: URLs).                       │
└──────────────────────┬───────────────────────────────────────────┘
                       │ called with augmented prompt
                       ▼
┌─ Layer 2: figma-to-verstka (wrapper) ────────────────────────────┐
│  • profile.json injection (stack, shadcn, icons, paths)          │
│  • IMPORTANT rules (TEXT for i18n, UI as HTML, effects via       │
│    Tailwind, masks/overlays via z-index, mobile-first)           │
│  • Post-refinement: paths, lucide, shadcn, asset download        │
│  • Verification: pnpm tsc + lint + dev + Playwright + pnpm diff  │
│  • Polish patches (P1-P8) if diff > target                       │
└──────────────────────┬───────────────────────────────────────────┘
                       │ (Step 4 only)
                       ▼
┌─ Layer 3: figma-page-builder CLI ────────────────────────────────┐
│  Headless через @anthropic-ai/claude-agent-sdk. 4 mode'а:        │
│  component / page / page (mobile+desktop) / modal.               │
└──────────────────────────────────────────────────────────────────┘
```

## Modes (по incrementally растущей сложности)

| Mode               | Inputs                              | Output                                                  |
| ------------------ | ----------------------------------- | ------------------------------------------------------- |
| **component**      | один Figma URL, single breakpoint   | `src/components/<Name>/<Name>.tsx` + assets             |
| **page**           | URL страницы, single breakpoint     | sections + composed `pages/<Name>/<Name>.tsx` + routing |
| **page-responsive** | mobile-url + desktop-url           | один компонент с `lg:` modifiers, два диффа passing     |
| **modal**          | URL модалки + interactive prompts   | standalone `<Dialog>` + state machine + TODO wiring     |

**Текущая фаза разработки:** Step 1 — `component` mode only. Page / responsive / modal — TBD.

## Обязательные правила

1. **Read project's CLAUDE.md в первую очередь.** Project rules > skill defaults, всегда.
2. **Profile auto-detection обязательна.** До вызова Figma's skill — `node scripts/profile-project.mjs --cwd <projectRoot>` чтобы получить `profile.json`. Без него инжектить нечего.
3. **Plan mode перед execute.** Skill составляет краткий план (что вёрстаем, какой URL, какой profile) — пользователь подтверждает перед вызовом Figma's skill.
4. **Не генерировать JSX «с нуля».** Если вызов `figma:figma-implement-design` доступен — он primary source. Ручная генерация только если пользователь явно отказался от Figma's skill.
5. **ultrathink** перед сложными решениями (post-refinement маппинг, polish patches, breakpoint-merge).

## Workflow

### Phase 0 — Prereqs (1 раз на сессию)

```bash
node ~/.claude/skills/figma-to-verstka/scripts/ensure-prereqs.mjs --cwd <projectRoot> --auto-fix
node ~/.claude/skills/figma-to-verstka/scripts/profile-project.mjs --cwd <projectRoot>
```

Проверки:
- `plugin:figma:figma` MCP подключён + auth активна (skill `figma:figma-implement-design` доступен).
- `playwright` MCP подключён (для verification).
- `pnpm`, `node`, `tsc`, `eslint` доступны.
- `scripts/diff.mjs` существует в проекте (если нет — копируем из skill).
- Deps: `pixelmatch`, `pngjs`, `sharp` (если нет — `pnpm add -D`).
- Output: `<projectRoot>/.figma-page-builder/profile.json` со снапшотом стека.

Если что-то не зелёное — escalate пользователю с конкретным вопросом (re-auth Figma, отсутствует font, отсутствует MCP).

### Phase 1 — Generate via figma:figma-implement-design

Skill ВЫЗЫВАЕТ официальный Figma skill через `Skill(skill="figma:figma-implement-design", args=...)`, передавая **augmented prompt**.

Шаблон augmented prompt'а — см. `reference/post-refinement.md`. Кратко:
- Profile context (framework, styling, UI lib, icons, paths, fonts, i18n).
- IMPORTANT rules (TEXT для i18n, UI как HTML, effects через Tailwind, masks/overlays через z-index, semantic HTML, shadcn-first, canonical Tailwind sizes).
- Multi-breakpoint guidance (если 2 URL).
- Output expectations (file path по project structure, аssets pre-downloaded в `/public/<feature>/`).

Перед вызовом — показать пользователю план + augmented prompt summary, ждать «ок».

После вызова Figma's skill — собрать его output (созданные файлы, скачанные assets, raw JSX).

### Phase 2 — Refine to project conventions

Берём вывод Figma's skill и **точечно** адаптируем под `CLAUDE.md` проекта. Все правила — в `reference/post-refinement.md`. Кратко:

1. **File paths** — переписать импорты под feature-based структуру если нужно.
2. **Иконки** — заменить inline SVG на `lucide-react` где иконка узнаваема (по `profile.iconLibrary`).
3. **shadcn компоненты** — если raw `<button>`/`<input>` совпадают по семантике с `src/components/ui/*` — заменить на shadcn.
4. **Asset paths** — `localhost:figma-export-...` → `/public/<feature>/<slug>.png` (download через Figma's `get_image` или эквивалент).
5. **Размеры** — arbitrary `[Npx]` → canonical Tailwind где есть (см. таблицу в `reference/post-refinement.md`).
6. **Имена компонентов** — PascalCase по project naming.
7. **Mobile-first responsive** — если 2 URL'а, мерджить в один компонент с `lg:` modifiers (см. `reference/multi-breakpoint-merge.md`, появится на Step 3).

После рефайна:
```bash
pnpm exec tsc --noEmit
pnpm lint
```
До зелёного. Self-fix макс 3 итерации, потом escalate.

### Phase 3 — Visual verification

```bash
pnpm dev  # background
```

Через Playwright MCP:
- viewport = размер фрейма + buffer.
- `browser_take_screenshot` element-locator → `temp-outputs/actual.png`.

Reference берём через `figma:figma-implement-design` (либо через `mcp__plugin_figma_figma__get_screenshot`) → `temp-outputs/reference.png`.

Diff:
```bash
pnpm diff --actual ... --reference ... --out ... --width <W> --height <H>
```

Если diff > target (default 5%) → Phase 3.5. Иначе → Cleanup.

### Phase 3.5 — Polish

Patches **только** из `reference/phase-3.5-polish.md` (P1-P8). Не выдумывать. Max 3 итерации. Если после 3-х diff всё ещё > target — escalate с прикреплённым diff.png.

### Cleanup

1. `actual.png + reference.png + diff.png` → `src/components/<Name>/__visual-tests__/`.
2. `rm -rf src/components/<Name>/temp-outputs/`.
3. `npx kill-port 5173 5174 5175 5176`.

### Финальный отчёт

```
## <Name> — final

### Source
- Figma URL: ...
- figma:figma-implement-design returned: <X> files, <Y> assets

### Refinements applied
- Renamed N imports to project structure
- Replaced N inline SVGs with lucide-react
- Replaced raw button with shadcn Button (×N)
- Downloaded N assets to public/<feature>/

### Files
- src/components/<Name>/<Name>.tsx (<lines> lines)
- public/<feature>/...
- App.tsx integration (route added if page mode)

### Verification
- diff: X.XX% (target ≤<T>%)
- patches applied: [P1, P2] (if any)
- Dev server stopped: ✓
```

## Hard validator (защита от регрессий)

```bash
node <projectRoot>/scripts/validate-no-baked-ui.mjs --component <Name>
```

Грепает сгенерированный код, fail'ит build если UI-имена (chip/badge/button/toggle/pill) встречаются в `<img src="*.png">`. С `figma:figma-implement-design` это не должно срабатывать — Figma рендерит UI как HTML. Если сработало — баг в рефайне или Figma вернула неожиданное.

## Запреты

- Игнорировать вывод `figma:figma-implement-design` и писать JSX «с нуля» — теряем effects/gradient/mask данные что Figma уже отдала.
- Сдавать без diff verification.
- Сдавать с running dev server.
- Бэйкать UI элементы (chip / button / badge / toggle) в PNG. Они HTML, всегда.
- Запекать effects (drop-shadow / glow / blur) в PNG. Они Tailwind classes, всегда.
- Хардкодить text в `<img>` (текст в Figma → `<h1>`/`<p>`/`<span>` для i18n).

## Fallback

Если `figma:figma-implement-design` недоступен (Figma не Pro, plugin auth expired) — escalate пользователю:

> «`figma:figma-implement-design` недоступен. Re-auth через `/mcp` → `plugin:figma:figma` → authenticate. Без него skill не запускается.»

Никаких «легаси-пайплайнов» через figma-mcp-go: его сериализатор не отдаёт effects/gradients (см. `reference/known-pitfalls.md`), поэтому regression в баженый UI неизбежен.

## Reference materials

- `reference/post-refinement.md` — augmented prompt template + правила пост-обработки.
- `reference/phase-3.5-polish.md` — каталог P1-P8 polish patches.
- `reference/known-pitfalls.md` — text-AA, sub-pixel borders, font fallbacks.
- `reference/profile-schema.md` — Project Profile JSON.
- `reference/supported-stacks.md` — какие стеки поддерживаются.
- `reference/claude-md-templates/` — 4 шаблона CLAUDE.md по стеку (для bootstrap новых проектов).

## Scripts

- `scripts/profile-project.mjs` — детект стека → `profile.json`.
- `scripts/ensure-prereqs.mjs` — Phase 0 prereqs check + auto-fix.
- `scripts/diff.mjs` — pixel diff (pixelmatch + sharp + alpha-flatten).

## CLI (Step 4, TBD)

`figma-page-builder` — headless wrapper через Claude Agent SDK. 4 mode'а (см. таблицу выше). Реализуется после того как Step 1-3 skill'а стабильны.
