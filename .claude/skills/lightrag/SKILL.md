---
name: lightrag
description: Development conventions and patterns for HKUDS/LightRAG — a graph-based Retrieval-Augmented Generation framework.
---

# LightRAG Development Skill

> Generated from [HKUDS/LightRAG](https://github.com/HKUDS/LightRAG) CLAUDE.md

## Overview

LightRAG is a RAG framework using graph-based knowledge representation for enhanced information retrieval. It extracts entities and relationships from documents, builds a knowledge graph, and uses multi-modal retrieval (local, global, hybrid, mix, naive) for queries.

## When to Use This Skill

Activate this skill when:
- Working with or extending the LightRAG codebase
- Adding new storage backends or LLM provider bindings
- Writing tests or debugging retrieval issues
- Configuring LightRAG for production deployment

## Core Architecture

### Key Components

- **lightrag.py**: Main `LightRAG` orchestrator — coordinates insertion, querying, and storage. Always call `await rag.initialize_storages()` after instantiation.
- **operate.py**: Core extraction and query operations (entity/relation extraction, chunking, multi-mode retrieval).
- **base.py**: Abstract base classes (`BaseKVStorage`, `BaseVectorStorage`, `BaseGraphStorage`, `BaseDocStatusStorage`).
- **kg/**: Storage implementations (JSON, NetworkX, Neo4j, PostgreSQL, MongoDB, Redis, Milvus, Qdrant, Faiss, Memgraph).
- **llm/**: LLM provider bindings (OpenAI, Ollama, Azure, Gemini, Bedrock, Anthropic). All use async patterns with caching.
- **api/**: FastAPI server with REST endpoints and Ollama-compatible API, plus React 19 + TypeScript WebUI.

### Storage Types

| Type | Purpose |
|------|---------|
| KV_STORAGE | LLM response cache, text chunks, document info |
| VECTOR_STORAGE | Entity/relation/chunk embeddings |
| GRAPH_STORAGE | Entity-relation graph structure |
| DOC_STATUS_STORAGE | Document processing status tracking |

### Query Modes

| Mode | Description |
|------|-------------|
| `local` | Context-dependent retrieval focused on specific entities |
| `global` | Community/summary-based broad knowledge retrieval |
| `hybrid` | Combines local and global |
| `naive` | Direct vector search without graph |
| `mix` | Integrates KG and vector retrieval (recommended with reranker) |

## Critical Usage Pattern

**The most common error** is forgetting to initialize storages:

```python
import asyncio
from lightrag import LightRAG
from lightrag.llm.openai import gpt_4o_mini_complete, openai_embed

async def main():
    rag = LightRAG(
        working_dir="./rag_storage",
        llm_model_func=gpt_4o_mini_complete,
        embedding_func=openai_embed
    )
    await rag.initialize_storages()  # REQUIRED

    await rag.ainsert("Your text here")
    result = await rag.aquery("Your question", param=QueryParam(mode="hybrid"))
    await rag.finalize_storages()

asyncio.run(main())
```

## Development Commands

```bash
# Setup
uv sync
source .venv/bin/activate
uv sync --extra api            # API support
uv sync --extra offline-storage # Storage backends
uv sync --extra test           # Testing deps

# Run tests
python -m pytest tests                        # Offline tests only
python -m pytest tests --run-integration      # Include integration tests
python -m pytest tests --keep-artifacts       # Debug mode

# Linting
ruff check .

# API server
lightrag-server                                    # Production
uvicorn lightrag.api.lightrag_server:app --reload  # Development

# WebUI
cd lightrag_webui && bun install --frozen-lockfile && bun run build
```

## Key Implementation Patterns

### Custom Embedding Functions

```python
from lightrag.utils import wrap_embedding_func_with_attrs

@wrap_embedding_func_with_attrs(embedding_dim=1536, max_token_size=8192)
async def custom_embed(texts: list[str]) -> np.ndarray:
    return await openai_embed.func(texts, model="text-embedding-3-large")
    # Use .func to access underlying function — do NOT wrap already-decorated functions
```

### Query Configuration

```python
from lightrag import QueryParam

result = await rag.aquery(
    "Your question",
    param=QueryParam(
        mode="mix",           # Recommended with reranker
        top_k=60,
        chunk_top_k=20,
        max_total_tokens=30000,
        enable_rerank=True,
        stream=False
    )
)
```

### Document Insertion

```python
await rag.ainsert("Text content")                              # Single
await rag.ainsert(["Text 1", "Text 2"])                        # Batch
await rag.ainsert("Text", ids=["doc-123"])                     # With IDs
await rag.ainsert(["T1", "T2"], file_paths=["a.pdf", "b.pdf"]) # With file paths
```

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `AttributeError: __aenter__` | Storage not initialized | Call `await rag.initialize_storages()` |
| Embedding errors after model switch | Stale vector data | Clear data directory, re-index |
| Nested embedding function error | Wrapping decorated func | Use `.func`: `EmbeddingFunc(func=openai_embed.func)` |
| Ollama context too short | Default 8k context | Set `llm_model_kwargs={"options": {"num_ctx": 32768}}` |

## Code Style

### Python
- PEP 8, 4-space indentation
- Type annotations throughout
- Use `lightrag.utils.logger` instead of `print`
- Async/await patterns throughout
- Dataclasses for state management
- Storage implementations in `kg/` with consistent base class inheritance

### TypeScript/React (WebUI)
- Functional components with hooks
- 2-space indentation
- PascalCase for components
- Tailwind utility-first styling

## LLM & Embedding Requirements

- **LLM**: Minimum 32B parameters, 32KB context (64KB recommended). Avoid reasoning models during indexing.
- **Embedding**: Must be consistent across indexing and querying. Recommended: `BAAI/bge-m3`, `text-embedding-3-large`.
- **Reranker**: Significantly improves quality. Recommended: `BAAI/bge-reranker-v2-m3`. Use `mix` mode when enabled.
