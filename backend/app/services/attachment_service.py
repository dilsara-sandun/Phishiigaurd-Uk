"""
services/attachment_service.py
───────────────────────────────
Risk-scores email attachments based on their filename and extension only.
No file content is ever read, uploaded, or stored — this is a pure metadata
heuristic, consistent with the approach used by Microsoft Defender and Gmail's
built-in attachment filter.

Risk levels:
  CRITICAL — executable / disk-image types that should never arrive via email
  HIGH     — archives and macro-enabled Office formats commonly used by malware
  MEDIUM   — legacy Office formats or double-extension masquerade tricks
  SAFE     — common document/image types (with a note that PDFs may contain links)
"""

import logging
import re
from pathlib import PurePosixPath

from app.schemas.scan_schema import FlagItem

logger = logging.getLogger(__name__)

# ── Extension risk tables ──────────────────────────────────────────────────────

# Executables and disk images — should never arrive via email from a legit sender
_CRITICAL_EXTS: frozenset[str] = frozenset({
    ".exe", ".bat", ".cmd", ".com", ".pif", ".scr",   # Windows executables
    ".ps1", ".psm1", ".psd1",                           # PowerShell
    ".vbs", ".vbe", ".wsh", ".wsc",                     # VBScript / WSH
    ".js", ".jse",                                       # JScript
    ".jar", ".class",                                    # Java
    ".msi", ".msp", ".mst",                              # Windows Installer
    ".iso", ".img", ".vhd", ".vhdx", ".vmdk",           # Disk images
    ".hta",                                              # HTML Application
    ".reg",                                              # Registry files
    ".lnk",                                              # Shortcut (used in phishing)
})

# Archives and macro-enabled formats — frequently weaponised
_HIGH_EXTS: frozenset[str] = frozenset({
    ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz",  # Archives
    ".docm", ".dotm",                                        # Word macros
    ".xlsm", ".xltm", ".xlam",                              # Excel macros
    ".pptm", ".potm", ".ppam", ".ppsm",                     # PowerPoint macros
    ".accdb", ".accda",                                      # Access with macros
    ".one", ".onetoc2",                                      # OneNote (exploited)
})

# Legacy Office formats and PDF (PDFs can embed JavaScript / links)
_MEDIUM_EXTS: frozenset[str] = frozenset({
    ".doc", ".dot", ".xls", ".xlt", ".ppt", ".pps",        # Legacy Office
    ".rtf",                                                   # RTF (can contain OLE objects)
    ".pdf",                                                   # PDFs can carry malicious links
    ".svg",                                                   # SVGs can contain scripts
    ".html", ".htm",                                          # HTML attachments
    ".xml",                                                   # XML can carry macros
})

# Generally safe
_SAFE_EXTS: frozenset[str] = frozenset({
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".tiff",
    ".txt", ".csv", ".tsv", ".log",
    ".mp3", ".mp4", ".wav", ".avi", ".mov",
    ".ical", ".ics",
})

# URL shortener / redirect patterns to warn about if embedded in attachment names
_DOUBLE_EXT_RE = re.compile(
    r"\.[a-z0-9]{2,6}\.(exe|bat|cmd|com|pif|scr|ps1|vbs|js|jar|iso|img|lnk)$",
    re.IGNORECASE,
)


# ── Per-file risk assessment ───────────────────────────────────────────────────

