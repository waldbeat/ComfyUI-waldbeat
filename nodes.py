import json
import os

import comfy.sd
import comfy.utils
import folder_paths

_CACHE = {}  # path -> (mtime, lora_state_dict)


def _load(path):
    mtime = os.path.getmtime(path)
    hit = _CACHE.get(path)
    if hit and hit[0] == mtime:
        return hit[1]
    lora = comfy.utils.load_torch_file(path, safe_load=True)
    _CACHE[path] = (mtime, lora)
    return lora


class LoraStackBypass:
    """Stack of LoRAs applied in bypass mode (no weight patching -> no re-calculation on change)."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model": ("MODEL",),
                "lora_rows": ("LSB_ROWS", {"default": "[]"}),
            }
        }

    RETURN_TYPES = ("MODEL",)
    FUNCTION = "apply"
    CATEGORY = "waldbeat/loaders"
    SEARCH_ALIASES = ["mega lora", "lora stack", "lora bypass", "power lora loader"]
    DESCRIPTION = ("Apply several LoRAs in bypass mode: the LoRA is computed in the forward pass, "
                   "base weights stay untouched, so switching LoRAs or strengths needs no re-patching.")

    def apply(self, model, lora_rows):
        try:
            rows = json.loads(lora_rows) if isinstance(lora_rows, str) else (lora_rows or [])
        except Exception:
            rows = []
        used = set(_CACHE)
        for row in rows:
            name, strength = row.get("lora"), float(row.get("strength", 1.0))
            if not row.get("on", True) or not name or strength == 0:
                continue
            path = folder_paths.get_full_path("loras", name)
            if not path:
                print(f"[LoRA Stack Bypass] not found, skipped: {name}")
                continue
            used.discard(path)
            model, _ = comfy.sd.load_bypass_lora_for_models(model, None, _load(path), strength, 0)
        for p in used:  # drop cached LoRAs no longer in use
            _CACHE.pop(p, None)
        return (model,)


NODE_CLASS_MAPPINGS = {"LoraStackBypass": LoraStackBypass}
NODE_DISPLAY_NAME_MAPPINGS = {"LoraStackBypass": "Mega LoRA Loader (Torch)"}


class LoraStackMLX:
    """Same rows + info dialog as Mega LoRA Loader, but outputs a KREA2_LORASTACK
    (list of (path, strength)) for the Krea2 MLX pipeline. MLX applies LoRAs unfused anyway."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {"lora_rows": ("LSB_ROWS", {"default": "[]"})},
            "optional": {"lora_stack": ("KREA2_LORASTACK",)},
        }

    RETURN_TYPES = ("KREA2_LORASTACK",)
    RETURN_NAMES = ("lora_stack",)
    FUNCTION = "build"
    CATEGORY = "waldbeat/loaders"
    SEARCH_ALIASES = ["mega lora mlx", "lora stack mlx", "krea2 lora mlx"]
    DESCRIPTION = "LoRA rows with info dialog for the Krea2 MLX pipeline (outputs KREA2_LORASTACK)."

    def build(self, lora_rows, lora_stack=None):
        try:
            rows = json.loads(lora_rows) if isinstance(lora_rows, str) else (lora_rows or [])
        except Exception:
            rows = []
        stack = list(lora_stack) if lora_stack else []
        for row in rows:
            name, strength = row.get("lora"), float(row.get("strength", 1.0))
            if not row.get("on", True) or not name or strength == 0:
                continue
            path = folder_paths.get_full_path("loras", name)
            if path:
                stack.append((path, strength))
            else:
                print(f"[Mega LoRA Loader MLX] not found, skipped: {name}")
        return (stack,)


NODE_CLASS_MAPPINGS["LoraStackMLX"] = LoraStackMLX
NODE_DISPLAY_NAME_MAPPINGS["LoraStackMLX"] = "Mega LoRA Loader (MLX)"
