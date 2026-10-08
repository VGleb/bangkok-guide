# Data model

The live website loads `places.json` as its authoritative curated place catalog. `updates.json` contains additional confirmed announcements. Both use `{version:1,updatedAt,items:[...]}` and are merged by stable `id`. New additions to the permanent catalog belong in `places.json`; temporary event announcements belong in `updates.json`.

Each entry requires a unique lowercase `id`, `title`, `area`, and non-empty `tags` array. Tags are user-facing and filterable: one card may belong to several concepts at once, for example `["Ресейл","Магазины","Gentle Monster"]`. Keep tags concise, stable, and deduplicated. Core tags currently used by the UI are `События`, `Выставки`, `Дизайн`, `Ресейл`, `Магазины`, `Спорт`, `Кофе`, `Еда и бары`, `Районы`, and `Природа`; additional specific tags such as brands are allowed and appear automatically in the filter bar.

`kind` is retained only as a legacy/primary-tag compatibility field while older data and private feedback still reference it. New code must filter and render by `tags`, not by equality with `kind`. When editing an existing entry, preserve `kind` unless there is a reason to change its primary classification, and always keep `tags` authoritative.

Recommended fields: `blurb`, `venue`, `mapQuery`, `url`, `source`, `priority` (1–3), `status`, optional `dates` (start/end), `days`, `notes`, and `eta` with `{min,max,via}`. For precise new map markers use verified `geo:[latitude,longitude]`; omit when unknown (the map will display an approximate marker). Validate `mapQuery` for Google Maps. All ETAs are approximate from TRIBE Living Bangkok Sukhumvit 39, unless explicitly stated otherwise.

Before editing, read the latest remote contents and GitHub blob SHA. Modify only the affected records, preserve unrelated data, check both JSON files for duplicate places and retry by re-reading if a concurrent write changed the SHA. Do not hardcode curated places in `app.js`.

Private preferences and user markers are kept outside this public repository in `VGleb/chatgpt-bangkok`. The personal `rating` field is a private feedback journal field (integer 1–10, or null when cleared), displayed as a compact `N/10` badge in the catalog and map popup. Any non-null rating implies that a place has been visited. Never put private ratings in public catalog JSON.
