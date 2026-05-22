#!/usr/bin/env python3
"""Build the static data bundle used by the marker dashboard."""

from __future__ import annotations

import csv
import json
import re
from collections import Counter
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "dashboard" / "data.js"
NORMALIZED_OUT = ROOT / "dashboard" / "normalized_marker_catalog.tsv"
UPDATED_NORMALIZED_IN = ROOT / "dashboard" / "normalized_marker_catalog_updated.tsv"
SNP_NON_OVERLAP = ROOT / "dashboard" / "snp_markers_non_overlapping.tsv"
NON_SNP_NON_OVERLAP = ROOT / "dashboard" / "non_snp_markers_non_overlapping.tsv"
MESERET_PANEL = ROOT / "Meseret_Wondifraw_BI" / "Sorghum_Panel_Shared.xlsb"
AGRIPLEX_MID_DENSITY_VCF = ROOT / "marker_list" / "2023.CSHL.397samples.SAP.fixed.header.uniqcontig.sorted.vcf"
MURAL_ETAL_UB_MARKERS = ROOT / "Ravi_Mural" / "Marker_Array_Design_Final.csv"


COLLABORATOR_META = {
    "Harris/USDA": {
        "display": "Karen Harris",
        "institution": "USDA-ARS, Tifton, GA",
        "focus": "Root-knot nematode resistance",
    },
    "Behera/AAU": {
        "display": "Partha Behera",
        "institution": "Assam Agricultural University",
        "focus": "Forage sorghum adaptive traits",
    },
    "Tuinstra/Purdue": {
        "display": "Mitchell Tuinstra",
        "institution": "Purdue University",
        "focus": "Functional trait markers",
    },
    "EIB/AgriPlex": {
        "display": "EIB/AgriPlex",
        "institution": "ICRISAT / Industry",
        "focus": "Trait-linked SNP panel",
    },
    "Agriplex mid density markers": {
        "display": "Agriplex mid density markers",
        "institution": "ICRISAT / EiB",
        "focus": "Mid-density trait-linked SNP panel",
    },
    "Fattel/Clemson": {
        "display": "Leila Fattel",
        "institution": "Clemson University",
        "focus": "Sugar accumulation and transport",
    },
    "Tadesse/USDA": {
        "display": "Dimiru Tadesse",
        "institution": "USDA-ARS",
        "focus": "Photoperiod pathway genes",
    },
    "ICRISAT/EiB": {
        "display": "Damaris Odeny",
        "institution": "ICRISAT",
        "focus": "Drought and Striga resistance",
    },
    "Cuevas/USDA": {
        "display": "Hugo Cuevas",
        "institution": "USDA-ARS",
        "focus": "Anthracnose and rust resistance",
    },
    "Saini/TTU": {
        "display": "Dinesh Saini",
        "institution": "Texas Tech University",
        "focus": "Functional traits and QTLs",
    },
    "RajaNS/SRM-IST": {
        "display": "Raja Varma",
        "institution": "SRM Institute of Science & Technology",
        "focus": "lncRNA regulatory networks",
    },
    "Marla/KSU": {
        "display": "Sandeep Marla",
        "institution": "Kansas State University",
        "focus": "STRAIT-KIN CSHL 100k panel markers",
    },
    "Yerka/YJ": {
        "display": "Yerka YJ",
        "institution": "GWAS panel",
        "focus": "Grain composition",
    },
    "Enyew/WSU": {
        "display": "Muluken Enyew",
        "institution": "Washington State University",
        "focus": "Agronomic traits and root architecture",
    },
    "Jura/SbMATE": {
        "display": "Jura Magalhaes",
        "institution": "SbMATE aluminum tolerance",
        "focus": "AltSB/SbMATE functional markers",
    },
    "Meseret/BI": {
        "display": "Meseret Wondifraw",
        "institution": "ICRISAT / Bioversity International",
        "focus": "100K SNP array panel design",
    },
    "BI/ICRISAT": {
        "display": "BI/ICRISAT",
        "institution": "Bioversity International / ICRISAT",
        "focus": "100K SNP array panel design",
    },
    "Mural_etal_UB": {
        "display": "Mural et al. UB",
        "institution": "University of Bonn",
        "focus": "High-quality GWAS marker set",
    },
    "AAU-SLU Biotech/Sida": {
        "display": "AAU-SLU Biotech/Sida",
        "institution": "AAU / SLU / Sida",
        "focus": "Agronomic trait GWAS markers",
    },
}


