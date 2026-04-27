# Sorghum Marker Review

Open `index.html` in a browser to review collaborator marker counts, curated marker filters, chromosome distribution, annotation summaries, and marker-level feedback.

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

Share `CURATOR_REVIEW_INSTRUCTIONS.md` with collaborators for step-by-step marker validation instructions.

1. Ask collaborators to choose their group from the `Group` dropdown.
2. They can search/filter the review queue and inspect markers in the current-marker panel.
3. They select one marker, several markers, or all visible markers.
4. They choose a decision, add an optional comment, and submit feedback.
5. If Google Forms is configured, one response row is sent per selected marker.
6. The dashboard also keeps a browser-local CSV backup.

Google Forms setup is documented in `GOOGLE_FORM_SETUP.md`. Until `feedback-config.js` is connected to a real form, feedback is stored locally and can be exported as `sorghum_marker_feedback.csv`.

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
