# Google Form Feedback Setup

Use this guide to connect the dashboard feedback panel to a central Google Sheet.

## 1. Create the form

Create a new Google Form named:

```text
Sorghum Marker Review Feedback
```

Add these fields in this order:

| Field label | Type |
|---|---|
| `canonicalId` | Short answer |
| `originalName` | Short answer |
| `trait` | Short answer |
| `source` | Short answer |
| `reviewerName` | Short answer |
| `reviewerGroup` | Short answer |
| `decision` | Multiple choice |
| `comment` | Paragraph |
| `reviewedAt` | Short answer |

For `decision`, add exactly these choices:

```text
confirm
revise
remove
question
```

In the form `Responses` tab, link responses to a Google Sheet.

## 2. Get the form action URL

Open the live form and copy the form URL. It will look like:

```text
https://docs.google.com/forms/d/e/FORM_ID/viewform
```

The dashboard needs the response endpoint:

```text
https://docs.google.com/forms/d/e/FORM_ID/formResponse
```

## 3. Get field entry IDs

1. In Google Forms, open the three-dot menu.
2. Choose `Get pre-filled link`.
3. Enter recognizable test values, for example:
   - `TEST_CANONICAL_ID`
   - `TEST_ORIGINAL_NAME`
   - `TEST_TRAIT`
   - `TEST_SOURCE`
   - `TEST_REVIEWER`
   - `TEST_GROUP`
   - `confirm`
   - `TEST_COMMENT`
   - `TEST_REVIEWED_AT`
4. Click `Get link` and copy the generated URL.
5. The URL contains pairs like:

```text
entry.123456789=TEST_CANONICAL_ID
entry.987654321=TEST_ORIGINAL_NAME
```

Map each `entry.xxxxx` value to the matching dashboard field.

## 4. Update dashboard config

Edit `feedback-config.js`:

```js
window.FEEDBACK_FORM_CONFIG = {
  enabled: true,
  formActionUrl: "https://docs.google.com/forms/d/e/FORM_ID/formResponse",
  entryIds: {
    canonicalId: "entry.123456789",
    originalName: "entry.987654321",
    trait: "entry.333333333",
    source: "entry.444444444",
    reviewerName: "entry.555555555",
    reviewerGroup: "entry.666666666",
    decision: "entry.777777777",
    comment: "entry.888888888",
    reviewedAt: "entry.999999999",
  },
};
```

Keep `Export feedback CSV` available as a backup.

## 5. Test before sharing

1. Open the dashboard.
2. Select one marker.
3. Submit `confirm`.
4. Confirm one row appears in the linked Google Sheet.
5. Filter by one collaborator, click `Select all visible`, submit, and confirm one row per marker appears.

Google Form submissions use browser `no-cors` mode, so the dashboard can only confirm that the browser accepted the submission request. The linked response sheet is the source of truth.
