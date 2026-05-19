# Project Profile Schema

Документация JSON-схемы файла `.figma-page-builder/profile.json`, который генерирует `scripts/profile-project.mjs`. Профайл — единственный источник правды о технологическом стеке и conventions проекта; все subagents читают его и адаптируют output.

## Top-level поля

| Field | Type | Описание |
|---|---|---|
| `schemaVersion` | number | 1 (текущая). Bump при breaking-изменениях. |
| `generatedAt` | ISO string | Когда сгенерирован (для cache-staleness). |
| `cwd` | string | Абсолютный путь проекта. |
| `framework` | enum | Основной framework. См. ниже. |
| `frameworkVersion` | string \| null | Версия из package.json. |
| `secondary` | string[] | Вторичные интеграции (`react-island`, `vue-island`, etc.). |
| `language` | `"ts"` \| `"js"` | TypeScript или JS. |
| `packageManager` | enum | `pnpm` \| `npm` \| `yarn` \| `bun`. |
| `styling` | object | См. раздел "Styling". |
| `iconLibrary` | enum \| null | `lucide` \| `heroicons` \| `tabler` \| `react-icons` \| `phosphor`. |
| `i18n` | object | См. раздел "i18n". |
| `dataFetching` | object | См. раздел "Data fetching". |
| `routing` | object | См. раздел "Routing". |
| `fileStructure` | object | См. раздел "File structure". |
| `fonts` | object | См. раздел "Fonts". |
| `commands` | object | См. раздел "Commands". |
| `screenshotStrategy` | enum | Стратегия dev-сервера для verifier'а. |
| `conventions` | object | См. раздел "Conventions". |
| `examples` | object | Пути к существующим компонентам/страницам/layout'ам. |
| `claudeMdExisting` | bool | Есть ли CLAUDE.md в корне. |
| `mcp` | object | `{ hasMcpJson, hasFigmaMcp, hasPlaywrightMcp }`. |
| `sampleComponents` | string[] | Пути 1-3 случайных компонентов для conventions inference. |
| `warnings` | string[] | Сообщения для orchestrator'а — что из этого требует эскалации. |

## framework

```ts
"astro" | "next-app" | "next-pages" | "react-vite" | "react-cra"
| "remix" | "nuxt" | "vue-vite" | "sveltekit" | "unknown"
```

Detection logic:
- `astro` в deps → `astro`.
- `next` в deps → `next-app` если есть `app/` или `src/app/`, иначе `next-pages`. При наличии обоих — `next-app` (модерн winning).
- `nuxt`, `remix`, `@sveltejs/kit` в deps → соответствующий framework.
- `vue` в deps → `vue-vite`.
- `react` + `vite` → `react-vite`.
- `react` + `react-scripts` → `react-cra`.
- иначе → `unknown` (orchestrator эскалирует).

## styling

```ts
{
  approach: "tailwind" | "css-modules" | "styled-components" | "emotion"
            | "vanilla-extract" | "panda" | "css",
  tailwindVersion: "v3" | "v4" | null,
  uiLibrary: "shadcn" | "mui" | "mantine" | "chakra" | "antd"
            | "radix-bare" | "headless-ui" | null,
}
```

- Tailwind v4 если `@tailwindcss/vite` или `@tailwindcss/postcss` в deps, или в css есть `@import "tailwindcss"`.
- UI library priority: `components.json` (shadcn) → `@mui/material` → `@mantine/core` → `@chakra-ui/react` → `antd` → `@radix-ui/*` → `@headlessui/*`.

## i18n

```ts
{
  enabled: boolean,
  library: "i18next" | "next-intl" | "astro-i18n" | "vue-i18n" | "paraglide" | "unknown" | null,
  locales: string[] | null,           // ["ru", "en"]
  translationKeyPattern: "screen.section.field" | "flat" | null,
  stringInterpolation: "t('key')" | "$t('key')" | null,
  examplePath: string | null,         // путь к locale-файлам
}
```

