from typing import Dict, Any


def suggest_mitigation(vuln_type: str) -> Dict[str, Any]:
    """Return mitigation advice keyed by vulnerability type."""
    suggestions = {
        "buffer_overflow": "Validate all buffer lengths, enable ASLR and stack canaries.",
        "trapdoor": "Perform code audits to remove hidden backdoors and restrict access.",
        "cache_poisoning": "Implement integrity checks and secure cache invalidation.",
    }
    return {"type": vuln_type, "suggestion": suggestions.get(vuln_type, "Investigate further")}