SOURCE_CODES = {
    "Harris/USDA": "HAR-USDA",
    "Behera/AAU": "BEH-AAU",
    "Tuinstra/Purdue": "TUI-PUR",
    "EIB/AgriPlex": "EIB-AGR",
    "Agriplex mid density markers": "AGR-MID",
    "Fattel/Clemson": "FAT-CLE",
    "Tadesse/USDA": "TAD-USDA",
    "ICRISAT/EiB": "ODE-ICR",
    "Cuevas/USDA": "CUE-USDA",
    "Saini/TTU": "SAI-TTU",
    "RajaNS/SRM-IST": "VAR-SRM",
    "Marla/KSU": "MAR-KSU",
    "Yerka/YJ": "YER-YJ",
    "Enyew/WSU": "ENY-WSU",
    "Jura/SbMATE": "JUR-SBM",
    "Meseret/BI": "MES-BI",
    "BI/ICRISAT": "BI-ICRISAT",
    "Mural_etal_UB": "MUR-UB",
    "AAU-SLU Biotech/Sida": "AAU-SLU",
}

SOURCE_ALIASES = {
    "Odeny/ICRISAT": "ICRISAT/EiB",
    "Varma/SRM-IST": "RajaNS/SRM-IST",
}


SBMATE_RE = re.compile(
    r"^(?P<idx>\d+)Aluminum tolerance(?P<locus>SbMATE_\d+?)"
    r"(?P<chrom>3)(?P<start>71104827)(?P<end>71108073)"
    r"(?P<ref>[ACGT])(?P<alt>[ACGT])"
    r"SbMATE functional marker \(PMID:24498106\)"
    r"(?P<priority>2)Jura/SbMATESNP$"
)


def clean_int(value: str) -> int | None:
    value = (value or "").replace(",", "").strip()
    if not value or value == "-":
        return None
    try:
        return int(value)
    except ValueError:
        return None


def normalize_chrom(value: object) -> str:
    text = str(value or "").strip()
    if not text or text in {"-", "nan", "None"}:
        return "-"
    text = re.sub(r"^(chr|Chr|CHR)", "", text)
    text = text.lstrip("0") or "0"
    return text


def clean_allele(value: str) -> str:
    value = (value or "").strip().upper()
    value = re.sub(r"\s*\([^)]*\)", "", value)
    value = re.sub(r"[^A-Z0-9-]+", "", value)
    return value if value and value != "-" else "NA"


def source_code(source: str) -> str:
    source = SOURCE_ALIASES.get(source, source)
    if source in SOURCE_CODES:
        return SOURCE_CODES[source]
    code = re.sub(r"[^A-Za-z0-9]+", "-", source.upper()).strip("-")
    return code[:12] or "UNKNOWN"


def normalize_source(source: object) -> str:
    text = str(source or "").strip()
    return SOURCE_ALIASES.get(text, text)


def marker_class(row: dict[str, object]) -> str:
    marker_type = str(row.get("markerType") or "").upper()
    evidence = str(row.get("evidence") or "").upper()
    locus = str(row.get("locus") or "").upper()
    if "SNP" in marker_type:
        return "SNP"
    if "QTL" in marker_type or "QTL" in evidence or locus.startswith("QTL"):
        return "QTL"
    if marker_type == "NO_COORDS":
        return "NC"
    return "GENE"


def marker_type_group(row: dict[str, object]) -> str:
    marker_type = str(row.get("markerType") or "").upper()
    return "SNP" if marker_type == "SNP" else "Non-SNP"


