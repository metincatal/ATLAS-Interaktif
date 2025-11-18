# Repository Guidelines

## Project Structure & Module Organization
The interactive client lives in `src/web`, where `scripts/core` manages globe state, navigation, and interaction, `scripts/modules/*` implement domain features (panel, chat, corridor, WGI), and `scripts/utils` hosts shared helpers such as `data-helpers.js`. CSS is assembled via `src/web/styles/main.css`, which imports modular files in `base`, `layout`, `components`, and `modules`, so keep new styles scoped and imported there. Data and notebook workflows belong in `data/raw|processed|training` and `src/analysis/notebooks`, while architectural context is documented in `docs/ARCHITECTURE.md`, `docs/SETUP.md`, and troubleshooting lives in `TEST_GUIDE.md`. Use the `tests/unit` and `tests/integration` folders to mirror any new helpers or UI flows you add.

## Build, Test, and Development Commands
- `pip install -r requirements.txt` installs the analysis toolchain for notebooks and data scripts.  
- `npm run dev` (alias of `python3 -m http.server 8000`) serves `/src/web/index.html` at `http://localhost:8000`.  
- `npm run start` is the same server for production parity; keep it clean of watcher-only flags.  
- Launch notebooks with `jupyter lab src/analysis/notebooks` when iterating on processed datasets.  
When testing fixes mentioned in `TEST_GUIDE.md`, hit `http://localhost:8000/src/web/test-navigation.html` for the focused smoke page before exercising the full app shell.

## Coding Style & Naming Conventions
JavaScript modules follow ES6 syntax, 4-space indentation, and named exports (`setupNavigation`, `loadDarKoridorData`); prefer dependency injection via parameter lists instead of singletons. Keep file names kebab-cased (e.g., `corridor-graph.js`) and data artifacts snake_cased (e.g., `vdem_indicator_values.json`). CSS uses the BEM-like classes already present in `styles/components/*` (`.corridor-graphic__dot`, modifiers as `--active`). Document non-obvious logic with concise comments above the block rather than inline chatter.

## Testing Guidelines
UI smoke tests should follow the checklist in `TEST_GUIDE.md`, logging the console output shown there. For data helpers, add `pytest` suites under `tests/unit/<module>_test.py` (run via `pytest -q` after installing requirements). Integration scenarios that exercise DOM modules should land in `tests/integration`, using Playwright or another headless runner, and be named `<feature>.spec.js`. Every PR should include at least one reproducible test command (manual or automated) in the description, plus screenshots if the UI changes.

## Commit & Pull Request Guidelines
History currently contains descriptive Turkish commits (e.g., “İlk commit - ATLAS Interaktif projesi”); continue that clarity with short, imperative subjects or adopt a scoped prefix such as `feat(globe): add inertia easing`. Work on feature branches like `feature/panel-search` or `fix/navigation-button`, squash locally if the branch is noisy, and keep commits focused on one concern. Pull requests must link to an issue (or explain why not), summarize architectural impacts referencing `docs/ARCHITECTURE.md` when relevant, attach before/after visuals for UI work, and paste the console transcript from the navigation test page.

## Security & Configuration Tips
API keys or experimental endpoints belong in `src/web/scripts/config/api-config.js`; never hardcode secrets or tokens in version control—use placeholder values and document overrides in `docs/SETUP.md`. Large datasets in `data/raw` can exceed repository quotas, so prefer delta-friendly CSV/JSON exports under `data/processed/v*` and avoid committing files over 50 MB without coordinating on Git LFS. If you introduce new data sources, ensure licensing is documented alongside the dataset and scrub personally identifiable information before adding it to `training/`.
