import hashlib
import random
import numpy as np
from typing import Any, List
from app.models.schemas import PrivacyRule

class PrivacyEngine:
    """Applies privacy controls (masking, hashing, differential privacy noise) to datasets."""
    
    @staticmethod
    def apply_masking(val: Any, mask_char: str = "*") -> str:
        if val is None:
            return None
        s = str(val)
        if "@" in s:
            parts = s.split("@")
            user = parts[0]
            masked_user = user[0] + (mask_char * max(1, len(user) - 2)) + (user[-1] if len(user) > 1 else "")
            return f"{masked_user}@{parts[1]}"
        elif len(s) > 4:
            return s[:2] + (mask_char * (len(s) - 4)) + s[-2:]
        else:
            return mask_char * len(s)

    @staticmethod
    def apply_hashing(val: Any, salt: str = "hackdata_v2_salt") -> str:
        if val is None:
            return None
        raw = f"{salt}:{val}".encode("utf-8")
        return hashlib.sha256(raw).hexdigest()[:16]

    @staticmethod
    def apply_differential_noise(val: Any, epsilon: float = 0.5) -> float:
        if val is None:
            return None
        try:
            num = float(val)
            # Laplace mechanism: scale = sensitivity / epsilon. Assume sensitivity = 1.0
            scale = max(0.01, 1.0 / max(0.001, epsilon))
            noise = np.random.laplace(0, scale)
            res = round(num + noise, 2)
            return res if num >= 0 and res >= 0 else max(0.0, res)
        except (ValueError, TypeError):
            return val

    @classmethod
    def apply_rules_to_table(cls, rows: List[dict], rules: List[PrivacyRule]) -> tuple[List[dict], int]:
        if not rules or not rows:
            return rows, 0
        
        rule_map = {r.column.lower(): r for r in rules}
        applied_count = 0
        transformed = []
        
        for row in rows:
            new_row = dict(row)
            for col_name, val in list(row.items()):
                rule = rule_map.get(col_name.lower())
                if rule:
                    applied_count += 1
                    if rule.action == "mask":
                        new_row[col_name] = cls.apply_masking(val, rule.mask_char or "*")
                    elif rule.action == "hash":
                        new_row[col_name] = cls.apply_hashing(val)
                    elif rule.action == "differential_noise":
                        new_row[col_name] = cls.apply_differential_noise(val, rule.noise_epsilon or 0.5)
                    elif rule.action == "pseudonymize":
                        new_row[col_name] = f"ANON_{cls.apply_hashing(val)[:8]}"
            transformed.append(new_row)
            
        return transformed, applied_count
