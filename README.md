# Sinh Hoá 4.0 — static website

Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Run on localhost

From this folder, either:

```bash
python3 -m http.server 8000
```

or

```bash
npx serve .
```

then open http://localhost:8000 (or the URL `serve` prints).
You can also just double-click `index.html`.

## Structure

```
index.html          Home (Trang chủ)
khoa-hoc.html       Khoá học
css/base.css        Design tokens (from the Figma variables), reset, text styles
css/components.css  Header, footer, buttons, chips, tabs, cards, pagination…
css/home.css        Home-only sections
css/courses.css     Khoá học-only sections
js/main.js          Filters, carousels, search/sort, pagination, consultation form
assets/             Optimised images (WebP) and SVG icons
design-assets/      Original full-size PNG exports from Figma (not used by the pages)
```

## Notes

- The header and footer are repeated in both HTML files — edit both when changing them.
- Course cards carry `data-*` attributes (`data-categories`, `data-formats`, `data-price`, `data-rating`, `data-offer`)
  that `js/main.js` uses for filtering and sorting. Keep them in sync when adding a course.
- Pagination shows 5 pages (`data-total` on `.pagination`) as in the design; it is a placeholder until there is an API.
- The consultation form validates and logs the data to the console — see the `TODO` in `js/main.js` to connect a backend.
