import { test, expect, Locator, Page } from '@playwright/test';
import Header from './page/Header';
import baseURL from './url';

test.describe('Header', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('header begins at full opacity', async ({ page }) => {
        const header = new Header(page);
        expect(await header.headerOpacityProgress()).toBe(0);
    });

    test('header is visible', async ({ page }) => {
        const header = new Header(page);
        await header.expectIsVisible();
    });
})