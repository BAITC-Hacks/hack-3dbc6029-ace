import { expect, test } from "@playwright/test";

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
  expect((await response).status()).toBe(501);
  await expect(formError).toHaveText("Генерация материалов пока недоступна.");
  await expect(page.getByLabel("Текст лекции")).toHaveValue(lecture);
});

test("renders without horizontal overflow and redirects an empty results session", async ({ page }) => {
  await page.goto("/results");
  await expect(page).toHaveURL("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/foundation-${test.info().project.name}.png`, fullPage: true });
});
