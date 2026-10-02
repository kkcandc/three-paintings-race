# Blind Race — Three Studies

A static gallery of three original [Three.js](https://threejs.org/) scenes. Each lane is a generative study in the *energy* of a famous painting: a swirling night, a shore where time goes soft, and an impressionist poppy field. Compare them on one wall, or open any study full screen.

The format echoes a public experiment posted by [@thehypedotnews](https://x.com/thehypedotnews/status/2100736090839920888): three paintings, each written as a self-contained Three.js scene and judged by opening the file. This gallery is an educational fair-use homage. The scenes are not copies of the paintings, not affiliated with any museum or estate, and not offered for sale.

## Lanes

| Lane | Study | What you should feel |
| --- | --- | --- |
| I | [Night Swell](starry.html) | Cobalt ribbons, a cypress flame, a crescent, and stars. Move the pointer to rake light across the paint. |
| II | [Soft Hours](memory.html) | A pale bay, three gold watches losing their shape, a quiet sleeper, cliffs, and a small egg on the headland. |
| III | [Field of Strokes](poppies.html) | A windy meadow of red dabs, grass strokes, distant trees, and two walkers with a parasol. |

Textures (clock faces, shadow pools, the toon ramp) are drawn on canvas in code. Skies, swirls, and impasto are shaders. Nothing is fetched from a paid API.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints. `1`, `2`, and `3` focus a lane. `0` returns to the side-by-side wall.

## Production build

```bash
npm run build
npm run preview
```

The static site is the `dist/` folder. [Vercel](https://vercel.com/) detects Vite from `vercel.json`.

## Notes

These studies borrow palette, brush rhythm, and mood:

- Vincent van Gogh, *The Starry Night* (1889)
- Salvador Dalí, *The Persistence of Memory* (1931)
- Claude Monet’s poppy fields of the 1870s

They are transformative educational scenes for looking and comparing. They are not reproductions for sale.
