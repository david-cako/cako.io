// @ts-check
import { test, expect } from '@playwright/test';
import baseURL from './Url.ts';
import Menu from './page/Menu.ts';
import Header from './page/Header.ts';

test.describe('Menu', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('menu icon is shown', async ({ page }) => {
        const menu = new Menu(page);

        await expect(menu.menuIcon).toBeVisible();
        await expect(menu.menuIcon).toBeInViewport();
    });

    test('menu is not shown', async ({ page }) => {
        const menu = new Menu(page);
        await menu.expectIsNotShown();
    });

    test('menu is shown when icon is clicked', async ({ page }) => {
        const menu = new Menu(page);
        await menu.show();
    });

    test('menu is closed when icon is clicked again', async ({ page }) => {
        const menu = new Menu(page);

        await menu.show();
        await menu.menuIcon.click();

        await menu.expectIsNotShown();
    });

    test('menu is closed when escape key is pressed', async ({ page }) => {
        const menu = new Menu(page);

        await menu.show();
        await page.keyboard.press("Escape");

        await menu.expectIsNotShown();
    });

    test('menu is closed on navigation to home', async ({ page }) => {
        const menu = new Menu(page);
        const header = new Header(page);

        await menu.show();
        await header.header.click();

        await menu.expectIsNotShown();
    });

    test('menu is closed on navigation to post', async ({ page }) => {
        const menu = new Menu(page);
        const post = page.locator(".cako-post-link").first();

        await menu.show();
        await post.click();

        await menu.expectIsNotShown();
    });

    test('menu is closed on navigation to features', async ({ page }) => {
        const menu = new Menu(page);

        await menu.show();
        await menu.features.click();

        await menu.expectIsNotShown();
    });

    test('menu is closed on lights toggled', async ({ page }) => {
        const menu = new Menu(page);
        const header = new Header(page);

        await menu.show();
        await menu.lightsIcon.click();

        await menu.expectIsNotShown();
    });

    test('menu is closed on page clicked', async ({ page }) => {
        const menu = new Menu(page);
        const body = await page.locator("body");

        await menu.show();
        await body.click();

        await menu.expectIsNotShown();
    });

    test('menu is not closed on search clicked', async ({ page }) => {
        const menu = new Menu(page);

        await menu.show();
        await menu.search.search.click();

        await menu.expectIsShown();
    });

    test('menu is not closed on search input', async ({ page }) => {
        const menu = new Menu(page);

        await menu.show();
        await menu.search.search.fill("test");

        await menu.expectIsShown();
    });

    test('menu is not closed on search cleared', async ({ page }) => {
        const menu = new Menu(page);

        await menu.search.findResults();
        await menu.search.clearIcon.click();

        await menu.expectIsShown();
    });

    test('menu is closed on search navigation', async ({ page }) => {
        const menu = new Menu(page);

        await menu.search.findResults();
        await menu.search.results.first().locator("a").click();

        await menu.expectIsNotShown();
    });
});