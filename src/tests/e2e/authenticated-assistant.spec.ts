import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const e2eEnv = {
  supabaseUrl: process.env.E2E_SUPABASE_URL,
  anonKey: process.env.E2E_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
  email: process.env.E2E_TEST_EMAIL,
  password: process.env.E2E_TEST_PASSWORD,
};

const hasAuthenticatedE2eEnv = Object.values(e2eEnv).every(Boolean);

function createAdminClient() {
  return createClient(e2eEnv.supabaseUrl!, e2eEnv.serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function findUserByEmail(admin: SupabaseClient, email: string) {
  const { data, error } = await admin.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function ensureTestUser(admin: SupabaseClient): Promise<User> {
  const existing = await findUserByEmail(admin, e2eEnv.email!);

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: e2eEnv.password!,
      email_confirm: true,
    });

    if (error) {
      throw error;
    }

    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: e2eEnv.email!,
    password: e2eEnv.password!,
    email_confirm: true,
    user_metadata: {
      full_name: "XW E2E User",
    },
  });

  if (error) {
    throw error;
  }

  return data.user;
}

async function cleanUserTransactions(admin: SupabaseClient, userId: string) {
  await admin.from("ai_action_logs").delete().eq("user_id", userId);
  await admin.from("transaction_events").delete().eq("user_id", userId);
  await admin.from("transactions").delete().eq("user_id", userId);
}

async function seedRonEurInsightsScenario(admin: SupabaseClient, userId: string) {
  const { error: fxError } = await admin.from("fx_rates").upsert(
    [
      {
        base_currency: "EUR",
        quote_currency: "EUR",
        rate: 1,
        rate_date: "2026-05-04",
        source: "ECB euro reference rates",
        fetched_at: "2026-05-04T12:00:00.000Z",
      },
      {
        base_currency: "EUR",
        quote_currency: "RON",
        rate: 5,
        rate_date: "2026-05-04",
        source: "ECB euro reference rates",
        fetched_at: "2026-05-04T12:00:00.000Z",
      },
    ],
    { onConflict: "base_currency,quote_currency,rate_date,source" },
  );

  if (fxError && !["42P01", "PGRST205"].includes(fxError.code ?? "")) {
    throw fxError;
  }

  const { error } = await admin.from("transactions").insert([
    {
      user_id: userId,
      transaction_type: "expense",
      amount_minor: 10000,
      currency: "RON",
      occurred_at: "2026-05-03T10:00:00.000Z",
      category_id: null,
      merchant: "Needs sorting",
      source: "manual",
      review_state: "needs_attention",
      uncertainty_reason: "Needs category",
    },
    {
      user_id: userId,
      transaction_type: "income",
      amount_minor: 5000,
      currency: "EUR",
      occurred_at: "2026-05-04T09:00:00.000Z",
      category_id: null,
      merchant: "EUR income",
      source: "manual",
      review_state: "reviewed",
    },
  ]);

  if (error) {
    throw error;
  }
}

test.describe("authenticated assistant capture", () => {
  test.skip(!hasAuthenticatedE2eEnv, "Set authenticated e2e Supabase env vars to run this smoke test.");

  let admin: SupabaseClient;
  let testUser: User;

  test.beforeAll(async () => {
    admin = createAdminClient();
    testUser = await ensureTestUser(admin);
    await cleanUserTransactions(admin, testUser.id);
  });

  test.afterAll(async () => {
    if (admin && testUser) {
      await cleanUserTransactions(admin, testUser.id);
    }
  });

  test("captures, recategorizes, deletes, and restores coffee 5 through assistant corrections", async ({ page }) => {
    await page.goto("/sign-in?next=/assistant");
    await page.getByLabel("Email").fill(e2eEnv.email!);
    await page.getByLabel("Password", { exact: true }).fill(e2eEnv.password!);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/assistant$/);

    await page.getByLabel("Message").fill("coffee 5");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Saved $5.00 to tracked items.")).toBeVisible();

    await page.getByLabel("Message").fill("change that to groceries");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Changed coffee to Groceries.")).toBeVisible();

    await page.goto("/transactions");
    await expect(page.getByText("coffee")).toBeVisible();
    await expect(page.getByText("-$5.00")).toBeVisible();
    await expect(page.getByText(/Groceries\s+-/)).toBeVisible();

    await page.goto("/assistant");
    await page.getByLabel("Message").fill("delete last");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Deleted your last transaction.")).toBeVisible();

    await page.goto("/transactions");
    await expect(page.getByText("coffee")).not.toBeVisible();

    await page.goto("/assistant");
    await page.getByLabel("Message").fill("undo last");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Restored your last deleted transaction.")).toBeVisible();

    await page.goto("/transactions");
    await expect(page.getByText("coffee")).toBeVisible();
    await expect(page.getByText("-$5.00")).toBeVisible();
  });

  test("renders switchable EUR and RON insights without old mixed-currency cards", async ({ page }) => {
    await cleanUserTransactions(admin, testUser.id);
    await seedRonEurInsightsScenario(admin, testUser.id);

    await page.goto("/sign-in?next=/insights?currency=RON");
    await page.getByLabel("Email").fill(e2eEnv.email!);
    await page.getByLabel("Password", { exact: true }).fill(e2eEnv.password!);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/insights\?currency=RON$/);
    await expect(page.getByText("View totals as:")).toBeVisible();
    await expect(page.getByRole("link", { name: "EUR" })).toHaveAttribute("href", "/insights?currency=EUR");
    await expect(page.getByRole("link", { name: "RON" })).toHaveAttribute("href", "/insights?currency=RON");

    let insightsText = await page.locator("body").innerText();
    expect(insightsText).toMatch(/Monthly income[\s\S]*RON\s*2[5-6][0-9]/);
    expect(insightsText).toMatch(/Monthly spending[\s\S]*RON\s*100/);
    expect(insightsText).toMatch(/Includes .*50(?:\.00)? income .* RON\s*2[5-6][0-9]/);
    expect(insightsText).not.toContain("RON totals");
    expect(insightsText).not.toContain("entries kept separate");
    expect(insightsText).not.toContain("Review entries");
    await expect(page.getByText("Needs category")).toBeVisible();
    await expect(page.getByRole("link", { name: "Review" })).toHaveAttribute("href", "/transactions?view=needs-review");
    await page.screenshot({ fullPage: true, path: "test-results/insights-currency-switcher.png" });

    await page.goto("/insights?currency=EUR");
    await expect(page).toHaveURL(/\/insights\?currency=EUR$/);
    insightsText = await page.locator("body").innerText();
    expect(insightsText).toMatch(/Monthly income[\s\S]*50/);
    expect(insightsText).toMatch(/Monthly spending[\s\S]*(19|20)/);
    expect(insightsText).not.toContain("kept separate");

    await page.goto("/transactions?view=income");
    await expect(page.getByText("EUR income")).toBeVisible();
    await expect(page.getByText(/50\.00/)).toBeVisible();
  });
});
