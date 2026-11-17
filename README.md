# GuxStickers Gallery

My digital art gallery. Most of my stuff is monsters, tentacles, eyeballs and animals, so I wanted the site to feel a little creepy and gallery-like instead of just being a grid of images.

You drag around a big dark canvas to find the art. There are glowing eyes in the background that follow your cursor. Hover a piece to blow it up, click it to see its own page with the title, where it's available and the price.

Built with React and Vite.

## Running it

```
npm install
npm run dev
```

Then open the link it gives you (usually http://localhost:5173).

To build it for real:

```
npm run build
```

The finished site ends up in `dist/`.

## Adding art

Drop PNGs into `src/art/` and they show up on their own. The gallery uses smaller thumbnails that get made automatically, and the full-size image is only loaded on the piece's page.

To give a piece a title, price, etc., add it to `src/art/info.json` using the exact file name:

```json
"Untitled_Artwork 58.png": {
  "title": "Eye Beast",
  "availability": "Prints on Patreon",
  "price": "$25",
  "link": "https://www.patreon.com/GuxStickers"
}
```

Anything you leave out falls back to `_default`. If there's no title it just uses the file name.

## Where stuff lives

- `src/App.jsx` - the gallery, dragging, zooming and page switching
- `src/layout.js` - where the art and eyes get placed
- `src/components/` - the eyes, tentacles, art page and about page
- `src/artist.js` - my name and links for the about page
- `src/styles.css` - all the styling

## Find me

- Patreon: [GuxStickers](https://www.patreon.com/GuxStickers)
- Instagram: [@guxstickers](https://www.instagram.com/guxstickers/)
- Reddit: [u/GuxStickers](https://www.reddit.com/user/GuxStickers/)
- Portfolio: [gsbirds.github.io/donut_portfolio](https://gsbirds.github.io/donut_portfolio/#/)

## Copyright

All artwork is © Gabby Burgard (GuxStickers). Please don't copy, repost, sell or train AI on it without asking me first.
