"""Install a checksum-pinned Atlas release and supervise its loopback HTTP process."""
import atexit
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError

RELEASE_URL = 'https://github.com/Tradelord223/design-atlas-mcp/releases/download/v1.0.1/design-atlas-mcp-1.0.1.tgz'
RELEASE_SHA256 = '80b1b851becdb2f57ee38010ea1a3a5a81645f498d1f53a827dfa02b322ec680'


class AtlasBackend:
    def __init__(self):
        self.directory = Path(os.getenv('ATLAS_RUNTIME_DIR', '/tmp/design-atlas-runtime')).resolve()
        self.directory.mkdir(parents=True, exist_ok=True)
        self.port = int(os.getenv('ATLAS_BACKEND_PORT', '8787'))
        self.url = f'http://127.0.0.1:{self.port}/mcp'
        self.package = self.directory / 'node_modules' / 'design-atlas-mcp'
        self.process = None
        self.catalog = []
        self.public_origin = ('https://' + os.environ['SPACE_HOST']) if os.getenv('SPACE_HOST') else os.getenv('ATLAS_PUBLIC_ORIGIN', '')
        bin_dir = Path(sys.executable).parent
        self.node = str(bin_dir / 'node') if (bin_dir / 'node').exists() else shutil.which('node')
        self.npm = str(bin_dir / 'npm') if (bin_dir / 'npm').exists() else shutil.which('npm')
        if not self.node or not self.npm:
            raise RuntimeError('Install the pinned nodejs-wheel requirement before starting the app.')
        self.environment = {key: os.environ[key] for key in ['PATH', 'HOME', 'TMPDIR', 'LANG'] if key in os.environ}
        self.environment['PATH'] = str(bin_dir) + os.pathsep + self.environment.get('PATH', '')
        self.environment.update(ATLAS_HOST='127.0.0.1')
        if self.public_origin:
            self.environment['ATLAS_PUBLIC_ORIGIN'] = self.public_origin
        atexit.register(self.close)

    def start(self):
        if self.process and self.process.poll() is None:
            return
        version = subprocess.check_output([self.node, '--version'], env=self.environment, text=True).strip()
        if tuple(map(int, version.lstrip('v').split('.')[:2])) < (22, 16):
            raise RuntimeError('Atlas requires Node.js 22.16 or newer.')
        marker = self.directory / 'installed-sha256'
        if not marker.exists() or marker.read_text().strip() != RELEASE_SHA256 or not (self.package / 'src/cli.js').exists():
            archive = self.directory / 'design-atlas-mcp-1.0.1.tgz'
            with urlopen(Request(RELEASE_URL, headers={'User-Agent': 'Design-Atlas-Space/1.0'}), timeout=60) as response:
                payload = response.read(30_000_001)
            if len(payload) > 30_000_000 or hashlib.sha256(payload).hexdigest() != RELEASE_SHA256:
                raise RuntimeError('Atlas release checksum verification failed.')
            archive.write_bytes(payload)
            npmrc = self.directory / '.npmrc'
            npmrc.write_text('')
            subprocess.run([self.npm, 'install', '--prefix', str(self.directory), '--userconfig', str(npmrc), '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', str(archive)], env=self.environment, check=True, timeout=180)
            marker.write_text(RELEASE_SHA256 + '\n')
        program = "import {patterns} from './src/catalog.js'; console.log(JSON.stringify(patterns.map(({id,title,summary,sourceUrl})=>({id,title,summary,sourceUrl}))));"
        self.catalog = json.loads(subprocess.check_output([self.node, '--input-type=module', '-e', program], cwd=self.package, env=self.environment, text=True))
        self.process = subprocess.Popen([self.node, str(self.package / 'src/cli.js'), 'http', '--port', str(self.port)], cwd=self.package, env=self.environment)
        for _ in range(100):
            if self.process.poll() is not None:
                raise RuntimeError('Atlas backend exited before becoming ready.')
            try:
                with urlopen(Request(self.url, headers={'Accept': 'application/json, text/event-stream'}), timeout=0.5):
                    return
            except HTTPError as failure:
                if failure.code in (400, 405, 406):
                    return
            except OSError:
                pass
            time.sleep(0.1)
        self.close()
        raise RuntimeError('Atlas backend readiness timed out.')

    def close(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)
