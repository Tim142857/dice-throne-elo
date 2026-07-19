import { expect, test } from "@playwright/test";

/**
 * Scénarios CDC §23 nécessitant un projet Supabase + comptes de test.
 * Activer avec E2E_AUTH=1 et les variables documentées dans docs/testing.md.
 */
const authEnabled = process.env.E2E_AUTH === "1";

test.describe("parcours authentifiés (optionnels)", () => {
  test.skip(!authEnabled, "Définir E2E_AUTH=1 et les comptes de test (docs/testing.md).");

  test("inscription email laisse le compte en attente après connexion", async ({ page }) => {
    const email = process.env.E2E_SIGNUP_EMAIL;
    const password = process.env.E2E_SIGNUP_PASSWORD;
    const pseudo = process.env.E2E_SIGNUP_PSEUDO ?? `E2E${Date.now().toString().slice(-6)}`;
    test.skip(!email || !password, "E2E_SIGNUP_EMAIL / E2E_SIGNUP_PASSWORD requis.");

    await page.goto("/inscription");
    await page.getByLabel("Pseudo public").fill(pseudo!);
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Mot de passe").fill(password!);
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByRole("status")).toContainText(/Compte créé|email/i);
  });

  test("joueur actif peut ouvrir le formulaire de déclaration", async ({ page }) => {
    const email = process.env.E2E_PLAYER_EMAIL;
    const password = process.env.E2E_PLAYER_PASSWORD;
    test.skip(!email || !password, "E2E_PLAYER_EMAIL / E2E_PLAYER_PASSWORD requis.");

    await page.goto("/connexion");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Mot de passe").fill(password!);
    await page.getByRole("button", { name: /Se connecter/i }).click();
    await page.waitForURL(/\/(tableau-de-bord|mes-matchs|$)/);

    await page.goto("/matchs/nouveau");
    await expect(page.getByRole("heading", { name: /Déclarer|Nouveau match/i })).toBeVisible();
  });

  test("admin peut ouvrir la gestion des héros", async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;
    test.skip(!email || !password, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD requis.");

    await page.goto("/connexion");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Mot de passe").fill(password!);
    await page.getByRole("button", { name: /Se connecter/i }).click();
    await page.waitForURL(/\/(tableau-de-bord|admin|$)/);

    await page.goto("/admin/heros");
    await expect(page.getByRole("heading", { name: "Héros" })).toBeVisible();
  });
});
