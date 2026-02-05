# Guia passo a passo para migrar de SQL manual para Alembic

Este guia descreve um passo a passo prático, com comandos e estrutura sugerida, para migrar o esquema atual (via `ensure_schema()` + SQLs soltos) para Alembic. Inclui referências ao uso atual do `ensure_schema()` e ao `requirements.txt` para contexto.

## 1. Adicionar Alembic no `requirements.txt`

**O que fazer:** incluir o pacote `alembic` no `requirements.txt` (padrão: `alembic==<versão>`). Você já usa esse arquivo como fonte das dependências.

**Exemplo (linha adicionada):**

```text
alembic==1.13.2
```

## 2. Inicializar Alembic no projeto

**Comando principal (na raiz do projeto):**

```bash
alembic init migrations
```

Isso cria:

```text
migrations/
  env.py
  script.py.mako
  versions/
alembic.ini
```

Esse novo `migrations/` não deve conflitar com os SQLs soltos que hoje são lidos pelo `ensure_schema()`. Você pode manter ambos temporariamente durante a transição e só depois remover o fluxo antigo.

## 3. Configurar `alembic.ini` e `env.py` para usar `DATABASE_URL`

No `alembic.ini`:

Trocar a `sqlalchemy.url` para ler de `DATABASE_URL` por variável ambiente.

No `migrations/env.py`:

```python
import os
from sqlalchemy import engine_from_config, pool


def get_url():
    return os.getenv("DATABASE_URL", "")
```

E usar `get_url()` para configurar a engine.

**Observação:** como hoje o projeto usa `DATABASE_URL` via `services.settings`, essa mesma variável já existe no ambiente, então basta ler `os.getenv("DATABASE_URL")`.

## 4. Converter os SQLs existentes em revisões Alembic

Você tem SQLs em `migrations/*.sql` usados pelo `ensure_schema()` (ex.: `001_init.sql`, `005_add_lead_soft_delete.sql`).

Duas formas:

### ✅ Opção A — Manual (recomendado para controle fino)

Criar uma revisão inicial:

```bash
alembic revision -m "initial schema"
```

Copiar o conteúdo do `001_init.sql` e transcrever no `upgrade()` / `downgrade()`.

### ✅ Opção B — Autogenerate

Se você tiver modelos SQLAlchemy:

```bash
alembic revision --autogenerate -m "initial schema"
```

Obs: como o projeto parece não usar models SQLAlchemy diretamente, provavelmente a opção manual será mais precisa.

## 5. Remover `ensure_schema()` do código de produção

Hoje o app chama `ensure_schema_once()` no `app.py` e usa `ensure_schema()` internamente para aplicar SQLs automaticamente.

Após Alembic estar operacional:

- Remover a chamada em `app.py` (para evitar auto-aplicar SQLs na inicialização).
- Descontinuar `ensure_schema()` e o mecanismo de SQLs soltos (ou deixá-los apenas para uso local/teste).

## ✅ Estrutura sugerida final

```text
alembic.ini
migrations/
  env.py
  script.py.mako
  versions/
    001_initial_schema.py
    002_add_lead_soft_delete.py
    ...
```

## ✅ Comandos principais (resumo)

```bash
pip install alembic
alembic init migrations
alembic revision -m "initial schema"
alembic upgrade head
```

## 📌 Observações importantes

- Durante a transição, mantenha o fluxo antigo até validar que Alembic está aplicando corretamente.
- Depois de validado, remova o auto-apply de SQL (`ensure_schema()`), para evitar conflitos.

## Comando usado para análise (citado)

```bash
sed -n '1,120p' requirements.txt
```

Se quiser, posso aplicar as mudanças reais no repositório, incluindo a configuração do Alembic, os arquivos `env.py`, e as primeiras revisões com base nos SQLs existentes.
