# Sorghum Marker Database Dashboard

Open `index.html` in a browser to review collaborator marker counts, curated marker filters, chromosome distribution, priority mix, annotation summaries, and marker-level feedback.

## Share with collaborators

This is a static web app. It can be hosted from any static file host, including GitHub Pages, Vercel, Netlify, an institutional web server, or a shared internal HTTP server.

GitHub Pages is configured by `.github/workflows/deploy-dashboard-pages.yml`. After this branch is merged to `main`, enable Pages with source set to `GitHub Actions` in the repository settings. The dashboard will publish at:

```text
https://warelab.github.io/sorghum_100k_marker_panel/
```

You can also run the workflow manually from the GitHub Actions tab with `Deploy marker dashboard to GitHub Pages`.

For a quick local preview:

```sh
cd dashboard
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Feedback workflow

1. Ask collaborators to enter their reviewer name and group in the left feedback panel.
2. They can filter/search the curated catalog and click `Review` on any marker row.
3. They choose a decision, add a comment, and click `Save feedback`.
4. Feedback is saved in their browser until they click `Export feedback CSV`.
5. They send the exported `sorghum_marker_feedback.csv` back to you.

Because this version has no backend database, feedback is not sent automatically. That keeps the app easy to share as static files and avoids account setup for collaborators.

## Refresh the data bundle

Run this from the repository root after updating the marker catalog or summary TSV files:

```sh
python3 dashboard/scripts/build_dashboard_data.py
```

The dashboard uses `data.js`, which is generated from:

- `marker_catalog_304_corrected.tsv`
- `marker_extraction_report.md`
- `results/summary_region_class.tsv`
- `results/summary_per_chromosome.tsv`
- `results/summary_per_gene.tsv`

The generator repairs the 8 concatenated Jura/SbMATE rows for dashboard display using the coordinate block documented in `marker_extraction_report.md`.

The generator also writes `normalized_marker_catalog.tsv`, which adds a stable `canonicalId` for every curated marker while keeping the collaborator-provided name in `originalName`. See `marker_nomenclature.md` for the naming rules.
