---
title: "Reading Sudan's Conflict Data: Surges, Hotspots and Trends in the Browser"
date: 2026-10-31
author: Amin Adnan Gasim
category: Humanitarian
readingTime: 8 min
description: "How the Sudan Conflicts dashboard turns 16,720 ACLED events into answers an information manager needs every week: where violence is rising beyond its normal level, which localities are newly affected, and where clusters of conflict form, computed in the browser with Poisson z-scores and Getis-Ord Gi*."
tags: [Sudan, ACLED, conflict analysis, spatial statistics, Getis-Ord Gi*, humanitarian information management, MapLibre]
---

# Reading Sudan's Conflict Data in the Browser

*Surges, hotspots and trends from ACLED, with statistics a reader can check*

**Since April 2023, ACLED has recorded 16,720 political violence events and 55,605 reported fatalities in Sudan's 189 localities. A map of totals shows where the war has been. It doesn't show what changed this quarter. The Sudan Conflicts dashboard adds that layer: it tests every locality against its own recent history, flags the ones that are newly affected, and finds statistically significant clusters, all in the visitor's browser, every time a filter changes.**

[Open the Sudan Conflicts dashboard →](/projects/acled-conflict-dashboard)

---

## The question behind it

When I worked with UN agencies, the weekly question from coordinators was rarely "where has there been violence?" Everyone knew. It was **"where is it getting worse, and is that real or noise?"** A locality going from 2 events to 4 is a 100% increase and means almost nothing. One going from 8 a month to 20 means a lot.

So the dashboard keeps the familiar parts, a choropleth by state and locality, monthly charts, a period slider and filters, and adds an **insights** layer that answers the "what changed" question with methods that hold up to scrutiny.

## What it found (data to mid-September 2026)

The latest complete window compares June–August 2026 with the six months before (December 2025 – May 2026). September is left out automatically because the month is not finished.

| Signal | Events | Fatalities |
| --- | --- | --- |
| Localities surging (z ≥ 3) | 10 | 18 |
| Strongest surge | Soudari, North Kordofan: 61 events vs 7.5 expected | Geisan, Blue Nile: 118 vs 19.5 expected |
| Newly affected localities | 5 | 10 |
| Hotspot localities (Gi*, 90% or more) | 34 | 38 |
| State with the largest rise | North Kordofan: 234 events vs 103 expected | |

The pattern the numbers draw is a war whose front has moved into **Kordofan**: Soudari, Gebrat Al Sheikh and Al Khiwai surge, while Dilling and Kadugli, the centres of earlier fighting, decline. The Gi* hotspots sit across North, West and South Kordofan and the central states. None of that is new to people following Sudan closely; the point is that the dashboard surfaces it in seconds, with a number attached to each claim.

![The Sudan Conflicts dashboard: a map of localities coloured by events, with surging localities highlighted and the insights panel listing them.](/images/acled.png "Figure 1. Sudan Conflicts with the insights layer: surging localities, newly affected areas and hotspots can each be drawn on the map.")

## How it works

### Data: one compact table

A small Node script turns the ACLED export into a JSON file of under 50 kilobytes: one row per locality and month, `[month, locality, events, fatalities]`, joined to the official administrative boundaries by pcode. Names are stored once and rows refer to them by index; Arabic names come from a separate lookup. The browser loads it in a blink.

### Surges: each locality against itself

For every locality, the dashboard compares the **last three complete months** with the **six months before**:

```
expected = baseline monthly mean × 3
z        = (recent − expected) / √max(expected, 1)
```

This is a Poisson z-score: event counts behave roughly like Poisson counts, whose variance equals their mean. Flooring the variance at 1 stops a quiet locality from producing an enormous score out of two events. A locality is a **surge** when z ≥ 3 and it has at least 10 events in the recent window; a **decline** is the mirror image.

**Newly affected** localities had no events at all in the baseline and now have at least three. They are often the most important signal: violence spreading to places that had been spared.

### Hotspots: Getis-Ord Gi*

A locality with many events surrounded by quiet ones is different from a whole region in conflict. Getis-Ord Gi* measures the second: for each locality, it compares the sum of (log) totals within 150 km, including the locality itself, with what the national average would predict. A high z means a cluster of high values, not one bright spot. Localities are flagged at 90%, 95% and 99% confidence.

Hotspots are always computed nationwide, because a spatial statistic needs every neighbour, and then narrowed to the selected state for display.

### Interaction

- **Overlay buttons** draw surges, newly affected areas or hotspots on the map, each with its own colours and legend.
- **Every list item is clickable** and zooms to the locality.
- Switching between **events and fatalities** recomputes everything: some places are violent but rarely deadly, and the reverse.
- Moving the **period slider** moves the comparison window with it, so you can ask the same question of any quarter since 2023.

### The optional AI assistant

The page also has an AI assistant that writes a short situation brief and turns plain-language questions ("Which localities in Darfur had the most fatalities in 2025?") into map filters. It runs through a small Cloudflare Worker and is off unless configured.

The design rule matters more than the feature: **the model never counts.** Every number in a brief comes from the statistics above, computed in the browser and passed to the model as data. The model can only explain them and choose from the dashboard's own filter values, so it can't invent a locality or a total.

## Limitations

- **ACLED records what is reported.** Coverage depends on media and partner reporting, which is thinner in remote areas and during communication blackouts. A quiet locality may be unreported, not peaceful.
- **Fatality figures are uncertain.** ACLED uses conservative estimates, and single events can carry large numbers that dominate a month.
- **Six months is a short memory.** The baseline adapts to a long war; a locality that has been violent for a year is "normal" by this test, even though it is not normal by any human standard.
- **The 150 km band is a choice.** Hotspots depend on it. It suits Sudan's locality sizes but would need retuning elsewhere.
- **Statistics prioritise attention; they don't replace analysis.** The dashboard tells you where to look first.

## What I learned

- **Compare places with themselves.** A per-locality baseline separates real escalation from places that are always busy.
- **Statistics people can check build trust.** Every flag can be explained in one sentence with two numbers.
- **Spatial statistics fit in a browser.** Gi* over 189 localities runs in milliseconds; there is no reason to precompute it.
- **Let AI explain, never count.** Keeping the numbers in code makes an AI layer safe to add.

## What's next

- **Population exposure:** weight events by the people living nearby, using WorldPop or the latest IOM displacement figures.
- **Event types:** separate battles, explosions and violence against civilians, which call for different responses.
- **Alerts:** a weekly digest of new surges for subscribed states.

If you coordinate humanitarian work on Sudan or the region and need conflict analysis, dashboards or training for your team, in Arabic or English, I am available for consulting: [info@coffeemap.dev](mailto:info@coffeemap.dev).

[Open the Sudan Conflicts dashboard →](/projects/acled-conflict-dashboard)

---

*Data: Armed Conflict Location & Event Data (ACLED), Sudan, April 2023 – September 2026; Sudan administrative boundaries (OCHA COD-AB). Stack: Next.js, TypeScript, MapLibre GL JS, Chart.js, Material UI.*
