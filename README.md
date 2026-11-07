# waldbeat – Mega LoRA Loader for ComfyUI

Two LoRA loader nodes by **waldbeat**, built because the Power Lora Loader and its ⓘ info button stopped working with the new ComfyUI frontend (Nodes 2.0):

| Node | Platform | Output |
|---|---|---|
| **Mega LoRA Loader (MLX)** | macOS · Apple Silicon (MLX) | `lora_stack` for the Krea 2 MLX pipeline |
| **Mega LoRA Loader (Torch)** | Windows · Linux · macOS (CUDA / MPS / CPU) | `MODEL` |

Both share the same interface and the same info dialog. Works in Nodes 2.0 and the classic frontend.

## Features

- Loads **any number of LoRAs** in one stack – one row per LoRA: on/off, LoRA, ◀ strength ▶, **ⓘ**, ✕
- **Search field** in the LoRA picker (multiple words, ↑ ↓ Enter, Esc)
- **No re-calculation of the model:** LoRAs run in bypass mode – the base weights are never patched
- **No waiting time** after changing a strength or switching a LoRA
- **Saves memory:** no backup copy of the model weights is kept (regular loaders store the original weights to undo the patch)
- **Shows trigger words** directly (click to copy) – or "no trigger needed"
- **ⓘ info dialog:** recommended strength (incl. strength hints found in the description), trigger words, example images, description, version notes
- **Info lookup is automatic:** local first, then Civitai
  1. [LoRA Manager](https://github.com/willmiao/ComfyUI-Lora-Manager) metadata (`<lora>.metadata.json`) – instant, offline
  2. own cache (`<lora>.lsb-info.json`) – instant, offline
  3. Civitai by SHA256 hash – fetched once, then cached
- **Button to reload the info from Civitai manually** (e.g. after the author updated the page)
- **Link to the LoRA's Civitai page**

## Mega LoRA Loader (MLX) – macOS

For Krea 2 running natively on Apple's **MLX** framework (no PyTorch involved in sampling).

**Requirements**
- Mac with Apple Silicon (M1 or newer)
- [ComfyUI-Krea2-MLX](https://github.com/Cthomasdesign/ComfyUI-Krea2-MLX) installed
- Connect `lora_stack` to the `lora_stack` input of **Krea2 Generate (MLX)**

**Notes**
- Output type is `KREA2_LORASTACK` (list of path + strength), compatible with the `Krea2 LoRA (MLX)` node – the optional `lora_stack` input lets you chain it with other LoRA nodes.
- MLX applies LoRAs unfused, so each active LoRA adds a few seconds per image – depending on the LoRA's size. For LoRAs you always use, baking them into the model is faster.
- Negative strengths (slider LoRAs) are supported.

## Mega LoRA Loader (Torch) – Windows / Linux / macOS

Standard ComfyUI node: `model` in → `model` out. Replaces a chain of LoRA loaders.

**Requirements**
- Current ComfyUI with bypass LoRA support (`comfy.sd.load_bypass_lora_for_models`)
- Nothing else – no extra Python packages

**Notes**
- Model only: the LoRA is applied to the diffusion model, not to the text encoder (CLIP). Most modern LoRAs (e.g. Krea 2, trained with ai-toolkit / diffusion-pipe) contain no text-encoder weights. Connect your CLIP directly from the loader to the text encoder.
- Loaded LoRA files are cached by the node, so switching back to a LoRA costs nothing.

## Installation

```
cd ComfyUI/custom_nodes
git clone https://github.com/waldbeat/ComfyUI-waldbeat
```
Restart ComfyUI and hard-reload the browser (Cmd/Ctrl + Shift + R). Search for **"Mega LoRA Loader"**.

**Optional:** set the environment variable `CIVITAI_API_KEY` for Civitai lookups of restricted models.

## Thanks

- **rgthree** – [rgthree-comfy](https://github.com/rgthree/rgthree-comfy) (MIT). The Power Lora Loader and its info dialog were the inspiration for this node. The Civitai lookup by file hash follows his idea.
- **willmiao** – [ComfyUI-Lora-Manager](https://github.com/willmiao/ComfyUI-Lora-Manager). Its metadata files are used as the first info source.
- **Cthomasdesign** – [ComfyUI-Krea2-MLX](https://github.com/Cthomasdesign/ComfyUI-Krea2-MLX), and **avlp12** for the MLX port of Krea 2.
- **The ComfyUI team** – for the bypass LoRA implementation this node is built on.

## License

MIT
