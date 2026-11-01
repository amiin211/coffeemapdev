---
title: "Finding the Gaps in Sudan's Humanitarian Response"
date: 2026-10-31
author: Amin Adnan Gasim
category: Humanitarian
readingTime: 7 min
description: "Joining OCHA's 3W response data to ACLED conflict events to answer three coordination questions for Sudan: which conflict-affected localities have the fewest partners, which core services are missing, and what would be lost if one organisation left."
tags: [Sudan, OCHA 3W, humanitarian coordination, gap analysis, ACLED, scenario simulation, MapLibre]
---

# Finding the Gaps in Sudan's Humanitarian Response

*A priority index, a partner-exit simulator and a coverage matrix, from two public datasets*

**OCHA's 3W data for Sudan records 7,517 reported activities by 165 organisations in 188 localities over the first half of 2026. On its own it shows who is where. Joined to ACLED conflict events for the same months, it shows something more useful: where people face violence with few partners and missing services. In the default view, 27 of the 132 conflict-affected localities have no partner in at least three of the five core clusters.**

[Open the 3W Humanitarian Mapping dashboard →](/projects/3w-humanitarian-mapping)

---

## Who does what where, and where nobody does

A "3W" (who does what, where) is the most basic coordination product in a humanitarian response. Clusters use it to avoid duplication and spot gaps. The usual dashboard maps activity counts by state and locality, with filters for cluster, organisation type and month. Mine does that too.

But activity counts answer "where is the response?", not "where is it missing?". A locality with few activities might be quiet and safe, or it might be under siege. The difference is in another dataset, so the **Response Gap Explorer** joins the two.

## Three tools

### 1. A priority index you can tune

Each locality gets four scores between 0 and 1:

| Factor | What it measures | Default weight |
| --- | --- | --- |
| Conflict | ACLED events over the 3W months, as a percentile rank | 3 |
| Partner scarcity | How few organisations report there, as an inverse percentile | 2 |
| Missing core clusters | Share of Health, WASH, Food Security, Protection and Nutrition with no partner | 2 |
| Declining presence | Fall in reported activities from the first to the second half of the period | 1 |

The index is their weighted mean. The weights are **sliders**, because priorities are a judgement: a protection cluster and a food security cluster will weigh the factors differently, and the map and ranked list update as they move.

With the default weights, the top of the list is **Al Quoz in South Kordofan** (37 conflict events, two partners, none of the five core clusters covered), followed by Abu Zabad, Bara, Gebrat Al Sheikh and Ar Reif Ash Shargi, all in Kordofan, where the conflict analysis shows violence rising.

Percentile ranks keep the factors comparable without assuming any of them is normally distributed, and they make the index robust to the very large numbers a few localities report.

### 2. What if a partner leaves?

Funding cuts, access restrictions and staff relocations remove organisations from places. The **partner-exit simulator** asks: if this organisation left, what would happen in each locality where it works?

- **Uncovered:** no partner left at all.
- **Core cluster lost:** it was the only partner in Health, WASH, Food Security, Protection or Nutrition there.
- **Reduced:** others remain, with less capacity.

Only core clusters count as a lost service. Losing a coordination forum or a logistics actor matters, but it is not a gap in services to people. In the current data, the largest single-organisation risk is one partner present in 45 localities: in 18 of them it is the only partner for at least one core cluster.

### 3. A coverage matrix

For the most conflict-affected localities, a matrix shows how many partners each core cluster has: zero cells stand out immediately. It is the table a cluster coordinator would otherwise build by hand in a spreadsheet each month.

![The 3W dashboard with the Response Gap Explorer: localities coloured by priority score, with the ranked list and partner-exit simulator.](/images/3w.png "Figure 1. The Response Gap Explorer: priority index on the map, ranked localities and the partner-exit simulator.")

## How it works

- **Two compact files.** Node scripts turn the OCHA 3W dataset and the ACLED export into small JSON tables (rows of indices, each name stored once; Arabic names come from a separate lookup).
- **One join key.** Localities are matched by state and name, with a fix for the two localities both called Ar Rahad, which 3W distinguishes by a suffix and the other datasets don't.
- **Everything in the browser.** Profiles, percentiles, the index, the exit simulation and the matrix are computed on the visitor's device and recomputed when a filter or weight changes. No AI and no API: every number traces back to the two public datasets.

## Limitations

- **3W shows what is reported.** Organisations that don't report to the 3W, including many local responders and mutual aid groups, are invisible here. A "gap" can be a reporting gap.
- **Activity counts are not people reached.** One partner may serve far more people than ten others. The index counts presence, not scale or quality.
- **Six months.** Presence change compares two halves of a short period and is shown only where there are enough activities to compare.
- **Conflict is not need.** Events are a proxy for risk; a full prioritisation would add displacement, food insecurity (IPC) and access constraints.

## What I learned

- **The most useful humanitarian analytics are joins.** Neither dataset answers the gap question alone.
- **Make the judgement explicit.** Sliders for weights turn a black-box ranking into a discussion people can have.
- **Scenario tools change the conversation.** "What if this partner leaves?" is asked in every funding crisis; answering it in a click makes the dependency visible before it becomes a gap.

## What's next

- **Add need:** IPC food insecurity phases and IOM displacement figures as factors.
- **People reached:** use reached figures where the 3W reports them, not only activity counts.
- **Exports:** one-page locality profiles for cluster meetings, in Arabic and English.

If you coordinate a cluster or an information management team and want gap analysis, 3W dashboards or training, in Arabic or English, I am available for consulting: [info@coffeemap.dev](mailto:info@coffeemap.dev).

[Open the 3W Humanitarian Mapping dashboard →](/projects/3w-humanitarian-mapping)

---

*Data: OCHA Sudan 3W response monitoring, January – June 2026; ACLED Sudan; Sudan administrative boundaries (OCHA COD-AB). Stack: Next.js, TypeScript, MapLibre GL JS, Chart.js, Material UI.*
