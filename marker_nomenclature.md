# Curated Marker Nomenclature

The dashboard assigns every curated marker a stable `canonicalId` while preserving the collaborator-provided `Locus/Gene` value as `originalName`.

## Standard ID pattern

Use the smallest stable biological coordinate available:

```text
S100K-<CLASS>-<CHROMOSOME>-<POSITION_OR_INTERVAL>-<ALLELES_IF_SNP>
```

## Classes

| Class | Use |
|---|---|
| `SNP` | Single-position marker with reference and alternate allele fields |
| `QTL` | QTL interval or locus where the evidence/type indicates QTL mapping |
| `GENE` | Candidate gene, cloned gene, pathway gene, lncRNA target, or other gene interval |
| `NC` | Marker without usable chromosome coordinates |

## Coordinate rules

| Marker form | Canonical ID example |
|---|---|
| SNP | `S100K-SNP-SB01-001144852-C-T` |
| Gene interval | `S100K-GENE-SB01-007623632-007625890` |
| QTL interval | `S100K-QTL-SB03-045631816-054974726` |
| No coordinates | `S100K-NC-HAR-USDA-0007` |

## Field rules

- `S100K` identifies this sorghum 100K marker-panel curation.
- `SB01` through `SB10` are zero-padded sorghum chromosome labels.
- Positions are 1-based genomic coordinates, zero-padded to 9 digits for lexical sorting.
- SNP alleles use `REF-ALT`; missing alleles are written as `NA`.
- Coordinate-based IDs do not include trait or collaborator names because those can change as curation improves.
- No-coordinate IDs include a short source code and row serial so they remain traceable until coordinates are resolved.
- If two rows produce the same base ID, the generator appends `-02`, `-03`, and so on.

## Source codes

| Source | Code |
|---|---|
| `Harris/USDA` | `HAR-USDA` |
| `Behera/AAU` | `BEH-AAU` |
| `Tuinstra/Purdue` | `TUI-PUR` |
| `EIB/AgriPlex` | `EIB-AGR` |
| `Fattel/Clemson` | `FAT-CLE` |
| `Tadesse/USDA` | `TAD-USDA` |
| `Odeny/ICRISAT` | `ODE-ICR` |
| `Cuevas/USDA` | `CUE-USDA` |
| `Saini/TTU` | `SAI-TTU` |
| `Varma/SRM-IST` | `VAR-SRM` |
| `Marla/KSU` | `MAR-KSU` |
| `Yerka/YJ` | `YER-YJ` |
| `Enyew/WSU` | `ENY-WSU` |
| `Jura/SbMATE` | `JUR-SBM` |
| `Meseret/BI` | `MES-BI` |

## Generated files

Run:

```sh
python3 dashboard/scripts/build_dashboard_data.py
```

This updates:

- `dashboard/data.js`
- `dashboard/normalized_marker_catalog.tsv`