def apply_marker_type_group(rows: list[dict[str, object]]) -> None:
    for row in rows:
        row["markerTypeGroup"] = marker_type_group(row)


def canonical_id(row: dict[str, object], fallback_serial: int) -> str:
    cls = marker_class(row)
    chrom = str(row.get("chrom") or "").strip()
    start = row.get("posStart")
    end = row.get("posEnd")
    source = source_code(str(row.get("source") or ""))

    if chrom and chrom != "-" and isinstance(start, int):
        chrom_key = f"SB{int(chrom):02d}" if chrom.isdigit() else f"SB{chrom}"
        start_key = f"{start:09d}"
        if cls == "SNP":
            ref = clean_allele(str(row.get("ref") or ""))
            alt = clean_allele(str(row.get("alt") or ""))
            return f"S100K-SNP-{chrom_key}-{start_key}-{ref}-{alt}"
        if isinstance(end, int) and end != start:
            return f"S100K-{cls}-{chrom_key}-{start_key}-{end:09d}"
        return f"S100K-{cls}-{chrom_key}-{start_key}"

    return f"S100K-{cls}-{source}-{fallback_serial:04d}"


def add_canonical_ids(rows: list[dict[str, object]]) -> None:
    seen: Counter[str] = Counter()
    for serial, row in enumerate(rows, start=1):
        base = canonical_id(row, serial)
        seen[base] += 1
        row["canonicalId"] = base if seen[base] == 1 else f"{base}-{seen[base]:02d}"
        row["sourceCode"] = source_code(str(row.get("source") or ""))
        row["originalName"] = row.get("locus", "")


def normalized_row(raw: list[str]) -> dict[str, object] | None:
    if len(raw) >= 12:
        return {
            "index": raw[0],
            "trait": raw[1],
            "locus": raw[2],
            "chrom": raw[3],
            "posStart": clean_int(raw[4]),
            "posEnd": clean_int(raw[5]),
            "ref": raw[6],
            "alt": raw[7],
            "evidence": raw[8],
            "priority": raw[9],
            "source": normalize_source(raw[10]),
            "markerType": raw[11],
        }

    match = SBMATE_RE.match(raw[0] if raw else "")
    if not match:
        return None

    return {
        "index": match.group("idx"),
        "trait": "Aluminum tolerance",
        "locus": match.group("locus"),
        "chrom": match.group("chrom"),
        "posStart": clean_int(match.group("start")),
        "posEnd": clean_int(match.group("end")),
        "ref": match.group("ref"),
        "alt": match.group("alt"),
        "evidence": "SbMATE functional marker (PMID:24498106)",
        "priority": match.group("priority"),
        "source": "Jura/SbMATE",
        "markerType": "SNP",
    }


def read_catalog() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    with (ROOT / "marker_catalog_304_corrected.tsv").open(newline="") as handle:
        reader = csv.reader(handle, delimiter="\t")
        next(reader)
        for raw in reader:
            row = normalized_row(raw)
            if row:
                rows.append(row)
    add_canonical_ids(rows)
    apply_marker_type_group(rows)
    return rows


def read_normalized_catalog(path: Path) -> list[dict[str, object]]:
    if not path.exists():
        return []

    rows: list[dict[str, object]] = []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        for raw in reader:
            source = normalize_source(raw.get("source") or "Unspecified")
            row: dict[str, object] = {
                "canonicalId": str(raw.get("canonicalId") or "").strip(),
                "originalName": str(raw.get("originalName") or raw.get("locus") or "").strip(),
                "trait": str(raw.get("trait") or "").strip() or "Unspecified",
                "markerType": str(raw.get("markerType") or "").strip() or "Unspecified",
                "chrom": normalize_chrom(raw.get("chrom") or "-"),
                "posStart": clean_int(str(raw.get("posStart") or "")),
                "posEnd": clean_int(str(raw.get("posEnd") or "")),
                "ref": str(raw.get("ref") or "-").strip() or "-",
                "alt": str(raw.get("alt") or "-").strip() or "-",
                "priority": str(raw.get("priority") or "").strip(),
                "source": source,
                "sourceCode": str(raw.get("sourceCode") or "").strip() or source_code(source),
                "evidence": str(raw.get("evidence") or "").strip(),
                "genomeVersion": str(raw.get("genomeVersion") or "BTx623_NCBIv3").strip(),
            }
            row["locus"] = row["originalName"]
            if not row["canonicalId"]:
                row["canonicalId"] = canonical_id(row, len(rows) + 1)
            row["markerTypeGroup"] = marker_type_group(row)
            rows.append(row)

    seen: Counter[str] = Counter()
    for row in rows:
        canonical = str(row.get("canonicalId") or "")
        seen[canonical] += 1
        if seen[canonical] > 1:
            row["canonicalId"] = f"{canonical}-{seen[canonical]:02d}"
    return rows


