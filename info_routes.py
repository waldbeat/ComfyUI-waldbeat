"""LoRA info: 1) LoRA Manager sidecar (<name>.metadata.json)  2) own cache (<file>.lsb-info.json)
3) Civitai by SHA256 (idea from rgthree-comfy, MIT). Optional env CIVITAI_API_KEY."""
import asyncio
import hashlib
import json
import os

import aiohttp
from aiohttp import web
import folder_paths
from server import PromptServer

routes = PromptServer.instance.routes


def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _usage(tips):
    if isinstance(tips, str):
        try:
            tips = json.loads(tips) if tips.strip().startswith("{") else {"text": tips}
        except Exception:
            tips = {"text": tips}
    return tips or {}


def _imgs(images):
    out = []
    for im in images or []:
        url = im.get("url")
        if url:
            out.append({"url": url, "type": im.get("type", "image")})
    return out[:12]


def _from_lora_manager(d):
    c = d.get("civitai") or {}
    model = c.get("model") or {}
    return {
        "source": "LoRA Manager",
        "name": model.get("name") or d.get("model_name"),
        "version": c.get("name"),
        "base_model": d.get("base_model") or c.get("baseModel"),
        "trained_words": d.get("trainedWords") or c.get("trainedWords") or [],
        "usage": _usage(d.get("usage_tips")),
        "description": d.get("modelDescription") or "",
        "version_description": c.get("description") or "",
        "images": _imgs(c.get("images")),
        "url": f"https://civitai.com/models/{c['modelId']}?modelVersionId={c.get('id')}" if c.get("modelId") else None,
        "notes": d.get("notes") or "",
    }


async def _from_civitai(path):
    sha = await asyncio.to_thread(_sha256, path)
    headers = {}
    if os.environ.get("CIVITAI_API_KEY"):
        headers["Authorization"] = f"Bearer {os.environ['CIVITAI_API_KEY']}"
    async with aiohttp.ClientSession(headers=headers) as s:
        async with s.get(f"https://civitai.com/api/v1/model-versions/by-hash/{sha}") as r:
            if r.status != 200:
                return {"source": "none", "error": f"Civitai: HTTP {r.status} (not found by hash)"}
            v = await r.json()
        desc = ""
        try:
            async with s.get(f"https://civitai.com/api/v1/models/{v['modelId']}") as r2:
                if r2.status == 200:
                    desc = (await r2.json()).get("description") or ""
        except Exception:
            pass
    return {
        "source": "Civitai",
        "name": (v.get("model") or {}).get("name"),
        "version": v.get("name"),
        "base_model": v.get("baseModel"),
        "trained_words": v.get("trainedWords") or [],
        "usage": {},
        "description": desc,
        "version_description": v.get("description") or "",
        "images": _imgs(v.get("images")),
        "url": f"https://civitai.com/models/{v['modelId']}?modelVersionId={v.get('id')}",
        "notes": "",
    }


@routes.get("/lsb/loras")
async def lsb_loras(request):
    return web.json_response(folder_paths.get_filename_list("loras"))


@routes.get("/lsb/info")
async def lsb_info(request):
    name = request.query.get("name", "")
    refresh = request.query.get("refresh") == "1"
    path = folder_paths.get_full_path("loras", name)
    if not path:
        return web.json_response({"source": "none", "error": "LoRA file not found"})
    lm = os.path.splitext(path)[0] + ".metadata.json"
    if os.path.exists(lm) and not refresh:
        try:
            with open(lm, encoding="utf-8") as f:
                data = _from_lora_manager(json.load(f))
            if data["name"] or data["description"] or data["trained_words"]:
                return web.json_response(data)
        except Exception:
            pass
    cache = path + ".lsb-info.json"
    if os.path.exists(cache) and not refresh:
        with open(cache, encoding="utf-8") as f:
            return web.json_response(json.load(f))
    try:
        data = await _from_civitai(path)
    except Exception as e:
        return web.json_response({"source": "none", "error": str(e)})
    if data.get("source") == "Civitai":
        with open(cache, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
    return web.json_response(data)