def _assess_file(filename: str) -> dict:
    """
    Assess a single attachment filename.
    Returns a dict with keys: filename, risk_level, description.
    risk_level is one of: "critical", "high", "medium", "safe", "unknown".
    """
    filename = filename.strip()
    if not filename:
        return {"filename": filename, "risk_level": "unknown", "description": "Empty filename"}

    # Double-extension masquerade check first (e.g. invoice.pdf.exe)
    if _DOUBLE_EXT_RE.search(filename):
        return {
            "filename": filename,
            "risk_level": "critical",
            "description": (
                f"'{filename}' uses a double extension to disguise an executable. "
                "This is a known malware delivery technique — do not open."
            ),
        }

    # Extract the true extension (case-insensitive, lower)
    try:
        ext = PurePosixPath(filename.replace("\\", "/")).suffix.lower()
    except Exception:
        ext = ""

    if ext in _CRITICAL_EXTS:
        return {
            "filename": filename,
            "risk_level": "critical",
            "description": (
                f"'{filename}' is an executable or disk-image file type ({ext}). "
                "Legitimate organisations never send these via email. Do not open."
            ),
        }
    if ext in _HIGH_EXTS:
        if ext in {".docm", ".dotm", ".xlsm", ".xltm", ".xlam", ".pptm", ".potm", ".ppam", ".ppsm", ".accdb", ".accda"}:
            desc = (
                f"'{filename}' is a macro-enabled Office file ({ext}). "
                "Macros are a primary malware delivery method. Only open if you trust the sender and expected this file."
            )
        elif ext == ".one" or ext == ".onetoc2":
            desc = (
                f"'{filename}' is a OneNote file ({ext}), recently exploited to deliver malware. "
                "Verify with the sender before opening."
            )
        else:
            desc = (
                f"'{filename}' is a compressed archive ({ext}). "
                "Archives are frequently used to hide malicious payloads and bypass email filters."
            )
        return {"filename": filename, "risk_level": "high", "description": desc}

    if ext in _MEDIUM_EXTS:
        if ext == ".pdf":
            desc = (
                f"'{filename}' is a PDF. PDFs can contain embedded links and JavaScript. "
                "Verify the sender before opening."
            )
        elif ext in {".html", ".htm"}:
            desc = (
                f"'{filename}' is an HTML file. HTML attachments are commonly used in credential harvesting attacks."
            )
        elif ext == ".rtf":
            desc = (
                f"'{filename}' is an RTF file, which can contain OLE objects used for malware delivery."
            )
        else:
            desc = (
                f"'{filename}' uses a legacy Office format ({ext}). "
                "These formats can contain embedded macros — exercise caution."
            )
        return {"filename": filename, "risk_level": "medium", "description": desc}

    if ext in _SAFE_EXTS:
        return {
            "filename": filename,
            "risk_level": "safe",
            "description": f"'{filename}' is a standard {ext} file with low inherent risk.",
        }

    # Unknown extension — treat as suspicious by default
    return {
        "filename": filename,
        "risk_level": "medium",
        "description": (
            f"'{filename}' has an unrecognised extension ('{ext}'). "
            "Treat with caution until you can verify the sender's intent."
        ),
    }


# ── Public entry points ────────────────────────────────────────────────────────

def score_attachments(filenames: list[str]) -> list[dict]:
    """
    Assess a list of attachment filenames.
    Returns a list of per-file assessment dicts (filename, risk_level, description).
    """
    if not filenames:
        return []
    return [_assess_file(name) for name in filenames if name and name.strip()]


def get_attachment_flags(filenames: list[str]) -> list[FlagItem]:
    """
    Convert attachment assessments into FlagItems for inclusion in the
    overall email red/green flag list.

    - Critical / High → red FlagItem
    - Medium         → red FlagItem (with a softer description)
    - Safe           → no flag added (avoids noise)
    """
    flags: list[FlagItem] = []
    assessments = score_attachments(filenames)

    for a in assessments:
        risk = a["risk_level"]
        if risk == "critical":
            flags.append(FlagItem(
                flag_type="red",
                flag_name="dangerous_attachment",
                description=a["description"],
            ))
        elif risk == "high":
            flags.append(FlagItem(
                flag_type="red",
                flag_name="high_risk_attachment",
                description=a["description"],
            ))
        elif risk == "medium":
            flags.append(FlagItem(
                flag_type="red",
                flag_name="suspicious_attachment",
                description=a["description"],
            ))
        # "safe" and "unknown-safe" produce no flag to avoid noise

    # If all attachments are safe, add a positive green flag
    if assessments and all(a["risk_level"] == "safe" for a in assessments):
        flags.append(FlagItem(
            flag_type="green",
            flag_name="safe_attachments",
            description=f"All {len(assessments)} attachment(s) appear to be low-risk file types.",
        ))

    return flags