def read_meseret_panel() -> list[dict[str, object]]:
    if not MESERET_PANEL.exists():
        return []

    panel = pd.read_excel(MESERET_PANEL, sheet_name="Sorghum_Panel_Shared", engine="pyxlsb")
    panel = panel.rename(columns=str.strip)
    rows: list[dict[str, object]] = []

    for i, raw in panel.iterrows():
        chrom = normalize_chrom(raw.get("chrom"))
        pos = clean_int(str(raw.get("position", "")))
        marker = str(raw.get("marker") or "").strip()
        group = str(raw.get("group") or "").strip()
        note = str(raw.get("Note") or "").strip()
        eibv2 = str(raw.get("EiBv2") or "").strip().lower()

        if chrom == "-" or pos is None:
            continue

        trait = group if group else "Array panel"
        evidence_bits = ["100K SNP array panel design"]
        if note:
            evidence_bits.append(note)
        if eibv2 in {"yes", "no"}:
            evidence_bits.append(f"EiBv2={eibv2}")

        rows.append(
            {
                "index": f"MES-{i + 1}",
                "trait": trait,
                "locus": marker or f"MESERET_{chrom}_{pos}",
                "chrom": chrom,
                "posStart": pos,
                "posEnd": pos,
                "ref": "-",
                "alt": "-",
                "evidence": " | ".join(evidence_bits),
                "priority": "3",
                "source": "Meseret/BI",
                "markerType": "SNP",
                "genomeVersion": "BTx623_NCBIv3",
            }
        )

    return rows


def read_agriplex_mid_density() -> list[dict[str, object]]:
    if not AGRIPLEX_MID_DENSITY_VCF.exists():
        return []

    rows: list[dict[str, object]] = []
    with AGRIPLEX_MID_DENSITY_VCF.open(newline="", encoding="utf-8-sig") as handle:
        variant_index = 0
        for line in handle:
            if line.startswith("#"):
                continue

            fields = line.rstrip("\n").split("\t")
            if len(fields) < 5:
                continue

            chrom = normalize_chrom(fields[0])
            pos = clean_int(fields[1])
            marker_id = fields[2].strip()
            ref = clean_allele(fields[3])
            alt = clean_allele(fields[4])

            if chrom == "-" or pos is None:
                continue

            variant_index += 1
            default_locus = f"AGR_MID_SB{int(chrom):02d}_{pos}" if chrom.isdigit() else f"AGR_MID_{chrom}_{pos}"
            rows.append(
                {
                    "index": f"AGR-MID-{variant_index:04d}",
                    "trait": "Agriplex mid density markers",
                    "locus": marker_id or default_locus,
                    "chrom": chrom,
                    "posStart": pos,
                    "posEnd": pos,
                    "ref": ref,
                    "alt": alt,
                    "evidence": "2023 CSHL SAP 397-sample VCF",
                    "priority": "",
                    "source": "Agriplex mid density markers",
                    "markerType": "SNP",
                    "genomeVersion": "BTx623_NCBIv3",
                }
            )

    return rows


