"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, BookOpenText, FileText, Languages, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorResponseSchema, type ErrorCode } from "@/lib/contracts/generation";
import { countWords, INPUT_LIMITS, OutputLanguageSchema, validateGenerationInput, type OutputLanguage } from "@/lib/input";

const errorMessages: Partial<Record<ErrorCode, string>> = {
  EMPTY_INPUT: "Введите текст лекции.",
  INPUT_TOO_SHORT: "Добавьте больше текста: минимум 80 слов и 300 символов без пробелов.",
  INPUT_TOO_LONG: "Лекция слишком длинная. Максимум 60 000 символов.",
  INVALID_REQUEST: "Проверьте название, текст и язык материалов.",
  NOT_IMPLEMENTED: "Генерация материалов пока недоступна.",
};
const fieldClass = "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60";

// Foundation only; xiaomao owns the full editor and study session in X01-X03.
export default function Home() {
  const [title, setTitle] = useState("");
  const [lecture, setLecture] = useState("");
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("auto");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    const validation = validateGenerationInput({ title, lecture, outputLanguage });
    if (!validation.success) {
      setError(errorMessages[validation.error.code] ?? validation.error.message);
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const body: unknown = await response.json();
      const parsed = ErrorResponseSchema.safeParse(body);
      setError(parsed.success
        ? errorMessages[parsed.data.error.code] ?? "Не удалось создать материалы. Попробуйте ещё раз."
        : "Неожиданный ответ сервера. Попробуйте ещё раз.");
    } catch {
      setError("Не удалось связаться с сервером. Проверьте соединение.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-18 max-w-5xl items-center gap-3 px-5 sm:px-8">
          <BookOpenText className="size-7 text-primary" aria-hidden="true" />
          <span className="text-xl font-bold">LECTOR <span className="font-normal text-muted-foreground">AI</span></span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 flex items-center gap-3">
          <FileText className="size-5 text-[#a66b13]" aria-hidden="true" />
          <h1 className="text-2xl font-semibold">Новая лекция</h1>
        </div>
        <form onSubmit={submit} className="space-y-6" aria-busy={pending}>
          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-medium">Название <span className="font-normal text-muted-foreground">(необязательно)</span></label>
            <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={INPUT_LIMITS.maxTitleCharacters} disabled={pending} className={fieldClass} placeholder="Название лекции" />
          </div>
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="lecture" className="text-sm font-medium">Текст лекции</label>
              <span id="lecture-count" className="text-xs tabular-nums text-muted-foreground">{countWords(lecture)} слов · {lecture.length.toLocaleString("ru-RU")} / 60 000</span>
            </div>
            <textarea id="lecture" value={lecture} onChange={(event) => { setLecture(event.target.value); setError(null); }} maxLength={INPUT_LIMITS.maxCharacters} disabled={pending} className={`${fieldClass} min-h-72 leading-7 sm:min-h-88`} placeholder="Текст вашей лекции…" aria-describedby={error ? "lecture-count form-error" : "lecture-count"} />
          </div>
          <div className="flex flex-col gap-5 border-t border-border pt-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:w-64">
              <label htmlFor="language" className="mb-2 flex items-center gap-2 text-sm font-medium"><Languages className="size-4 text-muted-foreground" aria-hidden="true" />Язык материалов</label>
              <select id="language" value={outputLanguage} disabled={pending} onChange={(event) => setOutputLanguage(OutputLanguageSchema.parse(event.target.value))} className={fieldClass}>
                <option value="auto">Язык лекции</option><option value="ru">Русский</option><option value="en">English</option><option value="zh">中文</option>
              </select>
            </div>
            <Button type="submit" disabled={pending} className="h-11 shrink-0">
              {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
              {pending ? "Отправка…" : "Создать материалы"}
            </Button>
          </div>
          {error && <div id="form-error" role="alert" className="flex items-start gap-2 text-sm leading-6 text-destructive"><AlertCircle className="mt-1 size-4 shrink-0" aria-hidden="true" /><p>{error}</p></div>}
        </form>
      </main>
    </>
  );
}
