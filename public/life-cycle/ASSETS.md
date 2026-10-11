# Life-cycle layered assets

Edited with the built-in image-generation tool from `growth-soil.png`; original retained.

- `growth-soil-clean.png`: soil without the baked-in seed potato.
- `growth-seed.png`: isolated seed potato; animation alignment is handled in CSS.

## Soil edit prompt

Use case: precise-object-edit. Edit target: supplied transparent square soil-and-seed-potato image for a layered botanical web animation. Remove ONLY the central seed potato, all its pale sprouts and fine roots; replace their area with matching dark brown soil texture and shadows. Keep soil mound silhouette, position, scale, perspective, lighting, color, and all outer soil details unchanged. Keep the top half empty transparent, preserve original square composition and genuine transparent alpha outside the soil. No plant, no potato, no root, no text. Return one clean soil-only transparent PNG asset.

## Seed extraction prompt

Use case: background-extraction. Edit target: supplied seed potato on soil. Extract ONLY the exact central golden seed potato body, without any sprouts, roots or soil. Preserve its photoreal skin, eyes, soil specks, upper-left lighting, vertical pear-shaped orientation, original pixel location and original scale in the original square canvas. The potato stays centered at approximately x49%,y69%, from x42%-55% and y62%-75% of canvas. Everything else is genuinely transparent alpha: no soil mound, no roots, no pale sprouts, no plant, no shadow background, no text. Do NOT enlarge or center the potato within the canvas; retain original placement so the image can be layered over the supplied soil image.

## Animation basis

The seed piece supplies early energy; new tubers form separately on underground stems. See [University of Florida IFAS growth stages](https://ask.ifas.ufl.edu/publication/HS183). Shrinking/darkening is an illustrative visual cue for the original seed's depletion, not a calibrated prediction of decay. Day ranges are illustrative, not agronomic scheduling advice. Every rendered state is a deterministic function of the existing day slider; reversing the slider restores the same state.

