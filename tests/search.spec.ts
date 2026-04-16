// @ts-check
import { test, expect } from '@playwright/test';
import baseURL from './url';

test.describe('search', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('search finds text results', async ({ page }) => {
        const menuIcon = page.locator('#menu-icon');
        const search = page.getByRole('textbox', { name: 'Search' })

        await menuIcon.click();
        await search.fill('test');
        await expect(page.getByRole('link', { name: 'Lovely Rita (fuck.tha.' }))
            .toBeVisible({ timeout: 30000 });
        await expect(page.getByRole('link', { name: 'Winter\'s Toll 16 October' }))
            .toBeVisible({ timeout: 30000 });
    });

    test('search finds title results', async ({ page }) => {
        const menuIcon = page.locator('#menu-icon');
        const search = page.getByRole('textbox', { name: 'Search' })

        await menuIcon.click();
        await search.fill('diamond praeturnal');
        await expect(page.getByRole('link', { name: 'Diamond Praeturnal Reorder' }))
            .toBeVisible({ timeout: 30000 });
    });
});