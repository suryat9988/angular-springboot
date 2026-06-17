# angular-springboot

Full-stack sample app: an Angular frontend (`frontend/`) that calls a Spring Boot REST backend (`backend/`).

## Project layout

- `backend/` — Spring Boot 3.5 (Java 21, Maven). REST API under `/api`. Uses the Maven wrapper (`./mvnw`), so no system Maven is required.
- `frontend/` — Angular 20 (Node/npm). Calls the backend via `HttpClient`.

## Common commands

### Backend (`backend/`)
- Run (dev): `./mvnw spring-boot:run` — serves on `http://localhost:8080`, endpoint `GET /api/hello?name=...`.
- Test: `./mvnw test`
- Build: `./mvnw package`

### Frontend (`frontend/`)
- Run (dev): `npm start` — serves on `http://localhost:4200`.
- Lint: `npm run lint` (or `npx ng lint`)
- Test: `npm test -- --watch=false --browsers=ChromeHeadless`
- Build: `npm run build`

## Cursor Cloud specific instructions

- Two services must run together for the app to work end-to-end: start the backend (`./mvnw spring-boot:run` in `backend/`) first, then the frontend (`npm start` in `frontend/`).
- The Angular dev server proxies `/api/*` to the backend at `http://localhost:8080` via `frontend/proxy.conf.json` (wired into `angular.json`'s serve target). The browser only ever talks to `http://localhost:4200`; there is no separate CORS setup needed in dev.
- Karma/headless tests need Chrome; this image has it at `/usr/bin/google-chrome-stable`. Run frontend tests with `--browsers=ChromeHeadless` (no `--no-sandbox` flag was needed). If you ever hit a sandbox error, set `CHROME_BIN=/usr/bin/google-chrome-stable`.
- Angular CLI analytics consent has been disabled globally; if a fresh environment ever prompts interactively, run `npx ng analytics disable --global` (otherwise `npm start`/`ng` commands block waiting on a TTY prompt).
- The backend's first `./mvnw` invocation downloads Maven + dependencies into `~/.m2`; this is normal and only slow on a cold cache.
