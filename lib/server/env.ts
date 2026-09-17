import "server-only";
import { z } from "zod";

const OpenAIEnvironmentSchema = z.object({
  OPENAI_API_KEY: z.string().trim().min(1),
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-5-mini"),
});

// Call only when the AI pipeline is invoked, so builds never require a secret.
export function readOpenAIEnvironment() {
  const parsed = OpenAIEnvironmentSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("OpenAI server configuration is missing or invalid.");
  }
  return { apiKey: parsed.data.OPENAI_API_KEY, model: parsed.data.OPENAI_MODEL };
}
