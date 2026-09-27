# Capy Island

A cozy capybara island game for kids. It's a static site with no build step: open `index.html`
from any web server.

## Layout

- `index.html`: the page markup and the ordered list of scripts.
- `css/`: `style.css` for the game, `gate.css` for the Capy Air passcode gate.
- `js/config.js`: Supabase settings (leave both empty for local-only play).
- `js/*.js`: the game, split by feature. They are plain scripts sharing one global scope and load
  in the order listed in `index.html`, so code that runs at load time may only use things from
  earlier files.

## Develop and test

```sh
npm install
npm start          # http://localhost:4173/
npm test           # Playwright tests (Chromium)
npm run lint       # Prettier check + index.html stamps; `npm run format` fixes formatting
npm run stamp      # after changing anything in js/ or css/: re-stamps the file addresses in index.html
```

The first time, `npx playwright install chromium` downloads the browser the tests use.

Every script and stylesheet address in `index.html` ends in `?v=<fingerprint of the file>`. GitHub Pages lets
browsers reuse files for 10 minutes, and a page mixing new and old cached files breaks, so a changed file needs
a new address. `npm run lint` (and CI) fails if a stamp is out of date.
