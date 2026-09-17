import { ERROR_HTTP_STATUS, type ErrorResponse, type GenerationError } from "@/lib/contracts/errors";
import { INPUT_LIMITS, validateGenerationInput } from "@/lib/input";

export const runtime = "nodejs";

function errorResponse(error: GenerationError) {
  return Response.json({ error } satisfies ErrorResponse, {
    status: ERROR_HTTP_STATUS[error.code],
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return errorResponse({ code: "UNSUPPORTED_MEDIA_TYPE", message: "Use application/json.", retryable: false });
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return errorResponse({ code: "INVALID_REQUEST", message: "Provide a JSON request body.", retryable: false });
  }

  let input: unknown;
  try {
    // Count received bytes instead of trusting a possibly absent Content-Length.
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > INPUT_LIMITS.maxRequestBytes) {
        await reader.cancel();
        return errorResponse({ code: "INPUT_TOO_LONG", message: "The request body exceeds 512 KiB.", retryable: false });
      }
      chunks.push(value);
    }
    const body = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    return errorResponse({ code: "INVALID_REQUEST", message: "The request must contain valid UTF-8 JSON.", retryable: false });
  } finally {
    reader.releaseLock();
  }

  const validation = validateGenerationInput(input);
  if (!validation.success) return errorResponse(validation.error);

  return errorResponse({
    code: "NOT_IMPLEMENTED",
    message: "The generation pipeline is not implemented yet.",
    retryable: false,
  });
}
