---
title: "From Drone Survey to Handover: a 4D BIM Mosque in the Browser"
date: 2026-10-31
author: Amin Adnan Gasim
category: BIM & Digital Twins
readingTime: 7 min
description: "A mosque site in Aseer, Saudi Arabia, as an interactive 3D and 4D model: survey terrain and orthophoto, 674 clickable BIM elements, and a construction programme generated from the model's own geometry, from the first drone flight through earthworks and structure to handover, with cumulative costs."
tags: [BIM, 4D BIM, digital twin, Three.js, Revit, photogrammetry, construction, Saudi Arabia]
---

# From Drone Survey to Handover: a 4D BIM Mosque in the Browser

*Survey terrain, BIM data and a construction programme in one web page*

**The 3D Mosque Viewer puts a mosque site in Aseer, Saudi Arabia, at about 2,780 m above sea level, in the browser: a 0.5 m terrain model draped with the site orthophoto, a Revit model of 674 elements, each one clickable, and a 4D timeline that builds the project day by day. The programme isn't typed in by hand. It is generated from the model itself: a drone surveys the footprint, earthworks level the platform, an access road reaches the site, walls rise to their real heights level by level, and the costs accumulate as each package and element is completed.**

[Open the 3D Mosque Viewer →](/projects/3d-mosque-viewer)

---

## Why build it

Owners, approving bodies and communities rarely read drawings or open BIM software. They understand a model they can turn around, a timeline they can scrub, and a running total. I wanted to show that this can be delivered as a web page, with no installation, built from the data a surveyor and a design team already produce: a terrain model, an orthophoto and a Revit export.

It also connects two halves of my own work. The terrain, orthophoto and earthworks come from surveying and photogrammetry; the building comes from BIM. The interesting part is where they meet.

## What it shows

| Item | Value |
| --- | --- |
| BIM elements | 674, from a Revit-derived glTF model |
| Roofed area | about 3,095 m² |
| Prayer hall | about 1,513 m², capacity about 1,500 worshippers |
| Levels | ground floor to minaret top (+19.15 m) |
| Terrain | 0.5 m DTM with the site orthophoto |
| Building elements, indicative cost | SAR 6.9–10.8 million |
| Construction phases | survey, earthworks, access road, foundations, structure, windows and doors, finishes, external works, handover |

![The 3D Mosque Viewer: the mosque on its terrain with the site orthophoto, parking shades and landscaping, and the 4D timeline below.](/images/3d.png "Figure 1. The mosque on its survey terrain, with the 4D timeline and the BIM panel.")

## The building as data

Every element highlights on click and opens a BIM panel: English and Arabic names, IFC class, UniFormat code, level and zone, construction, Saudi Building Code and SASO references, thermal values, quantities measured from the geometry itself, an indicative cost range in SAR, install dates in Gregorian and Hijri, warranty and maintenance. The model can be coloured by category (walls, roofs, domes, windows, lighting, site structures) and the whole schedule downloads as CSV.

One honest note: the Revit export kept only element names. The properties are an **illustrative dataset**, generated to be plausible for the Saudi market (codes, specifications and costs) but not surveyed, as-built or quoted. The page says so. The point is the workflow, which works the same with a real model's data.

## 4D: a programme generated from geometry

My first version gave each category a date window and scattered elements inside it at random. It looked wrong immediately: windows floating in mid-air, a dome before its walls. So the programme is now derived from the model, following how a masonry and reinforced-concrete mosque is actually built:

1. **Drone survey and setting out.** A survey drone flies a pattern over the footprint, scanning only the area of the structures, while ground control is set out.
2. **Earthworks.** The site is cleared and the platform is cut and filled to level. Cut and fill volumes are computed from the DTM against the platform level.
3. **Access road.** An asphalt road is graded and laid from the existing road to the site, draped on the terrain.
4. **Foundations and ground slab** over the building's footprint.
5. **Structure.** Walls rise from their real base to their real top, level by level. Each roof slab is cast only once the walls below it are complete, with a pause for curing; crews work around the building, so walls on one side start a few days before the other. The minaret climbs section by section; the domes follow their supporting slab.
6. **Windows and doors** once the openings exist.
7. **Finishes** from the top down, as the scaffold comes off.
8. **External works:** boundary walls, paving, parking shades, stairs, railings, lighting, then landscaping.
9. **Handover.**

Elements grow upward from their base while in progress, so the timeline reads like a site visit rather than a slideshow. A scaffold follows the height the structure has reached.

## Costs that build up with the project

Two kinds of cost accumulate on the timeline:

- **Site works**, measured from the 3D site itself: the drone survey area, cleared and graded platform, excavation and engineered fill from the DTM, surplus disposal, the road's length and area with kerbs, the foundation area, and soft landscaping (topsoil, irrigation, turf, palms, shrubs, marble infill paving). Each is a work package with indicative 2023–24 Saudi unit-rate ranges.
- **Building elements**, from the BIM dataset, added as each element is completed.

The running total at any date is shown as a range, low to high, never as a single number, because that is what an early estimate honestly is.

## Making it look like a place

A model is only convincing if it looks like where it stands. The scene uses an HDRI sky with clouds, sun position and shadows, a day and night mode with pole lights and floodlights, palms and trees, traffic on the access road that routes around the building, and parking shades. The mosque itself has a red-sandstone and white-marble finish with an interlocking-paver courtyard. Textures are generated procedurally and mapped in world space, so they stay consistent across hundreds of elements without hand-unwrapping each one.

## How it works

- **Three.js** renders the GLB model, terrain and scene; the terrain is a heightmap decoded from a 16-bit PNG (R·256 + G), so 0.5 m elevation fits in a normal image.
- **The schedule** is computed on load from each element's bounding box (base, top, position) and category.
- **Site quantities** are measured from the same geometry: cut and fill by comparing the DTM with the platform level cell by cell, road length from its centreline curve.
- **Everything is static files** on shared hosting: the model, the terrain, the orthophoto and a JSON of BIM properties.

## Limitations

- **Illustrative data.** Properties, costs and dates are generated, not from a real project record.
- **Indicative rates.** Unit rates are market ranges, not a priced bill of quantities.
- **A typical programme, not a planned one.** Durations are typical rates for a building of this size and type; a real programme comes from the contractor's method and resources.
- **Large assets.** The model and orthophoto take a few seconds to load on a slow connection.

## What's next

- **IFC import** so a real project's model and properties load directly.
- **Actual versus planned:** compare drone surveys over time with the 4D programme to show progress and deviations.
- **Clash and quantity checks** between the survey and the model before construction starts.

If you develop, build or supervise projects and want your survey data and BIM model in a web page your stakeholders can open, I am available for consulting: [info@coffeemap.dev](mailto:info@coffeemap.dev).

[Open the 3D Mosque Viewer →](/projects/3d-mosque-viewer)

---

*Data: Revit-derived mosque model, 0.5 m DTM and orthophoto of the site; illustrative BIM properties and indicative Saudi-market costs. Stack: Three.js, glTF, WebGL, Next.js, TypeScript.*
