import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import { encodeGenerationEvent, GenerationEventSchema, isTerminalEvent } from "@/lib/contracts/generation";
import { AnalysisSchema, GeneratedMaterialsSchema, QuizQuestionSchema, StudyKitSchema, VerificationResponseSchema } from "@/lib/schemas/studyMaterials";
import { studyKitFixture } from "./fixtures/studyKit";

describe("study materials contract", () => {
  it("accepts all four material types with source evidence", () => {
    expect(StudyKitSchema.safeParse(studyKitFixture()).success).toBe(true);
  });

  it("enforces four quiz options and zero-based answer bounds", () => {
    const question = studyKitFixture().quiz[0];
    for (const correctAnswer of [-1, 4, 1.5, "0"]) {
      expect(QuizQuestionSchema.safeParse({ ...question, correctAnswer }).success).toBe(false);
    }
    expect(QuizQuestionSchema.safeParse({ ...question, options: ["Only one"] }).success).toBe(false);
    expect(QuizQuestionSchema.safeParse({ ...question, evidence: [] }).success).toBe(false);
  });

  it("rejects missing material groups and undeclared fields", () => {
    const kit = studyKitFixture();
    expect(StudyKitSchema.safeParse({ ...kit, quiz: [] }).success).toBe(false);
    expect(StudyKitSchema.safeParse({ ...kit, fakeConfidence: 100 }).success).toBe(false);
    expect(StudyKitSchema.safeParse({ ...kit, flashcards: undefined }).success).toBe(false);
  });

  it.each([
    ["analysis", AnalysisSchema],
    ["materials", GeneratedMaterialsSchema],
    ["verification", VerificationResponseSchema],
  ] as const)("converts %s to the SDK strict JSON schema format", (name, schema) => {
    const format = zodTextFormat(schema, name);
    expect(format.type).toBe("json_schema");
    expect(format.strict).toBe(true);
    expect(format.schema).toMatchObject({ type: "object", additionalProperties: false });
  });
});

describe("generation event contract", () => {
  const runId = studyKitFixture().runId;

  it("encodes one JSON object per line, escaping embedded newlines", () => {
    const line = encodeGenerationEvent({ type: "error", runId, error: { code: "TIMEOUT", message: "Try again\nlater", retryable: true } });
    expect(line.split("\n")).toHaveLength(2);
    expect(GenerationEventSchema.parse(JSON.parse(line)).type).toBe("error");
  });

  it("only result and error are terminal events", () => {
    expect(isTerminalEvent({ type: "stage", runId, stage: "complete" })).toBe(false);
    expect(isTerminalEvent({ type: "result", runId, data: studyKitFixture() })).toBe(true);
  });

  it("rejects mismatched run IDs", () => {
    expect(GenerationEventSchema.safeParse({ type: "result", runId: "9e37789a-d9d3-4539-b381-7b19db62e716", data: studyKitFixture() }).success).toBe(false);
  });

  it("bounds retries and excludes non-retryable stages", () => {
    const retry = { type: "retry", runId, stage: "generating", attempt: 2, maxAttempts: 3, message: "Retrying validation." };
    expect(GenerationEventSchema.safeParse(retry).success).toBe(true);
    expect(GenerationEventSchema.safeParse({ ...retry, attempt: 3, maxAttempts: 2 }).success).toBe(false);
    expect(GenerationEventSchema.safeParse({ ...retry, attempt: 4 }).success).toBe(false);
    expect(GenerationEventSchema.safeParse({ ...retry, stage: "complete" }).success).toBe(false);
  });
});
