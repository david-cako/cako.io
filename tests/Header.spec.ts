import { test, expect } from '@playwright/test';
import Header from './page/Header.ts';
import baseURL from './Url.ts';

test.describe('Header', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('begins at full opacity', async ({ page }) => {
        const header = new Header(page);
        expect(await header.headerOpacityProgress()).toBe(0);
    });

    test('is visible', async ({ page }) => {
        const header = new Header(page);
        await header.expectIsVisible();
    });

    test('fades out', async ({ page }) => {
        const header = new Header(page);
        await header.expectIsVisible();

        await page.mouse.wheel(0, 25);

        await header.expectIsFadingOut();
    })

    test('disappears', async ({ page }) => {
        const header = new Header(page);
        await header.expectIsVisible();

        await page.mouse.wheel(0, 100);

        await header.expectIsInvisible();
    })
})