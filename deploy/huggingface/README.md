---
title: Design Atlas
emoji: 🗂️
colorFrom: green
colorTo: gray
sdk: gradio
sdk_version: 6.32.0
python_version: 3.12.12
app_file: app.py
fullWidth: true
license: mit
models:
  - laion/CLIP-ViT-B-32-laion2B-s34B-b79K
tags:
  - mcp
  - design
  - clip
  - zerogpu
---

# Design Atlas

Connect an MCP client to this Space’s HTTPS origin followed by `/mcp`.
The endpoint serves the checksum-pinned, published Design Atlas Node MCP server.
The Gradio interface adds screenshot similarity search over the original Atlas posters.

Eligible free personal accounts can create a Gradio **ZeroGPU** Space for screenshot similarity search and the MCP endpoint. Hugging Face requires a verified email, an account older than 30 days, good standing, and an available free slot. Accounts eligible for CPU Basic compute can run the core service with the smaller CPU requirements. [Hugging Face hosting rules](https://huggingface.co/docs/hub/spaces-zerogpu)

## Release identity

The app downloads the public `design-atlas-mcp-1.1.0.tgz` release, verifies SHA-256
`65117135c2a6a2d81c98a651044e655f2d587afcb15393ed79549b240bce7445`, then installs the verified local archive with npm scripts disabled.
Node is supplied by `nodejs-wheel==24.13.0` and its exact binary-wheel dependency.
The newer 24.22.1 wheel metadata currently depends on an unavailable binaries release, so this adapter pins the installable 24.13.0 version.

## Runtime

Core MCP startup downloads no model and requires no CUDA on CPU Basic.
On ZeroGPU, `visual_model.py` imports the pinned MIT LAION CLIP model and places it on CUDA at module level, following Hugging Face’s emulated initialization guidance.
The `@spaces.GPU` function performs real image-encoder forward passes for the query and every poster, followed by cosine ranking.
The first ZeroGPU startup downloads approximately 600 MB of model weights and must complete emulated initialization before Gradio becomes ready. Core Node setup starts first.
A model failure disables visual search while preserving the MCP service.
`ATLAS_ENABLE_CPU_VISUAL=1` explicitly enables CPU model preparation and inference outside ZeroGPU. It is off by default.
No image encoder weights or CUDA packages were downloaded during the local CPU relay verification.

The relay has a single fixed loopback destination and forwards MCP content headers only.
It excludes Authorization, Cookie, Host, forwarded headers, and Hugging Face private headers.
Browser Origin is validated at the public boundary and forwarded to the loopback backend for its own hostname validation.
It preserves upstream statuses and raw bytes, limits request bodies to the Node server’s 600,000-byte limit, and validates browser origins.
`SPACE_HOST` supplies the Space origin automatically. The relay also permits the published GitHub Pages origin for its interactive MCP demo. Local development allows only localhost:7860 origins. Native MCP requests without Origin are accepted.
The canonical endpoint is `/mcp`. The Gradio visual API is supplementary and uses `/gradio_api/` routes.

## Preparation and local verification

Copy `app.py`, `backend.py`, `relay.py`, `visual_model.py`, `requirements.txt`, and this README to a Gradio Space repository.
No secrets are needed for the public release or public model. For a CPU-only build, copy requirements-cpu.txt to requirements.txt to avoid installing the optional model dependencies.
Run `python app.py` in the installed environment.
Use `/healthz` to inspect MCP and model readiness.
Run `python smoke.py` for isolated Node/ASGI relay checks.

Local CPU testing verified MCP discovery, all 19 advertised tools, exact PNG transfer, positive and negative Origin checks, and the official v2 client’s protocol headers. Hosted routing and GPU-backed inference require verification on the provisioned Space.

## Primary references

- [Hugging Face ZeroGPU compatibility, model placement and quotas](https://huggingface.co/docs/hub/spaces-zerogpu)
- [Hugging Face Gradio Space configuration](https://huggingface.co/docs/hub/spaces-config-reference)
- [Gradio mount_gradio_app source, version 6.32.0](https://github.com/gradio-app/gradio/blob/gradio%406.32.0/gradio/routes.py)
- [LAION CLIP model and MIT license metadata](https://huggingface.co/laion/CLIP-ViT-B-32-laion2B-s34B-b79K)
- [Node wheel maintainer’s package and supported platforms](https://pypi.org/project/nodejs-wheel/24.13.0/)
- [Design Atlas pinned release](https://github.com/Tradelord223/design-atlas-mcp/releases/tag/v1.1.0)
