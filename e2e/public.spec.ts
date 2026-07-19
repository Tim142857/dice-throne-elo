import { expect, test, type Page } from "@playwright/test";

async function gotoPage(pPage: Page, pPath: string) {
  await pPage.goto(pPath, { waitUntil: "domcontentloaded" });
}

test.describe("pages publiques", () => {
  test("accueil", async ({ page }) => {
    await gotoPage(page, "/");
    await expect(page.getByRole("heading", { name: "Dice Throne Elo" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir les classements" })).toBeVisible();
  });

  test("classement général", async ({ page }) => {
    await gotoPage(page, "/classements");
    await expect(page.getByRole("heading", { name: "Classement général" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Classement joueur–héros" })).toBeVisible();
  });

  test("classement joueur–héros", async ({ page }) => {
    await gotoPage(page, "/classements/joueurs-heros");
    await expect(page.getByRole("heading", { name: "Classement joueur–héros" })).toBeVisible();
  });

  test("liste des héros", async ({ page }) => {
    await gotoPage(page, "/heros");
    await expect(page.getByRole("heading", { name: "Héros" })).toBeVisible();
  });

  test("matchs validés", async ({ page }) => {
    await gotoPage(page, "/matchs");
    await expect(page.getByRole("heading", { name: "Matchs validés" })).toBeVisible();
  });

  test("confrontations joueurs", async ({ page }) => {
    await gotoPage(page, "/confrontations/joueurs");
    await expect(page.getByRole("heading", { name: "Confrontation joueurs" })).toBeVisible();
  });

  test("inscription affiche le formulaire", async ({ page }) => {
    await gotoPage(page, "/inscription");
    await expect(page.getByRole("heading", { name: "Inscription" })).toBeVisible();
    await expect(page.getByLabel("Pseudo public")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
    await expect(page.getByRole("button", { name: "Créer mon compte" })).toBeVisible();
  });

  test("connexion affiche le formulaire", async ({ page }) => {
    await gotoPage(page, "/connexion");
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
  });
});
