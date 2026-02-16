import contextlib
import socket
import subprocess
import time
from pathlib import Path
from urllib.request import urlopen

import pytest


STATIC_DIR = Path(__file__).resolve().parents[1] / "static_site"


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


@pytest.fixture(scope="module")
def static_server_url():
    port = _free_port()
    proc = subprocess.Popen(
        ["python", "-m", "http.server", str(port)],
        cwd=STATIC_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        deadline = time.time() + 5
        while time.time() < deadline:
            try:
                with urlopen(f"http://127.0.0.1:{port}/") as resp:
                    if resp.status == 200:
                        break
            except Exception:
                time.sleep(0.1)
        else:
            pytest.fail("Servidor estático não iniciou a tempo")
        yield f"http://127.0.0.1:{port}"
    finally:
        proc.terminate()
        with contextlib.suppress(Exception):
            proc.wait(timeout=3)


def _get(url: str) -> str:
    with urlopen(url) as resp:
        assert resp.status == 200
        return resp.read().decode("utf-8")


def test_root_carrega(static_server_url):
    html = _get(f"{static_server_url}/")
    assert "LeadRank | Qualificador de Leads com IA" in html


def test_cta_principal_clicavel():
    html = (STATIC_DIR / "index.html").read_text(encoding="utf-8")
    assert 'href="#lead-capture"' in html
    assert "Quero testar agora" in html


def test_links_termos_privacidade_abrem(static_server_url):
    index = _get(f"{static_server_url}/index.html")
    assert 'href="termos.html"' in index
    assert 'href="privacidade.html"' in index

    termos = _get(f"{static_server_url}/termos.html")
    privacidade = _get(f"{static_server_url}/privacidade.html")
    assert "Termos de Uso" in termos
    assert "Política de Privacidade" in privacidade


def test_formulario_tem_validacao_e_retorno_visual():
    html = (STATIC_DIR / "index.html").read_text(encoding="utf-8")
    js = (STATIC_DIR / "lead-form.js").read_text(encoding="utf-8")

    assert 'id="leadForm"' in html
    assert 'name="name"' in html and "required" in html
    assert 'name="email"' in html and 'type="email"' in html and "required" in html
    assert 'name="telefone"' in html and 'type="tel"' in html and "required" in html

    assert 'id="formStatus"' in html
    assert "showStatus(\"Criando sua conta...\", \"warning\")" in js
    assert "showStatus(\"Cadastro concluído. Redirecionando...\", \"success\")" in js


def test_demo_embed_responsivo_com_fallback():
    html = (STATIC_DIR / "index.html").read_text(encoding="utf-8")

    assert 'id="demo"' in html
    assert 'class="aspect-video w-full bg-slate-950/40"' in html
    assert 'src="https://www.youtube.com/embed/ysz5S6PUM-U"' in html
    assert 'loading="lazy"' in html
    assert 'title="Demonstração do LeadRank"' in html
    assert 'Abrir no YouTube' in html
