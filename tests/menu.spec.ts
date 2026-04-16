// @ts-check
import { test, expect } from '@playwright/test';
import baseURL from './url';

test.describe('index', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('menu icon is shown', async ({ page }) => {
        const menuIcon = page.locator('#menu-icon');

        await expect(menuIcon).toBeVisible();
        await expect(menuIcon).toBeInViewport();
    });

    test('menu is not shown', async ({ page }) => {
        const menuInner = page.locator("#cako-menu-inner");
        await expect(menuInner).not.toBeVisible();
    });

    test('menu is shown when icon is clicked', async ({ page }) => {
        const menuInner = page.locator("#cako-menu-inner");
        const menuIcon = page.locator('#menu-icon');
        const lightsIcon = page.locator('#cako-menu-lights svg')
        const featuresIcon = page.locator('#cako-menu-features svg')
        const search = page.getByRole('textbox', { name: 'Search' });

        await menuIcon.click();

        await expect(menuInner).toBeVisible();
        await expect(menuInner).toBeInViewport();
        await expect(lightsIcon).toBeVisible();
        await expect(featuresIcon).toBeVisible();
        await expect(search).toBeVisible();
    });
});