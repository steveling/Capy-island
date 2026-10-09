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

## The move to capy.pocketgiggles.com

The same files are served at the old address (`https://steveling.github.io/Capy-island/`) and the new one
(`https://capy.pocketgiggles.com/`). `js/move.js` brings every player on a phone over: the old address packs them into
the new address's link after the `#` (cloud players as one-time moving codes, others as their whole island) and goes
there; the new address unpacks them as players. After that the old address just forwards. Add `?stay` to the old
address to keep playing there (e.g. to save a backup). The tests use `localhost` as the old address and `127.0.0.1` as
the new one (`window.CAPY_MOVE`).

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
