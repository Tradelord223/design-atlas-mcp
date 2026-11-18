"""A fixed-destination MCP relay. Request credentials and HF headers never cross it."""
import httpx
from fastapi import Request
from starlette.responses import Response, StreamingResponse

REQUEST_HEADERS = {'accept', 'content-type', 'mcp-protocol-version', 'mcp-session-id', 'last-event-id', 'mcp-method', 'mcp-name'}
RESPONSE_HEADERS = {'content-type', 'content-length', 'content-encoding', 'cache-control', 'mcp-session-id', 'retry-after', 'allow', 'mcp-protocol-version', 'mcp-method', 'mcp-name'}
MAX_BODY = 600_000


def mount_mcp(app, backend):
    @app.api_route('/mcp', methods=['GET', 'POST', 'DELETE', 'OPTIONS'])
    async def mcp(request: Request):
        origins = request.headers.getlist('origin')
        public_origin = backend.public_origin
        allowed = {public_origin} if public_origin else {'http://127.0.0.1:7860', 'http://localhost:7860'}
        if len(origins) > 1 or (origins and origins[0] not in allowed):
            return Response('Origin is not allowed.', status_code=403)
        cors = {'Vary': 'Origin'}
        if origins:
            cors.update({'Access-Control-Allow-Origin': origins[0], 'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version, Mcp-Method, Mcp-Name, Allow'})
        if request.method == 'OPTIONS':
            if request.headers.get('access-control-request-method', 'POST') not in {'GET', 'POST', 'DELETE'}:
                return Response(status_code=405, headers=cors)
            requested = {part.strip().lower() for part in request.headers.get('access-control-request-headers', '').split(',') if part.strip()}
            if not requested.issubset(REQUEST_HEADERS):
                return Response('Requested headers are not allowed.', status_code=403, headers=cors)
            return Response(status_code=204, headers={**cors, 'Access-Control-Allow-Methods': 'GET, POST, DELETE', 'Access-Control-Allow-Headers': ', '.join(sorted(REQUEST_HEADERS))})
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > MAX_BODY:
                return Response('Request body exceeds 600000 bytes.', status_code=413, headers=cors)
        headers = {name: value for name, value in request.headers.items() if name in REQUEST_HEADERS}
        if origins:
            headers['origin'] = public_origin or f'http://127.0.0.1:{backend.port}'
        client = httpx.AsyncClient(trust_env=False, timeout=httpx.Timeout(60, connect=5), follow_redirects=False)
        try:
            outgoing = client.build_request(request.method, backend.url, content=bytes(body), headers=headers)
            upstream = await client.send(outgoing, stream=True)
        except httpx.HTTPError:
            await client.aclose()
            return Response('Atlas backend is unavailable.', status_code=503, headers=cors)

        async def stream_bytes():
            try:
                async for chunk in upstream.aiter_raw():
                    yield chunk
            finally:
                await upstream.aclose()
                await client.aclose()

        return StreamingResponse(stream_bytes(), status_code=upstream.status_code,
                                 headers={**{key: value for key, value in upstream.headers.items() if key in RESPONSE_HEADERS}, **cors})
