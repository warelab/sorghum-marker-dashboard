# Sorghum Marker Dashboard

Public collaborator review app for the sorghum 100K marker panel curation.

Open the GitHub Pages site:

```text
https://warelab.github.io/sorghum-marker-dashboard/
```

## What collaborators can do

- Review collaborator marker counts and trait coverage.
- Search and filter curated markers by source, trait, chromosome, priority, standard ID, and original marker name.
- Review marker-level details and standardized marker IDs.
- Add browser-local feedback for individual markers.
- Export `sorghum_marker_feedback.csv` and send it back to the project team.

## Feedback workflow

1. Enter reviewer name and group in the feedback panel.
2. Filter/search the curated catalog.
3. Click `Review` on any marker row.
4. Choose a decision and add a comment.
5. Click `Save feedback`.
6. Click `Export feedback CSV` and return the exported CSV.

Feedback is saved only in the reviewer browser until exported. This app has no backend database and does not automatically transmit feedback.

## Files

- `index.html` - app shell
- `styles.css` - dashboard styles
- `app.js` - filtering, table, export, and feedback behavior
- `data.js` - generated marker dashboard data
- `normalized_marker_catalog.tsv` - canonical ID mapping for curated markers
- `marker_nomenclature.md` - standard marker naming rules

## Updating the dashboard

The source curation lives in the private/project repository. Regenerate the dashboard bundle there, then copy the static files into this public repo.

Minimum files to update:

```text
index.html
styles.css
app.js
data.js
normalized_marker_catalog.tsv
marker_nomenclature.md
.nojekyll
```
