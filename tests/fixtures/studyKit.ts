import type { StudyKit } from "@/lib/schemas/studyMaterials";

// Test-only contract fixture. Never imported by app/ or lib/.
export function studyKitFixture(): StudyKit {
  const evidence = [{ segmentId: "s1", quote: "A schema defines a data structure." }];
  return {
    runId: "9e37789a-d9d3-4539-b381-7b19db62e715",
    lectureTitle: "Schema contract fixture",
    overview: { id: "overview", text: "A schema defines structure.", evidence },
    summary: [{ id: "summary1", title: "Structure", text: "Schemas describe structure.", topicIds: ["t1"], evidence }],
    keyPoints: [{ id: "point1", text: "Schemas define structure.", topicId: "t1", importance: "high", evidence }],
    quiz: [{ id: "q1", question: "What does a schema define?", options: ["A data structure", "A color", "A room", "A clock"], correctAnswer: 0, explanation: "The source says data structure.", topicId: "t1", kind: "recall", evidence }],
    flashcards: [{ id: "f1", front: "Schema", back: "Defines a data structure.", topicId: "t1", evidence }],
    limitations: ["Test-only fixture with one topic."],
    source: { text: evidence[0].quote, segments: [{ id: "s1", text: evidence[0].quote, start: 0, end: evidence[0].quote.length }], wordCount: 6 },
    topics: [{ id: "t1", title: "Schemas", evidence }],
    verification: {
      items: ["overview", "summary1", "point1", "q1", "f1"].map((itemId) => ({ itemId, status: "supported", reason: "Test contract record.", evidence })),
      supportedItems: 5, totalItems: 5, representedTopics: 1, totalTopics: 1,
      reviewedAt: "2026-09-17T10:00:00Z",
    },
  };
}
