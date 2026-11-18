"""Gradio UI plus the released, byte-preserving Atlas MCP endpoint at /mcp."""
import os
from contextlib import asynccontextmanager
from pathlib import Path
import spaces
import gradio as gr
from fastapi import FastAPI
from PIL import Image
import uvicorn
from backend import AtlasBackend
from relay import mount_mcp

backend = AtlasBackend()
backend.start()
ZERO_GPU = spaces.zero.zerogpu_mode_enabled()
CPU_VISUAL = os.getenv('ATLAS_ENABLE_CPU_VISUAL') == '1'
visual_error = None
rank_images = None
if ZERO_GPU or CPU_VISUAL:
    try:
        # This module prepares and places the model at root level, outside @spaces.GPU.
        from visual_model import rank_images
    except Exception as failure:
        visual_error = type(failure).__name__ + ': ' + str(failure)
        print('Visual search preparation failed:', visual_error, flush=True)


@asynccontextmanager
async def lifespan(app):
    backend.start()
    try:
        yield
    finally:
        backend.close()


app = FastAPI(lifespan=lifespan)
mount_mcp(app, backend)


@app.api_route('/healthz', methods=['GET', 'HEAD'])
def health():
    return {'mcp': 'ready' if backend.process and backend.process.poll() is None else 'unavailable',
            'release': '1.2.0', 'poster_count': len(backend.catalog),
            'visual_search': 'zerogpu' if rank_images and ZERO_GPU else ('cpu' if rank_images else 'disabled'),
            'model_ready': rank_images is not None}


def search(query):
    if query is None:
        raise gr.Error('Upload a screenshot or image to compare with the Atlas specimens.')
    if rank_images is None:
        raise gr.Error('Visual search is unavailable. The Atlas MCP endpoint remains ready.')
    if query.width * query.height > 20_000_000:
        raise gr.Error('Use an image with at most 20 million pixels.')
    records = [item for item in backend.catalog if (backend.package / 'assets/previews' / item['id'] / 'poster.png').is_file()]
    posters = []
    for item in records:
        with Image.open(backend.package / 'assets/previews' / item['id'] / 'poster.png') as image:
            posters.append(image.convert('RGB'))
    positions, scores, device = rank_images(query.convert('RGB'), posters)
    gallery = [(posters[position], f"{records[position]['title']} · {score:.3f}") for position, score in zip(positions, scores)]
    rows = [[records[position]['title'], round(score, 4), 'https://tradelord223.github.io/design-atlas-mcp/?id=' + records[position]['id']] for position, score in zip(positions, scores)]
    return gallery, rows, f'Encoded the query and {len(posters)} Atlas posters on {device.upper()}. Cosine similarity ranks visual resemblance. It does not grade design quality.'


with gr.Blocks(title='Design Atlas') as demo:
    gr.Markdown('# Design Atlas\nAn open design reference library and a public MCP server.\n\n[Browse the gallery](https://tradelord223.github.io/design-atlas-mcp/) · [Brand workbench](https://tradelord223.github.io/design-atlas-mcp/workbench.html) · [Source and installation](https://github.com/Tradelord223/design-atlas-mcp)')
    gr.Markdown('## Connect MCP\nUse this Space’s HTTPS origin followed by `/mcp`. This endpoint runs the published Design Atlas 1.2.0 Node server, including its complete tools, prompts, resources, images, and JSON schemas.')
    gr.Code((backend.public_origin or 'http://localhost:7860') + '/mcp', language=None, label='MCP endpoint')
    gr.Markdown('## Find visually similar specimens\nCompare your screenshot against the original Atlas posters with an MIT-licensed LAION CLIP ViT-B/32 encoder. Uploaded images are used for this request. They are not added to the library.')
    if rank_images is None:
        gr.Markdown('Visual search is disabled on this CPU instance. The MCP service is available. Select free ZeroGPU hardware for GPU search, or explicitly enable local CPU visual search with `ATLAS_ENABLE_CPU_VISUAL=1`.' + ('\n\nModel initialization needs attention. See the Space logs.' if visual_error else ''))
    query = gr.Image(type='pil', label='Reference screenshot', sources=['upload'])
    submit = gr.Button('Find similar interfaces', variant='primary', interactive=rank_images is not None)
    result = gr.Gallery(label='Closest Atlas specimens', columns=3)
    table = gr.Dataframe(headers=['Specimen', 'Cosine similarity', 'Open specimen'], datatype=['str', 'number', 'str'], interactive=False)
    status = gr.Markdown()
    submit.click(search, inputs=[query], outputs=[result, table, status], concurrency_limit=1, api_name='visual_similarity')
    gr.Markdown('Model [LAION CLIP ViT-B/32](https://huggingface.co/laion/CLIP-ViT-B-32-laion2B-s34B-b79K), revision `1a25a446712ba5ee05982a381eed697ef9b435cf`, MIT. Results are exploratory visual references. Public Space requests and temporary uploads follow Hugging Face and Gradio’s hosting behavior.')

demo.queue(default_concurrency_limit=1)
# The explicit /mcp route precedes the Gradio root mount.
app = gr.mount_gradio_app(app, demo, path='/', allowed_paths=[str(backend.package / 'assets/previews')])

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=int(os.getenv('PORT', '7860')))
