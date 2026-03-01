from datetime import datetime, timezone
import random


# Each simulation returns a dictionary with at least a "type" key.
# We include some synthetic metrics that a detection engine might inspect.

def simulate_buffer_overflow() -> dict:
    return {
        "type": "buffer_overflow",
        "description": "Simulated overflow writing past buffer bounds",
        "payload_size": random.randint(100, 1000),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def simulate_trapdoor() -> dict:
    return {
        "type": "trapdoor",
        "description": "Simulated hidden entry point or backdoor",
        "access_pattern": random.choice(["normal", "elevated", "suspicious"]),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def simulate_cache_poisoning() -> dict:
    return {
        "type": "cache_poisoning",
        "description": "Simulated malicious cache entry injection",
        "cache_hit_rate": random.uniform(0.5, 1.0),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
