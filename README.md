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
npm run lint       # Prettier check; `npm run format` fixes it
```

The first time, `npx playwright install chromium` downloads the browser the tests use.