Detection: deps + grep на `useTranslation`/`t(`/`$t(` в sample components + наличие `locales/`/`messages/`/`i18n/` директорий.

## dataFetching

```ts
{
  library: "react-query" | "swr" | "rtk-query" | "urql" | "apollo" | null,
  queryClient: "global" | "per-component" | null,
  examplePath: string | null,
}
```

## routing

```ts
{
  approach: "file-based" | "config-based" | "manual",
  pageDirectory: string | null,        // "src/pages" | "app" | "src/routes"
  pageNamingConvention: "kebab-case" | "lowercase" | "PascalCase" | null,
  exampleRoute: string | null,
}
```

## fileStructure

```ts
{
  componentsDir: string,                   // "src/components" по умолчанию
  componentSubfolders: "flat" | "feature-based" | "feature-with-index" | "atomic",
  namingConvention: "PascalCase" | "kebab-case" | "camelCase",
  indexFiles: boolean,
  barrelFiles: boolean,
}
```

- `feature-based`: `Header/Header.tsx` (одна папка на компонент).
- `feature-with-index`: `Header/index.ts` + `Header/Header.tsx`.
- `atomic`: подпапки `atoms/`, `molecules/`, etc.
- `flat`: `Header.tsx` лежит прямо в `components/`.

## fonts

```ts
{
  approach: "local-woff2" | "next-font" | "fontsource" | "google-fonts-link" | "system",
  fontFiles: string | null,            // "public/fonts" | "static/fonts"
  secondaryApproaches: string[],        // дополнительные источники, не primary
}
```

Priority: local-woff2 (если есть `public/fonts/` или `static/fonts/`) > next-font > fontsource > google-fonts-link > system. Локальные `.woff2` всегда выигрывают над auto-installed deps (Geist, etc.) — это что пользователь явно положил.

## commands

```ts
{
  dev: string | null,         // "pnpm dev" / "npm run dev" / "astro dev"
  build: string | null,
  lint: string | null,
  typecheck: string | null,
  preview: string | null,
  test: string | null,
}
```

- Если есть script в `package.json` → используем его (`pnpm <name>`).
- Если нет, но есть бинарь в deps (typescript, eslint) → синтезируем через exec (`pnpm exec tsc --noEmit`, `pnpm exec eslint .`).

## screenshotStrategy

```ts
"vite-localhost" | "next-localhost" | "astro-localhost"
| "sveltekit-localhost" | "remix-localhost" | "preview-build"
```

Verifier выбирает соответствующий dev-сервер старт.

## conventions

```ts
{
  componentExportStyle: "named" | "default",
  propsTyping: "type" | "interface",
  stateManagement: "jotai" | "zustand" | "redux" | "mobx"
                   | "pinia" | "valtio" | "xstate" | null,
  formLibrary: "react-hook-form" | "formik" | "felte" | "tanstack-form" | null,
  linkComponent: "next-link" | "astro-anchor" | "react-router-link"
                 | "tanstack-router-link" | "wouter-link" | "anchor",
}
```

- `componentExportStyle`/`propsTyping` — inferred из 2-3 sample components через regex.
- Остальное — из deps.

## examples

```ts
{
  existingComponentPath: string | null,
  existingPagePath: string | null,
  existingLayoutPath: string | null,
}
```

Эти пути Implementer читает как референс для воспроизведения стиля проекта.

## warnings

Список строк, каждая описывает potential issue:
- `framework=unknown — orchestrator should escalate stack choice`
- `styling=css ... pixel-perfect output may need CSS file edits`
- `no typecheck script and no typescript dep — Implementer cannot run TS validation`
- `no figma-mcp-go ... in .mcp.json — extraction will fail`
- `no playwright in .mcp.json — verification will fail`

Orchestrator превращает каждое в либо `AskUserQuestion`, либо silent best-effort (см. `escalation-rules.md`).

## Reload conditions

Profile считается устаревшим если:
- `package.json` modified time > profile.generatedAt
- Пользователь явно запросил `--refresh-profile`
- profile.json отсутствует
- `cwd` в profile не совпадает с текущим
