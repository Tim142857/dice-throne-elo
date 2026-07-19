import { expect, test, type Page } from "@playwright/test";

async function gotoPage(pPage: Page, pPath: string) {
  await pPage.goto(pPath, { waitUntil: "domcontentloaded" });
}

test.describe("gardes d’accès", () => {
  test("admin redirige vers connexion sans session", async ({ page }) => {
    await gotoPage(page, "/admin");
    await expect(page).toHaveURL(/\/connexion/);
  });

  test("nouveau match redirige vers connexion sans session", async ({ page }) => {
    await gotoPage(page, "/matchs/nouveau");
    await expect(page).toHaveURL(/\/connexion/);
  });

  test("mes matchs redirige vers connexion sans session", async ({ page }) => {
    await gotoPage(page, "/mes-matchs");
    await expect(page).toHaveURL(/\/connexion/);
  });

  test("notifications redirige vers connexion sans session", async ({ page }) => {
    await gotoPage(page, "/notifications");
    await expect(page).toHaveURL(/\/connexion/);
  });
});
