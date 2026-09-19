# The Jackrabbit Series — site notes

A static site served by GitHub Pages. There is no build step for the site itself:
the HTML in this repo is what visitors get.

## Analytics: the umami snippet

Every **standalone** HTML page must carry the umami tracking snippet, placed
immediately before `</head>`:

```html
<script defer src="https://cloud.umami.is/script.js" data-website-id="49bd03b2-61a5-4ce1-b653-a2d3f4f22441"></script>
```

"Standalone" means any page a visitor can land on directly. That includes the
pages at the root, everything under `encyclopaedia/` and `trust-us/`,
`404.html`, and the entry page of each game — `Gilbert_s Quest.html`,
`stolen_freedom/index.html`, `Jackrabbit_hunt/index.html` and
`Aggie_game/index.html`. New pages get it too.

Do **not** add it to:

- files that are internal to a game, such as `Aggie_game/scenes/*.html`, which
  load inside a game page that is already tracked;
- `googlecee4a38f115d2f04.html`, the Google site-verification file.

A quick check for pages that are missing it:

```bash
git ls-files '*.html' | while read -r f; do grep -q cloud.umami.is "$f" || echo "$f"; done
```

## Game folders hold build output

`stolen_freedom/`, `Aggie_game/` and `Jackrabbit_hunt/` are copied in from
their own projects. Anything hand-edited there — the umami snippet above
especially — is lost the next time the game is rebuilt and copied over, so
re-add it after each copy, and ideally keep it in the game's own source.
