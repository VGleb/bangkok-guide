# Data model

The live website loads `places.json` as its authoritative curated place catalog. `updates.json` contains additional confirmed announcements. Both use `{version:1,updatedAt,items:[...]}` and are merged by stable `id`. New additions to the permanent catalog belong in `places.json`; temporary event announcements belong in `updates.json`.

Each entry requires a unique lowercase `id`, `title`, `kind`, and `area`. Recommended fields: `blurb`, `venue`, `mapQuery`, `url`, `source`, `priority` (1–3), `status`, optional `dates` (start/end), `days`, `notes`, and `eta` with `{min,max,via}`. Categories are the exact Russian labels defined in `app.js`. For precise new map markers use verified `geo:[latitude,longitude]`; omit when unknown (the map will display an approximate marker). Validate `mapQuery` for Google Maps. All ETAs are approximate from TRIBE Living Bangkok Sukhumvit 39, unless explicitly stated otherwise.

Before editing, read the latest remote contents and GitHub blob SHA. Modify only the affected records, preserve unrelated data, check both JSON files for duplicate places and retry by re-reading if a concurrent write changed the SHA. Do not hardcode curated places in `app.js`.

Private preferences and user markers are kept outside this public repository in `VGleb/chatgpt-bangkok`.
