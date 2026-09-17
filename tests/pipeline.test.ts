import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { generateStudyKit } from '@/lib/ai/pipeline';
import { GeneratedMaterialsSchema } from '@/lib/schemas/studyMaterials';
import { segmentLecture } from '@/lib/source';
import { validateMaterials, validateReview } from '@/lib/ai/grounding';
import type { createOpenAIClient } from '@/lib/openai';
import { studyKitFixture } from './fixtures/studyKit';

const kit = studyKitFixture();
const materials = GeneratedMaterialsSchema.parse(Object.fromEntries(Object.entries(kit).filter(([key]) => !['runId', 'source', 'topics', 'verification'].includes(key))));
const analysis = { title: 'Schemas', language: 'en', sufficient: true, insufficiencyReason: null, topics: kit.topics, concepts: [], relationships: [], ambiguities: [] };
const response = (output_parsed: unknown) => ({ status: 'completed', output: [], output_parsed });

describe('source grounding', () => {
  it('preserves exact offsets for long multilingual sources', () => {
    const text = ('学习 😀 knowledge\n').repeat(500);
    const parts = segmentLecture(text);
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(text.slice(part.start, part.end)).toBe(part.text);
    expect(parts.map((part) => part.text).join('')).toBe(text);
  });
  it('rejects fake evidence and incomplete reviews', () => {
    const bad = structuredClone(materials);
    bad.quiz[0].evidence[0].quote = 'Invented fact';
    expect(() => validateMaterials(bad, kit.topics, kit.source.segments)).toThrow();
    expect(() => validateReview(materials, kit.verification.items.slice(1), kit.source.segments)).toThrow();
    expect(() => validateReview(materials, kit.verification.items.map((item) => ({ ...item, status: 'unsupported' })), kit.source.segments)).toThrow();
  });
});

describe('generation pipeline', () => {
  it('runs three real-call stages and computes counts from review records', async () => {
    const parse = vi.fn().mockResolvedValueOnce(response(analysis)).mockResolvedValueOnce(response(materials)).mockResolvedValueOnce(response({ items: kit.verification.items }));
    const connection = { client: { responses: { parse } }, model: 'test-model' } as unknown as ReturnType<typeof createOpenAIClient>;
    const emit = vi.fn();
    const result = await generateStudyKit({ title: '', lecture: kit.source.text, outputLanguage: 'en' }, connection, kit.runId, new AbortController().signal, emit);
    expect(result.verification.supportedItems).toBe(5);
    expect(result.source.text).toBe(kit.source.text);
    expect(parse).toHaveBeenCalledTimes(3);
    expect(emit.mock.calls.map(([event]) => event.stage)).toEqual(['analyzing', 'generating', 'verifying']);
  });
  it('does not publish a kit when repeated reviews are unsupported', async () => {
    const parse = vi.fn().mockResolvedValueOnce(response(analysis));
    for (let i = 0; i < 3; i++) parse.mockResolvedValueOnce(response(materials)).mockResolvedValueOnce(response({ items: kit.verification.items.map((item) => ({ ...item, status: 'unsupported' })) }));
    const connection = { client: { responses: { parse } }, model: 'test-model' } as unknown as ReturnType<typeof createOpenAIClient>;
    await expect(generateStudyKit({ title: '', lecture: kit.source.text, outputLanguage: 'en' }, connection, kit.runId, new AbortController().signal, vi.fn())).rejects.toMatchObject({ code: 'VERIFICATION_FAILED' });
    expect(parse).toHaveBeenCalledTimes(7);
  });
});
