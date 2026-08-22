# Graph Report - .  (2026-08-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 351 nodes · 907 edges · 24 communities (23 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- toast
- playerById
- app.js
- placeTokens
- openModal
- renderDashboard
- setupScout
- manifest.json
- curSport
- tapRenderPlayers
- feRedraw
- polisport.js
- renderWeightsEditor
- impFile
- aiRemoveBg
- openScoutTutorial
- marquee.js
- openTeamsMenu
- renderAttendance
- applyTheme
- pwaCheckNow
- renderCardStudioProps
- sw.js

## God Nodes (most connected - your core abstractions)
1. `toast()` - 39 edges
2. `save()` - 37 edges
3. `curSport()` - 30 edges
4. `openModal()` - 20 edges
5. `playerById()` - 18 edges
6. `getSeasonStats()` - 16 edges
7. `renderDashboard()` - 16 edges
8. `renderCalendar()` - 14 edges
9. `openPlayer()` - 13 edges
10. `setupScout()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `dbKey()` --calls--> `activeProfile()`  [EXTRACTED]
  app.js → app.js  _Bridges community 17 → community 0_
- `loadDB()` --calls--> `dbKey()`  [EXTRACTED]
  app.js → app.js  _Bridges community 0 → community 6_
- `renderCalendar()` --calls--> `today()`  [EXTRACTED]
  app.js → app.js  _Bridges community 4 → community 0_
- `renderDashboard()` --calls--> `today()`  [EXTRACTED]
  app.js → app.js  _Bridges community 4 → community 5_
- `buildPlayerPackage()` --calls--> `curSport()`  [EXTRACTED]
  app.js → app.js  _Bridges community 8 → community 1_

## Import Cycles
- None detected.

## Communities (24 total, 1 thin omitted)

### Community 0 - "toast"
Cohesion: 0.08
Nodes (51): activePlayers(), addEvent(), addExFromLib(), addPlayer(), calendarCSS(), calOpenScout(), calOpenTraining(), calSelect() (+43 more)

### Community 1 - "playerById"
Cohesion: 0.09
Nodes (40): buildPlayerPackage(), calcRow(), cIdb(), cIdbDel(), cIdbGet(), cIdbSet(), coachMediaCSS(), computeVoto() (+32 more)

### Community 2 - "app.js"
Cohesion: 0.05
Nodes (26): ATT_LABEL, ATT_STATES, ATTR_MAP, BASE_CARD_LAYOUT, CARD_ELEMENTS, CAT_COLOR, DB, DEFAULT_VOLLEY_WEIGHTS (+18 more)

### Community 3 - "placeTokens"
Cohesion: 0.13
Nodes (22): benchSubstitute(), bindDraw(), bindSoccerDrag(), clearDraw(), courtRect(), drawCourt(), fmzBadge(), getLineupCalcio() (+14 more)

### Community 4 - "openModal"
Cohesion: 0.10
Nodes (22): calToday(), cardStudioExport(), editResult(), eventsOn(), feOpenPresets(), fmtDateLong(), genRecurringDates(), isoOf() (+14 more)

### Community 5 - "renderDashboard"
Cohesion: 0.14
Nodes (18): applyTeamLogo(), brandCSS(), cardStudioCSS(), cardStudioLoadDraft(), cardStudioResetTier(), cardStudioTier(), courtSVG(), deepMerge() (+10 more)

### Community 6 - "setupScout"
Cohesion: 0.15
Nodes (18): blankStat(), buildScoutHead(), buildScoutTap(), fmtDate(), loadDB(), matchOptions(), populateScout(), populateTraining() (+10 more)

### Community 7 - "manifest.json"
Cohesion: 0.12
Nodes (16): background_color, categories, description, dir, display, icons, id, lang (+8 more)

### Community 8 - "curSport"
Cohesion: 0.23
Nodes (16): addExercise(), catsFor(), createLibExercise(), curSport(), exerciseKnown(), exKeyOf(), exLibCSS(), exLibFor() (+8 more)

### Community 9 - "tapRenderPlayers"
Cohesion: 0.20
Nodes (15): computeWhy(), TAP_FUNDS, TAP_GRADES, tapApply(), tapApplyOverride(), tapClearOverride(), tapDeriveRow(), tapGrade() (+7 more)

### Community 10 - "feRedraw"
Cohesion: 0.19
Nodes (15): feAdd(), feApplyModel(), feApplyModelObj(), feBindPointer(), feClear(), feDistToSeg(), feDrawArrow(), feDrawEl() (+7 more)

### Community 11 - "polisport.js"
Cohesion: 0.37
Nodes (12): applyAccent(), bnActive(), boot(), buildBottomNav(), ensureRoles(), gDB(), injectSportButton(), installReset() (+4 more)

### Community 12 - "renderWeightsEditor"
Cohesion: 0.22
Nodes (11): cssId(), renderWeightsEditor(), ROLE_ORDER, wGet(), wPreviewAll(), wResetAll(), wResetRole(), wSet() (+3 more)

### Community 13 - "impFile"
Cohesion: 0.28
Nodes (9): detectMatches(), impAnalyzeText(), impFile(), impIso(), impShow(), loadXLSX(), parseCSVText(), parseFlexDate() (+1 more)

### Community 14 - "aiRemoveBg"
Cohesion: 0.33
Nodes (7): aiRemoveBg(), blobToDataURL(), chromaApply(), chromaKeyDataURL(), loadImgly(), logoRemoveBg(), rpcAiRemove()

### Community 15 - "openScoutTutorial"
Cohesion: 0.33
Nodes (7): clampVoto(), getVolleyWeights(), openScoutTutorial(), openWeightsAdmin(), volleyVoto(), weightsCSS(), weightsExplainerHTML()

### Community 16 - "marquee.js"
Cohesion: 0.62
Nodes (6): boot(), css(), measure(), scan(), scheduleRescan(), wrap()

### Community 17 - "openTeamsMenu"
Cohesion: 0.40
Nodes (6): activeProfile(), createTeam(), getProfiles(), openTeamsMenu(), setProfiles(), switchTeam()

### Community 18 - "renderAttendance"
Cohesion: 0.40
Nodes (6): calOpenAttendance(), populateAtt(), renderAttendance(), renderAttSeason(), setAtt(), updateAttBar()

### Community 19 - "applyTheme"
Cohesion: 0.50
Nodes (4): applyTheme(), hexA(), setColor(), shade()

### Community 20 - "pwaCheckNow"
Cohesion: 0.67
Nodes (4): pwaCheckNow(), pwaCSS(), pwaMarkSettings(), pwaShowBanner()

### Community 21 - "renderCardStudioProps"
Cohesion: 0.67
Nodes (3): cardStudioEl(), cardStudioSet(), renderCardStudioProps()

## Knowledge Gaps
- **42 isolated node(s):** `MONTHS`, `SCOUT`, `DEFAULT_VOLLEY_WEIGHTS`, `WPREVIEW_CASE`, `DB` (+37 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `toast` to `playerById`, `app.js`, `placeTokens`, `openModal`, `renderDashboard`, `curSport`, `tapRenderPlayers`, `openScoutTutorial`, `openTeamsMenu`, `pwaCheckNow`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `save()` connect `toast` to `playerById`, `app.js`, `placeTokens`, `setupScout`, `curSport`, `feRedraw`, `renderAttendance`, `applyTheme`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `curSport()` connect `curSport` to `toast`, `playerById`, `app.js`, `placeTokens`, `renderDashboard`, `setupScout`, `tapRenderPlayers`, `feRedraw`, `openScoutTutorial`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `MONTHS`, `SCOUT`, `DEFAULT_VOLLEY_WEIGHTS` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `toast` be split into smaller, more focused modules?**
  _Cohesion score 0.08078431372549019 - nodes in this community are weakly interconnected._
- **Should `playerById` be split into smaller, more focused modules?**
  _Cohesion score 0.09102564102564102 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._