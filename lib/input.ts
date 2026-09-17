import { z } from "zod";
import type { GenerationError } from "@/lib/contracts/errors";

export const INPUT_LIMITS = {
  minContentCharacters: 300,
  minWords: 80,
  maxCharacters: 60_000,
  maxInputTokens: 16_000,
  maxTitleCharacters: 200,
  maxRequestBytes: 512 * 1024,
} as const;

export const OutputLanguageSchema = z.enum(["auto", "ru", "en", "zh"]);
export type OutputLanguage = z.infer<typeof OutputLanguageSchema>;

// Structural validation is separate so length failures have stable error codes.
export const GenerateRequestSchema = z.strictObject({
  title: z.string().max(INPUT_LIMITS.maxTitleCharacters),
  lecture: z.string(),
  outputLanguage: OutputLanguageSchema,
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

const segmenter = new Intl.Segmenter("und", { granularity: "word" });

export function countWords(text: string): number {
  let count = 0;
  for (const segment of segmenter.segment(text)) {
    if (segment.isWordLike) count++;
  }
  return count;
}

export function validateLecture(lecture: string): GenerationError | null {
  if (lecture.length > INPUT_LIMITS.maxCharacters) {
    return { code: "INPUT_TOO_LONG", message: "The lecture exceeds 60,000 characters.", retryable: false };
  }
  if (!lecture.trim()) {
    return { code: "EMPTY_INPUT", message: "Please enter your lecture text.", retryable: false };
  }
  if (lecture.replace(/\s/gu, "").length < INPUT_LIMITS.minContentCharacters ||
      countWords(lecture) < INPUT_LIMITS.minWords) {
    return {
      code: "INPUT_TOO_SHORT",
      message: "Please provide at least 80 words and 300 non-whitespace characters.",
      retryable: false,
    };
  }
  return null;
}

export type InputValidationResult =
  | { success: true; data: GenerateRequest }
  | { success: false; error: GenerationError };

export function validateGenerationInput(input: unknown): InputValidationResult {
  const parsed = GenerateRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "INVALID_REQUEST", message: "Provide a title, lecture, and supported output language.", retryable: false },
    };
  }
  const error = validateLecture(parsed.data.lecture);
  return error ? { success: false, error } : { success: true, data: parsed.data };
}
