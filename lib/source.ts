import type { SourceSegment } from './schemas/studyMaterials';

export function segmentLecture(text: string): SourceSegment[] {
  const segments: SourceSegment[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + 1800, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf('\n', end);
      if (boundary > start + 400) end = boundary + 1;
      else if (/^[\uDC00-\uDFFF]$/.test(text[end])) end--;
    }
    const content = text.slice(start, end);
    if (content.trim()) segments.push({ id: `s${segments.length + 1}`, text: content, start, end });
    start = end;
  }
  return segments;
}
