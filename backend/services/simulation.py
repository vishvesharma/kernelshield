from datetime import datetime, timezone
import random

def simulate_buffer_overflow() -> dict:
    buffer_limit = random.choice([256, 512, 1024])
    # 30% chance to overflow
    if random.random() < 0.3:
        input_size = buffer_limit + random.randint(10, 500)
    else:
        input_size = random.randint(10, buffer_limit)
        
    return {
        "type": "buffer_overflow",
        "description": "Simulated buffer memory write operation",
        "buffer_limit": buffer_limit,
        "input_size": input_size,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

def simulate_trapdoor() -> dict:
    # 30% chance to be unauthorized/trapdoor
    is_malicious = random.random() < 0.3
    return {
        "type": "trapdoor",
        "description": "Simulated access attempt",
        "hidden_access_flag": is_malicious,
        "privilege_level": "admin" if is_malicious else random.choice(["user", "guest"]),
        "unauthorized_access": is_malicious,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

def simulate_cache_poisoning() -> dict:
    # 30% chance to be corrupted
    is_corrupted = random.random() < 0.3
    return {
        "type": "cache_poisoning",
        "description": "Simulated cache access and integrity check",
        "corrupted_entry_detected": is_corrupted,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
