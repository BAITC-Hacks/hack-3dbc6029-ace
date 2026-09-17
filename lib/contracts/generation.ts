import { z } from "zod";
import { GenerationErrorSchema } from "@/lib/contracts/errors";
import { StudyKitSchema } from "@/lib/schemas/studyMaterials";

export { GenerateRequestSchema, OutputLanguageSchema } from "@/lib/input";
export type { GenerateRequest, OutputLanguage } from "@/lib/input";
export { ProviderConfigSchema } from "@/lib/provider";
export type { ProviderConfig } from "@/lib/provider";
export { ErrorResponseSchema, GenerationErrorSchema } from "@/lib/contracts/errors";
export type { GenerationError, ErrorResponse, ErrorCode } from "@/lib/contracts/errors";

export const GENERATION_CONTENT_TYPE = "application/x-ndjson";
export const StageSchema = z.enum([
  "validating", "analyzing", "generating", "verifying", "correcting", "complete",
]);
export type GenerationStage = z.infer<typeof StageSchema>;

const runId = z.uuid();
export const StageEventSchema = z.strictObject({
  type: z.literal("stage"), runId, stage: StageSchema,
});
export const RetryEventSchema = z.strictObject({
  type: z.literal("retry"),
  runId,
  stage: StageSchema.exclude(["validating", "complete"]),
  attempt: z.number().int().min(2).max(3),
  maxAttempts: z.number().int().min(2).max(3),
  message: z.string().min(1),
}).refine((event) => event.attempt <= event.maxAttempts, {
  message: "Attempt cannot exceed maxAttempts.", path: ["attempt"],
});
export const ResultEventSchema = z.strictObject({
  type: z.literal("result"), runId, data: StudyKitSchema,
}).refine((event) => event.runId === event.data.runId, {
  message: "Result runId must match the event runId.", path: ["data", "runId"],
});
export const ErrorEventSchema = z.strictObject({
  type: z.literal("error"), runId, error: GenerationErrorSchema,
});

export const GenerationEventSchema = z.discriminatedUnion("type", [
  StageEventSchema, RetryEventSchema, ResultEventSchema, ErrorEventSchema,
]);
export type GenerationEvent = z.infer<typeof GenerationEventSchema>;

export function isTerminalEvent(event: GenerationEvent): boolean {
  return event.type === "result" || event.type === "error";
}

export function encodeGenerationEvent(event: GenerationEvent): string {
  return `${JSON.stringify(GenerationEventSchema.parse(event))}\n`;
}
