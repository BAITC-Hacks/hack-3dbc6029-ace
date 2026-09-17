import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/generate/route";
import { ErrorResponseSchema } from "@/lib/contracts/errors";
import { INPUT_LIMITS } from "@/lib/input";

function request(body: unknown) {
  return new Request("http://localhost/api/generate", { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(body) });
}

describe("generation endpoint foundation", () => {
  it.each([
    ["", 400, "EMPTY_INPUT"],
    ["Too short.", 400, "INPUT_TOO_SHORT"],
    ["x".repeat(INPUT_LIMITS.maxCharacters + 1), 413, "INPUT_TOO_LONG"],
    ["evidence ".repeat(80), 501, "NOT_IMPLEMENTED"],
  ])("returns a typed error without producing fake material", async (lecture, status, code) => {
    const response = await POST(request({ title: "", lecture, outputLanguage: "auto" }));
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(ErrorResponseSchema.parse(await response.json()).error).toMatchObject({ code, retryable: false });
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(new Request("http://localhost/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("rejects unexpected content types", async () => {
    const response = await POST(new Request("http://localhost/api/generate", { method: "POST", body: "{}" }));
    expect(response.status).toBe(415);
  });

  it("limits actual bytes when Content-Length is absent", async () => {
    const response = await POST(new Request("http://localhost/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: " ".repeat(INPUT_LIMITS.maxRequestBytes + 1) }));
    expect(response.status).toBe(413);
  });

  it("rejects an unexpected client API key field", async () => {
    const response = await POST(request({ title: "", lecture: "evidence ".repeat(80), outputLanguage: "auto", apiKey: "not-allowed" }));
    expect(response.status).toBe(400);
  });

  it("accepts a complete nested provider without echoing its key", async () => {
    const response = await POST(request({ title: "", lecture: "evidence ".repeat(80), outputLanguage: "auto", provider: { baseURL: "https://gateway.example/v1", apiKey: "test-only-private-value", model: "custom-model" } }));
    expect(response.status).toBe(501);
    const body = await response.text();
    expect(body).not.toContain("test-only-private-value");
    expect(JSON.parse(body).error.code).toBe("NOT_IMPLEMENTED");
  });

  it("rejects partial provider settings with a dedicated error", async () => {
    const response = await POST(request({ title: "", lecture: "evidence ".repeat(80), outputLanguage: "auto", provider: { baseURL: "https://gateway.example/v1", model: "custom-model" } }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_PROVIDER_CONFIG");
  });
});
