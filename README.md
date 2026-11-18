# CKD Framework - React template

Template repo for the React frontend of the CKD Framework. New projects start from here, and
existing projects are kept aligned to it via the **ckd-framework-manager**.

Built with **Vite** + React 19.

## Available scripts

| Command | Purpose |
|---|---|
| `npm start` or `npm run dev` | Dev server on [http://localhost:3000](http://localhost:3000) |
| `npm run build` | Production build into `build/` |
| `npm run preview` | Serve the production build locally to verify it before deploying |

The output folder is `build/` (not Vite's default `dist/`) so that existing deploy
configurations — Netlify publish directory and Apache uploads — keep working unchanged.
It is set in `vite.config.mjs` under `build.outDir`.

## What you can edit

Only `src/config/` and `index.html` (for the page title and favicon). Everything else is
framework code, overwritten on every alignment. See `claude.md` for the full guide.

## Notes on the build setup

- The framework writes **JSX inside `.js` files**. `vite.config.mjs` configures esbuild to handle
  it, so custom pages keep using `.js` — do not rename files to `.jsx`.
- Custom pages in `src/config/pages/<Name>/index.js` are resolved with `import.meta.glob`, so each
  one becomes its own lazily loaded chunk. The folder + `index.js` layout is required.
- Environment variables must be prefixed with `VITE_` and are read via `import.meta.env.VITE_*`.
  For most configuration use `src/config/settings.js` instead.
- Styling is **Tailwind CSS v4** plus shadcn-style components in `src/components/ui/`; Bootstrap is
  gone. Design tokens are overridden from `src/config/custom.css`, never in `src/css/tailwind.css`.
- The config is `.mjs` on purpose: without `"type": "module"` in package.json a `.js` config is
  loaded as CommonJS and `@tailwindcss/vite` is ESM-only. `.nvmrc` pins Node 22 for the same reason.
