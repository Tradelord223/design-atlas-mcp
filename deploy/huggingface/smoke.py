"""Local CPU-only verification. Downloads the pinned Atlas release, never model weights."""
import asyncio
import base64
import hashlib
import json
import os
from pathlib import Path
import sys

os.environ.setdefault('ATLAS_BACKEND_PORT', '18787')
os.environ.setdefault('ATLAS_RUNTIME_DIR', '/tmp/design-atlas-gradio-runtime-test')
os.environ.setdefault('ATLAS_PUBLIC_ORIGIN', 'https://atlas-adapter-test.hf.space')
import httpx
import app as deployment
import relay


def decode(response):
    if response.headers.get('content-type', '').startswith('text/event-stream'):
        return json.loads(next(line[6:] for line in response.text.splitlines() if line.startswith('data: ')))
    return response.json()


async def main():
    report = {}
    transport = httpx.ASGITransport(app=deployment.app)
    original_client = httpx.AsyncClient
    async with original_client(transport=transport, base_url='http://test') as public, original_client() as direct:
        async def rpc(method, params=None, identifier=1):
            payload = {'jsonrpc': '2.0', 'id': identifier, 'method': method}
            if params is not None:
                payload['params'] = params
            return await public.post('/mcp', json=payload, headers={'accept': 'application/json, text/event-stream'})
        response = await rpc('initialize', {'protocolVersion': '2025-11-25', 'capabilities': {}, 'clientInfo': {'name': 'atlas-relay-smoke', 'version': '1'}}, 1)
        assert response.status_code == 200, response.text
        report['initialize'] = decode(response)['result']['serverInfo']
        response = await rpc('tools/list', {}, 2)
        assert response.status_code == 200
        tools = decode(response)['result']['tools']
        assert report['initialize']['version'] == '1.1.0'
        assert 'apply_reference_detail' in {tool['name'] for tool in tools}
        assert len(tools) == 19
        report['tools'] = len(tools)
        response = await rpc('resources/list', {}, 3)
        report['resources'] = len(decode(response)['result']['resources'])
        response = await rpc('prompts/list', {}, 4)
        report['prompts'] = len(decode(response)['result']['prompts'])
        response = await rpc('tools/call', {'name': 'get_inspiration', 'arguments': {'id': 'calm-product-hero'}}, 5)
        assert response.status_code == 200
        image = next(content for content in decode(response)['result']['content'] if content['type'] == 'image')
        actual = base64.b64decode(image['data'])
        expected = (deployment.backend.package / 'assets/previews/calm-product-hero/poster.png').read_bytes()
        assert actual == expected
        report['image_bytes'] = len(actual)
        report['image_sha256'] = hashlib.sha256(actual).hexdigest()
        body = {'jsonrpc': '2.0', 'id': 6, 'method': 'tools/list', 'params': {}}
        incoming = {'accept': 'application/json, text/event-stream'}
        proxied = await public.post('/mcp', json=body, headers=incoming)
        native = await direct.post(deployment.backend.url, json=body, headers=incoming)
        assert proxied.content == native.content
        report['node_response_bytes_identical'] = True
        rejected = await public.post('/mcp', json=body, headers={**incoming, 'origin': 'https://evil.invalid'})
        assert rejected.status_code == 403
        accepted = await public.post('/mcp', json=body, headers={**incoming, 'origin': deployment.backend.public_origin})
        assert accepted.status_code == 200
        assert accepted.headers['access-control-allow-origin'] == deployment.backend.public_origin
        gallery_headers = {'origin': relay.GALLERY_ORIGIN, 'access-control-request-method': 'POST',
                           'access-control-request-headers': 'content-type, mcp-protocol-version'}
        preflight = await public.options('/mcp', headers=gallery_headers)
        assert preflight.status_code == 204
        assert preflight.headers['access-control-allow-origin'] == relay.GALLERY_ORIGIN
        gallery_result = await public.post('/mcp', json=body, headers={**incoming, 'origin': relay.GALLERY_ORIGIN})
        assert gallery_result.status_code == 200
        assert gallery_result.headers['access-control-allow-origin'] == relay.GALLERY_ORIGIN
        report['gallery_browser_access'] = True
        report['origin_rejection'] = rejected.status_code
        report['origin_accepted'] = accepted.status_code
        notice = await public.post('/mcp', json={'jsonrpc': '2.0', 'method': 'notifications/initialized'}, headers=incoming)
        assert notice.status_code == 202, notice.text
        report['notification'] = notice.status_code
        get = await public.get('/mcp', headers=incoming)
        assert get.status_code == 405
        report['get_status'] = get.status_code
        oversized = await public.post('/mcp', content=b'x' * 600001, headers=incoming)
        assert oversized.status_code == 413
        report['body_limit'] = oversized.status_code
        health = await public.get('/healthz')
        report['health'] = health.json()
        assert health.json()['visual_search'] == 'disabled'
        assert 'torch' not in sys.modules
        assert 'transformers' not in sys.modules
        report['model_modules_loaded'] = False
        gradio = await public.get('/')
        assert gradio.status_code == 200
        report['gradio_status'] = gradio.status_code
        head = await public.head('/healthz')
        assert head.status_code == 200 and not head.content
        report['health_head'] = head.status_code
        captured = {}
        class RawBytes(httpx.AsyncByteStream):
            async def __aiter__(self):
                yield b'\x00\xffraw\x89PNG'

        def capture(request):
            captured.update(dict(request.headers))
            return httpx.Response(429, stream=RawBytes(), headers={'retry-after': '2', 'content-type': 'application/octet-stream'})
        relay.httpx.AsyncClient = lambda **kwargs: original_client(transport=httpx.MockTransport(capture), **kwargs)
        try:
            raw = await public.post('/mcp', content=b'{}', headers={**incoming, 'authorization': 'Bearer private-test', 'cookie': 'private=1', 'x-hf-access-token': 'private-test', 'x-forwarded-host': 'private.internal', 'mcp-protocol-version': '2025-11-25', 'mcp-method': 'tools/call', 'mcp-name': 'get_inspiration'})
            assert raw.status_code == 429 and raw.content == b'\x00\xffraw\x89PNG'
            assert raw.headers['retry-after'] == '2'
            assert not any(key in captured for key in ['authorization', 'cookie', 'x-hf-access-token', 'x-forwarded-host'])
            assert captured['host'].startswith('127.0.0.1:')
            assert captured['mcp-protocol-version'] == '2025-11-25'
            assert captured['mcp-method'] == 'tools/call'
            assert captured['mcp-name'] == 'get_inspiration'
            report['sensitive_headers_removed'] = True
            report['raw_status_bytes_preserved'] = True
        finally:
            relay.httpx.AsyncClient = original_client
    deployment.backend.close()
    print(json.dumps(report, indent=2))
    Path('SMOKE-RESULT.json').write_text(json.dumps(report, indent=2) + '\n')

try:
    asyncio.run(main())
finally:
    deployment.backend.close()
