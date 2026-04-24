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
- Select one or more markers and submit one feedback row per marker.
- Send feedback to a linked Google Form when configured.
- Export `sorghum_marker_feedback.csv` as a backup.

## Feedback workflow

1. Enter reviewer name and group in the feedback panel.
2. Filter/search the curated catalog.
3. Select one marker, several markers, or all visible markers.
4. Choose a decision and add an optional comment.
5. Submit feedback for the selected markers.
6. Use `Export feedback CSV` as a backup if needed.

When `feedback-config.js` is connected to a real Google Form, each selected marker is submitted as one Google Sheet response row. Until then, feedback is saved locally in the reviewer browser.

## Files

- `index.html` - app shell
- `styles.css` - dashboard styles
- `app.js` - filtering, table, export, and feedback behavior
- `feedback-config.js` - Google Form endpoint and field mapping
- `data.js` - generated marker dashboard data
- `GOOGLE_FORM_SETUP.md` - Google Form setup instructions
- `normalized_marker_catalog.tsv` - canonical ID mapping for curated markers
- `marker_nomenclature.md` - standard marker naming rules

## Updating the dashboard

The source curation lives in the private/project repository. Regenerate the dashboard bundle there, then copy the static files into this public repo.

Minimum files to update:

```text
index.html
styles.css
app.js
feedback-config.js
GOOGLE_FORM_SETUP.md
data.js
normalized_marker_catalog.tsv
marker_nomenclature.md
.nojekyll
```
