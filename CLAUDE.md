# The Jackrabbit Series — site notes

A static site served by GitHub Pages. There is no build step for the site itself:
the HTML in this repo is what visitors get.

## Git workflow

- Do the work on a branch cut from `main`.
- When the work is done and the user is happy with it, merge the branch into
  `main` in the local repository with a merge commit
  (`git merge --no-ff <branch>`). Don't open a pull request.
- Don't push. The user pushes `main` to GitHub themselves.

## Analytics: the umami snippet

Every **standalone** HTML page must carry the umami tracking snippet, placed
immediately before `</head>`:

```html
<script defer src="https://cloud.umami.is/script.js" data-website-id="49bd03b2-61a5-4ce1-b653-a2d3f4f22441"></script>
```

"Standalone" means any page a visitor can land on directly. That includes the
pages at the root, everything under `encyclopaedia/`, `trust-us/` and `short-stories/`,
`404.html`, and the entry page of each game — `Gilbert_s Quest.html`,
`stolen_freedom/index.html`, `Jackrabbit_hunt/index.html`,
`Aggie_game/index.html` and `tier_four/index.html`. New pages get it too.

Do **not** add it to:

- files that are internal to a game, such as `Aggie_game/scenes/*.html`, which
  load inside a game page that is already tracked;
- `googlecee4a38f115d2f04.html`, the Google site-verification file.

A quick check for pages that are missing it:

```bash
git ls-files '*.html' | while read -r f; do grep -q cloud.umami.is "$f" || echo "$f"; done
```

## The main nav and footer

The main site's header nav and footer are defined once, in
`_tools/layout.json`, and written into every page by a script. Never
hand-edit them in a page. Change the config, then run:

```bash
node _tools/layout.mjs
```

`node _tools/layout.mjs --check` lists out-of-date pages without changing
anything.

The script fills in whatever sits between the marker comments: the nav
between `<!-- main-nav: ... -->` and `<!-- /main-nav -->`, the footer between
`<!-- main-footer: ... -->` and `<!-- /main-footer -->`. It works out the
right paths for each page: `../` from `encyclopaedia/`, and `/` for
`404.html`. A new page gets both by copying an existing page, or by adding the
marker lines and running the script. `_tools/` is not published, because
Jekyll skips folders starting with `_`.

Outside this system:

- `contact.html` keeps its own author footer ("Tony Marks", with Trust Us and
  Short Stories links), so it has nav markers but no footer markers;
- `trust-us/` and `short-stories/` have their own navs and footers.

The Books item carries a sub-menu: The Jackrabbit Series (`books.html`),
Trust Us and Short Stories. It opens on hover for a mouse, and through the
chevron button (`.submenu-toggle`) for touch and keyboard. The styles are in
`css/styles.css` and the toggle is in `js/script.js`.

## Game folders hold build output

`stolen_freedom/`, `Aggie_game/` and `Jackrabbit_hunt/` are copied in from
their own projects. Anything hand-edited there — the umami snippet above
especially — is lost the next time the game is rebuilt and copied over, so
re-add it after each copy, and ideally keep it in the game's own source.

`tier_four/` is the exception: Tier Four is hand-written in this repo, so
edit it directly. Its development tools, checks and notes live in
`tier_four_dev/`, which is excluded from the published site; see
`tier_four_dev/STATUS.md`.
