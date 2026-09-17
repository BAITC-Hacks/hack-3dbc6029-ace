import { expect, test } from "@playwright/test";

// Isolated frontend error-path test. Never call a paid provider from browser CI.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/generate', (route) => route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: { code: 'UPSTREAM_FAILURE', message: 'Test transport failure.', retryable: true } }) }));
});

test("validates input and reports the real scaffold API status", async ({ page }) => {
  await page.goto("/");
  const formError = page.locator("form").getByRole("alert");
  await expect(page.getByRole("heading", { name: "Новая лекция" })).toBeVisible();
  await page.getByRole("button", { name: "Создать материалы" }).click();
  await expect(formError).toHaveText("Введите текст лекции.");
  await page.getByLabel("Текст лекции").fill("Короткая лекция.");
  await page.getByRole("button", { name: "Создать материалы" }).click();
  await expect(formError).toContainText("минимум 80 слов");
  const lecture = "This text is only an input validation test. ".repeat(15);
  await page.getByLabel("Текст лекции").fill(lecture);
  const response = page.waitForResponse((response) => response.url().endsWith("/api/generate"));
  await page.getByRole("button", { name: "Создать материалы" }).click();
  expect((await response).status()).toBe(502);
  await expect(formError).toContainText("Не удалось создать материалы");
  await expect(page.getByLabel("Текст лекции")).toHaveValue(lecture);
});

test("renders without horizontal overflow and redirects an empty results session", async ({ page }) => {
  await page.goto("/results");
  await expect(page).toHaveURL("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/foundation-${test.info().project.name}.png`, fullPage: true });
});

test("submits custom provider settings without persisting the key", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Текст лекции").fill("This is an input validation test only. ".repeat(15));
  await page.getByLabel("Свой API", { exact: true }).check();
  await page.getByRole("button", { name: "Создать материалы" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Проверьте API URL");
  await page.getByLabel("API Base URL", { exact: true }).fill("https://gateway.example/proxy/v1/");
  await page.getByLabel("API key", { exact: true }).fill("test-only-browser-key");
  await page.getByLabel("Модель", { exact: true }).fill("vendor/custom-model");
  await expect(page.getByLabel("API key", { exact: true })).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Показать ключ" }).click();
  await expect(page.getByLabel("API key", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Скрыть ключ" }).click();
  const submitted = page.waitForRequest((request) => request.url().endsWith("/api/generate"));
  await page.getByRole("button", { name: "Создать материалы" }).click();
  expect((await submitted).postDataJSON().provider).toEqual({ baseURL: "https://gateway.example/proxy/v1", apiKey: "test-only-browser-key", model: "vendor/custom-model" });
  await expect(page.locator("form").getByRole("alert")).toContainText("Не удалось создать материалы");
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage }, cookies: document.cookie }))).not.toContain("test-only-browser-key");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/provider-${test.info().project.name}.png`, fullPage: true });
  await page.getByLabel("Свой API", { exact: true }).uncheck();
  const defaultRequest = page.waitForRequest((request) => request.url().endsWith("/api/generate"));
  await page.getByRole("button", { name: "Создать материалы" }).click();
  expect((await defaultRequest).postDataJSON()).not.toHaveProperty("provider");
  await expect(page.locator("form").getByRole("alert")).toBeVisible();
  await page.getByLabel("Свой API", { exact: true }).check();
  await expect(page.getByLabel("API key", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Сбросить настройки API" }).click();
  await expect(page.getByLabel("Свой API", { exact: true })).not.toBeChecked();
  await page.getByLabel("Свой API", { exact: true }).check();
  await expect(page.getByLabel("API Base URL", { exact: true })).toHaveValue("https://api.openai.com/v1");
  await page.getByLabel("API key", { exact: true }).fill("test-only-browser-key");
  await page.reload();
  await page.getByLabel("Свой API", { exact: true }).check();
  await expect(page.getByLabel("API key", { exact: true })).toHaveValue("");
});
