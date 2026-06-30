import { expect, test } from "@playwright/test";

test("sign in page renders auth fields", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByText("Welcome back")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
});

test.describe("protected route redirects", () => {
  test("/assistant redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/assistant");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fassistant$/);
    await expect(page.getByText("Welcome back")).toBeVisible();
  });

  test("/transactions redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/transactions?view=needs-review");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Ftransactions%3Fview%3Dneeds-review$/);
    await expect(page.getByText("Welcome back")).toBeVisible();
  });

  test("/insights redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/insights");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Finsights$/);
    await expect(page.getByText("Welcome back")).toBeVisible();
  });
});
