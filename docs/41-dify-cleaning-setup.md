# Dify knowledge cleaning setup

## Architecture

```text
Upload -> local parser -> local chunking -> Dify Workflow -> embedding -> Qdrant
```

Dify is an optional cleaning step. Qiyun AI remains the source of truth for documents, chunks, vectors, tenant isolation, chat, and inquiries.

## Create the Dify Workflow

Create a **Workflow** application in Dify Cloud with these input variables:

| Variable | Type | Required |
| --- | --- | --- |
| `text` | Paragraph | Yes |
| `document_name` | Text | Yes |
| `section_title` | Text | No |

Recommended nodes:

1. Start
2. LLM cleaning node
3. End

The End node must expose one string output named `cleaned_text`.

Suggested LLM instruction:

```text
You clean industrial product knowledge for retrieval.
Keep all factual specifications, units, model names, constraints, warnings, and contact rules.
Remove repeated headers, page numbers, navigation, advertisements, broken encoding, and irrelevant boilerplate.
Do not invent, summarize away, translate, or change numeric values.
Return only the cleaned text. Return the original text when uncertain.
```

Publish the Workflow and create its API key. Store the key only in the API/Worker environment:

```env
DIFY_ENABLED=true
DIFY_BASE_URL=https://api.dify.ai/v1
DIFY_API_KEY=app-your-workflow-key
DIFY_TIMEOUT_MS=30000
DIFY_CLEAN_OUTPUT_VARIABLE=cleaned_text
DIFY_CLEAN_FAIL_OPEN=true
```

Restart both `qiyun-api` and `qiyun-worker` after changing the environment. Existing documents are unchanged until they are reparsed or reindexed.

## Safe rollout

1. Keep `DIFY_ENABLED=false` while creating the Workflow.
2. Enable it in a test workspace and reparse one representative document.
3. Compare chunks before and after cleaning.
4. Test at least five known questions and verify citations.
5. Enable it for additional documents only after numeric parameters remain accurate.

`DIFY_CLEAN_FAIL_OPEN=true` keeps the existing locally cleaned chunk whenever Dify times out, returns an HTTP error, or omits `cleaned_text`.
