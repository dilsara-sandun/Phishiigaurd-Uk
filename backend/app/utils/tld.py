"""
app/utils/tld.py
─────────────────
Thread-safe, locked-cache-free tldextract instance using a project-local cache directory.
"""
from pathlib import Path
import tldextract

_CACHE_DIR = Path(__file__).resolve().parent.parent.parent / ".tld_cache"
_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Custom TLDExtract instance with project-isolated cache directory and no remote download lock contention
TLD_EXTRACTOR = tldextract.TLDExtract(
    cache_dir=str(_CACHE_DIR),
    suffix_list_urls=None,
)

def extract_tld(url_or_domain: str):
    """
    Extract registered domain, subdomain, and suffix using isolated project cache.
    """
    return TLD_EXTRACTOR(url_or_domain)
