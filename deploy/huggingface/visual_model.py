"""Imported only for ZeroGPU or explicit CPU visual search. Root placement follows HF guidance."""
import os
import spaces
import torch
from transformers import CLIPModel, CLIPProcessor

MODEL_ID = 'laion/CLIP-ViT-B-32-laion2B-s34B-b79K'
MODEL_REVISION = '1a25a446712ba5ee05982a381eed697ef9b435cf'
ZERO_GPU = spaces.zero.zerogpu_mode_enabled()
DEVICE = 'cuda' if ZERO_GPU else 'cpu'
# ZeroGPU emulates this root-level placement until a decorated call receives real CUDA.
processor = CLIPProcessor.from_pretrained(MODEL_ID, revision=MODEL_REVISION, token=False)
model = CLIPModel.from_pretrained(MODEL_ID, revision=MODEL_REVISION, use_safetensors=True, token=False).eval().to(DEVICE)


@spaces.GPU(duration=30)
def rank_images(query, posters):
    """Run both query and Atlas poster encoders on the allocated GPU, then cosine rank."""
    if ZERO_GPU and not torch.cuda.is_available():
        raise RuntimeError('The visual search function did not receive a CUDA allocation.')
    with torch.inference_mode():
        vectors = []
        for offset in range(0, len(posters), 12):
            inputs = processor(images=posters[offset:offset + 12], return_tensors='pt').to(DEVICE)
            features = model.get_image_features(**inputs, return_dict=True).pooler_output
            vectors.append(torch.nn.functional.normalize(features, dim=-1))
        index = torch.cat(vectors)
        query_inputs = processor(images=[query], return_tensors='pt').to(DEVICE)
        query_vector = torch.nn.functional.normalize(model.get_image_features(**query_inputs, return_dict=True).pooler_output, dim=-1)
        scores = (query_vector @ index.T).squeeze(0)
        count = min(6, len(posters))
        values, positions = torch.topk(scores, count)
        return positions.cpu().tolist(), values.cpu().tolist(), DEVICE