def read_mural_etal_ub_markers() -> list[dict[str, object]]:
    if not MURAL_ETAL_UB_MARKERS.exists():
        return []

    rows: list[dict[str, object]] = []
    with MURAL_ETAL_UB_MARKERS.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        for i, raw in enumerate(reader, start=1):
            chrom = normalize_chrom(raw.get("CHROM"))
            pos = clean_int(str(raw.get("POS") or ""))
            marker_id = str(raw.get("Marker_ID") or raw.get("SNP") or "").strip()
            trait = str(raw.get("Trait") or "").strip() or "Agriplex mid density markers"

            if chrom == "-" or pos is None:
                continue

            evidence_bits = ["Agriplex mid density markers"]
            method = str(raw.get("Method") or "").strip()
            support = str(raw.get("Method_Support") or "").strip()
            quality = str(raw.get("Quality_Tier") or raw.get("Quality_Class") or "").strip()
            pvalue = str(raw.get("Pvalue") or "").strip()
            best_log10p = str(raw.get("Best_log10P") or raw.get("Neg_log10pvalue") or "").strip()
            effect = str(raw.get("Effect") or "").strip()

            if method:
                evidence_bits.append(f"Method={method}")
            if support:
                evidence_bits.append(f"Method_Support={support}")
            if quality:
                evidence_bits.append(f"Quality={quality}")
            if pvalue:
                evidence_bits.append(f"P={pvalue}")
            if best_log10p:
                evidence_bits.append(f"Best_log10P={best_log10p}")
            if effect:
                evidence_bits.append(f"Effect={effect}")

            priority = "1" if quality == "Tier1_All3Methods" else "2" if quality == "Tier2_TwoMethods" else "3"

            default_locus = f"MUR_UB_SB{int(chrom):02d}_{pos}" if chrom.isdigit() else f"MUR_UB_{chrom}_{pos}"
            rows.append(
                {
                    "index": f"MUR-UB-{i:04d}",
                    "trait": trait,
                    "locus": marker_id or default_locus,
                    "chrom": chrom,
                    "posStart": pos,
                    "posEnd": pos,
                    "ref": "-",
                    "alt": "-",
                    "evidence": " | ".join(evidence_bits),
                    "priority": priority,
                    "source": "Mural_etal_UB",
                    "markerType": "SNP",
                    "genomeVersion": "BTx623_NCBIv3",
                }
            )

    return rows


def read_summary(path: str) -> list[dict[str, object]]:
    with (ROOT / path).open(newline="") as handle:
        return list(csv.DictReader(handle, delimiter="\t"))


def read_non_overlapping_catalog() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for path in (SNP_NON_OVERLAP, NON_SNP_NON_OVERLAP):
        if path.exists():
            rows.extend(read_normalized_catalog(path))
    return rows


def top_counts(rows: list[dict[str, object]], key: str, limit: int | None = None) -> list[dict[str, object]]:
    counts = Counter(str(row.get(key) or "Unspecified") for row in rows)
    items = [{"name": name, "count": count} for name, count in counts.most_common()]
    return items if limit is None else items[:limit]


def collaborator_rows(catalog: list[dict[str, object]]) -> list[dict[str, object]]:
    counts = Counter(str(row["source"]) for row in catalog)
    result = []
    for source, count in counts.most_common():
        meta = COLLABORATOR_META.get(source, {})
        result.append(
            {
                "source": source,
                "collaborator": meta.get("display", source),
                "institution": meta.get("institution", ""),
                "focus": meta.get("focus", ""),
                "count": count,
                "catalogScope": "array panel" if source == "Meseret/BI" else "curated catalog",
            }
        )
    return result


def write_normalized_catalog(catalog: list[dict[str, object]]) -> None:
    fields = [
        "canonicalId",
        "originalName",
        "trait",
        "markerType",
        "chrom",
        "posStart",
        "posEnd",
        "ref",
        "alt",
        "priority",
        "source",
        "sourceCode",
        "evidence",
        "genomeVersion",
    ]
    with NORMALIZED_OUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, delimiter="\t", extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows({field: row.get(field) or "-" for field in fields} for row in catalog)


