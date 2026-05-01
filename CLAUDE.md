# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

Vite + React 18 + Tailwind v3 single-page app comparing end-of-school trip ("viaje de egresados") proposals from various Argentine travel companies. Spanish UI, ARS pricing.

```
.
├── Makefile                      # install / dev / build / preview / extract / clean
├── index.html                    # Vite entry, mounts #root
├── package.json                  # React 18, Vite 5, Tailwind 3, lucide-react
├── tailwind.config.js            # content globs cover index.html + src/**
├── postcss.config.js             # tailwindcss + autoprefixer
├── vite.config.js                # @vitejs/plugin-react, host:true, port 5173
├── scripts/
│   ├── extract-raw.mjs           # legacy viajes-corregido.jsx → src/data/viajes.json (intermedio)
│   └── split-by-company.mjs      # src/data/viajes.json → src/data/<slug>.json por empresa
├── src/
│   ├── main.jsx                  # ReactDOM root, imports ./index.css
│   ├── index.css                 # @tailwind directives only
│   ├── App.jsx                   # the entire UI (was viajes-corregido.jsx)
│   └── data/
│       ├── flecha.json           # un archivo por empresa (fuente de verdad)
│       ├── super-tour.json       # cargados vía import.meta.glob en App.jsx
│       ├── recrear.json
│       ├── lake-travel.json
│       ├── serrano.json
│       └── puerto-aventura.json
└── viajes-corregido.jsx          # legacy original (kept as reference for re-extraction)
```

## Common commands

```bash
make install     # npm install
make dev         # vite dev server on :5173 (auto-installs)
make build       # vite production build → dist/ (auto-installs)
make preview     # build + serve dist on :4173
make extract     # legacy jsx → src/data/viajes.json (intermedio, gitignored)
make split       # divide viajes.json en archivos por empresa (skip si ya existen)
make data        # extract + split en cadena
make clean       # rm -rf node_modules dist
```

`npm run` equivalents exist for `dev`, `build`, `preview`, `extract`. There is no test suite or linter wired up.

### Editing the dataset

The dataset lives in **one JSON file per company** under `src/data/<slug>.json` (e.g. `flecha.json`, `super-tour.json`). Each file is a flat array of plan rows. `App.jsx` loads them all via `import.meta.glob("./data/*.json", { eager: true })` and concatenates — so adding a new empresa is just dropping a new `<slug>.json` next to the others (and adding an entry to `COMPANY_ACCENT` so the cards aren't all amber, see below).

`src/data/viajes.json` is **not** committed; it's an intermediate produced by `make extract` and consumed by `make split`. The glob loader in `App.jsx` explicitly excludes it to avoid double-counting if it happens to be present locally.

`make split` **skips** files that already exist — that's how manual edits in per-company files (e.g. adding rows the legacy jsx doesn't have) survive a re-run. To force regeneration of one file, delete it first.

The legacy `viajes-corregido.jsx` at the repo root is **not** wired into the build; it remains only as input to `make extract` for callers who still maintain it.

## Architecture (everything lives in `src/App.jsx`)

1. **`RAW`** is built at module load time by concatenating every `./data/*.json` (excluding `viajes.json`) via `import.meta.glob` with `{ eager: true }`. Each row is one (company × destination × duration × payment plan) combination. Spanish keys: `Empresa`, `Destino`, `Transporte` (`"Bus"` | `"Avión"`), `Dias`, `Noches`, `Plan_Pago`, `Cantidad_Cuotas`, `Inscripcion`, `Reserva`, `Primera_Cuota`, `Cuota_Mensual`, `Anticipo_Saldo`, `Total_Final`, `Liberados`, `Seguro`, `Descuentos`, `Actividades` (comma-separated string), `Vigencia`. Money/cuota fields may be missing/null — the renderer tolerates that.
2. **`COMPANY_ACCENT`** — per-company Tailwind class bundle (`bg`, `border`, `text`, `dot`, `ring`, `chip`). **Adding a new `Empresa` to the JSON without an entry here silently falls back to the Flecha amber palette.** Keep this map in sync.
3. **`fmt`** + **`getPaymentTip`** — formatting helpers. `getPaymentTip` buckets plans by `Cantidad_Cuotas` (`1`, `null`, `≤5`, `≤12`, else) into Spanish copy.
4. **`HelpTip`**, **`GuideBanner`** — presentational; `GuideBanner` is the glossary of payment terms shown to end users.
5. **`DestinationCard`** — the heart of the UI. Receives `{ empresa, destino, planes }`. Derives unique `Dias|Noches` durations, renders chips, filters into `availablePlans`, exposes a `<select>` of `Plan_Pago` options, runs the Calculadora de Pagos, and highlights the cheapest `Total_Final` within the current duration only.
6. **`App`** — groups rows by `${Empresa}|||${Destino}`, sorts alphabetically, renders one `DestinationCard` per group plus a stats strip.

`App`'s `useEffect` injects a `<link>` to Google Fonts (`Fraunces`, `Albert Sans`) and a `<style>` block defining `.font-serif`, `.font-sans`, and a `fadeIn` keyframe at runtime. Anything that references those classes will look broken if the effect doesn't run (SSR, sandboxed previews). Internet access is required at runtime for the fonts.

## The payment calculator (read this before touching pricing logic)

`DestinationCard` implements payment-step decomposition. Three real-world plan shapes are encoded, and the inline comments in `App.jsx` are the source of truth — preserve them when editing:

- **Inscripción + distinct Primera Cuota** (Flecha pattern): both count *inside* the advertised `Cantidad_Cuotas`, so monthly remainder = `N − 2`.
- **Distinct Primera Cuota only, no Inscripción**: Primera Cuota counts inside N → remainder = `N − 1`.
- **Inscripción only** (Super Tour, Recrear, Lake Travel pattern): all `N` cuotas are full monthly payments.

`hasPrimeraCuotaDistinta` triggers the first two branches and is defined as `Primera_Cuota > 0 && Cuota_Mensual && Primera_Cuota !== Cuota_Mensual` — i.e., a Primera Cuota equal to the regular Cuota Mensual is treated as a normal first month, *not* a special upfront payment. Model new empresas with novel plan shapes by extending this block, not by sprinkling conditionals further down.

The on-screen `upfront` total is `Inscripcion + Reserva + (hasPrimeraCuotaDistinta ? Primera_Cuota : 0)`. `Anticipo_Saldo` renders as a *separate* step — it is not folded into upfront — because the original pricing sheets present it as a pre-trip lump sum independent of cuotas.

## Editing conventions

- All visible strings and JSON keys are Spanish — keep them Spanish; do not translate keys when adding rows. Argentine voseo / phrasing in `getPaymentTip` and `GuideBanner` is intentional.
- Money values in the JSON are plain integers in ARS (no decimals, no thousand separators). Formatting happens only at render time via `fmt` (`Number.toLocaleString("es-AR")`). Don't pre-format strings into the data.
- `Actividades` is a single comma-separated string; `DestinationCard` splits and trims it. Keep that contract — don't switch some rows to arrays.
- Tailwind arbitrary-value utilities are used heavily for typographic micro-adjustments (e.g. `text-[12.5px]`, `tracking-[0.22em]`). Don't "round" them to the nearest preset class without checking the rendered design.