def main() -> None:
    updated_catalog = read_normalized_catalog(UPDATED_NORMALIZED_IN)
    if updated_catalog:
        full_catalog = updated_catalog
        non_overlapping_catalog = read_non_overlapping_catalog()
        catalog = non_overlapping_catalog if non_overlapping_catalog else updated_catalog
        agriplex_mid_density_catalog = [r for r in full_catalog if str(r.get("source") or "") == "Agriplex mid density markers"]
        mural_etal_ub_catalog = [r for r in full_catalog if str(r.get("source") or "") == "Mural_etal_UB"]
        meseret_catalog = [r for r in full_catalog if str(r.get("source") or "") in {"Meseret/BI", "BI/ICRISAT"}]
        curated_catalog = [
            r
            for r in full_catalog
            if str(r.get("source") or "") not in {"Agriplex mid density markers", "Mural_etal_UB", "Meseret/BI", "BI/ICRISAT"}
        ]
        generated_from = [
            "dashboard/normalized_marker_catalog_updated.tsv",
            "dashboard/snp_markers_non_overlapping.tsv",
            "dashboard/non_snp_markers_non_overlapping.tsv",
            "results/summary_region_class.tsv",
            "results/summary_per_chromosome.tsv",
            "results/summary_per_gene.tsv",
        ]
    else:
        curated_catalog = read_catalog()
        agriplex_mid_density_catalog = read_agriplex_mid_density()
        mural_etal_ub_catalog = read_mural_etal_ub_markers()
        meseret_catalog = read_meseret_panel()
        catalog = curated_catalog + agriplex_mid_density_catalog + mural_etal_ub_catalog + meseret_catalog
        add_canonical_ids(catalog)
        apply_marker_type_group(catalog)
        generated_from = [
            "marker_catalog_304_corrected.tsv",
            "marker_list/2023.CSHL.397samples.SAP.fixed.header.uniqcontig.sorted.vcf",
            "Ravi_Mural/Marker_Array_Design_Final.csv",
            "Meseret_Wondifraw_BI/Sorghum_Panel_Shared.xlsb",
            "marker_extraction_report.md",
            "results/summary_region_class.tsv",
            "results/summary_per_chromosome.tsv",
            "results/summary_per_gene.tsv",
        ]

    write_normalized_catalog(catalog)
    region_summary = read_summary("results/summary_region_class.tsv")
    chromosome_annotation = read_summary("results/summary_per_chromosome.tsv")
    dense_genes = read_summary("results/summary_per_gene.tsv")[:20]
    marker_type_groups = Counter(row.get("markerTypeGroup") for row in catalog)

    payload = {
        "generatedFrom": generated_from,
        "totals": {
            "curatedMarkers": len(curated_catalog),
            "agriplexMidDensityMarkers": len(agriplex_mid_density_catalog),
            "muralEtalUbMarkers": len(mural_etal_ub_catalog),
            "arrayPanelMarkers": len(meseret_catalog),
            "totalMarkers": len(catalog),
            "snpMarkers": marker_type_groups.get("SNP", 0),
            "nonSnpMarkers": marker_type_groups.get("Non-SNP", 0),
            "collaborators": len({row["source"] for row in catalog if row.get("source")}),
            "chromosomes": len({row["chrom"] for row in catalog if row.get("chrom") and row["chrom"] != "-"}),
        },
        "catalog": catalog,
        "collaborators": collaborator_rows(catalog),
        "traitCounts": top_counts(catalog, "trait"),
        "chromosomeCounts": top_counts(catalog, "chrom"),
        "priorityCounts": top_counts(catalog, "priority"),
        "markerTypeCounts": top_counts(catalog, "markerType"),
        "regionSummary": region_summary,
        "chromosomeAnnotation": chromosome_annotation,
        "denseGenes": dense_genes,
    }

    OUT.write_text(
        "window.MARKER_DASHBOARD_DATA = "
        + json.dumps(payload, indent=2, sort_keys=True)
        + ";\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
