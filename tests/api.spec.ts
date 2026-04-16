// @ts-check
import { test, expect } from '@playwright/test';
import baseURL from './url';

test.describe('api', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('api retrieves all posts', async ({ page }) => {
        const responsePromise = page.waitForResponse(r => r.url().includes('/ghost/api/v3/content/posts'));
        const response = await responsePromise;
        const obj = await response.json();

        const totalPosts: number = obj.meta.pagination.total;

        const posts = await page.evaluate(async () => {
            return await (window as any).Api.getAllPosts()
        });

        expect(posts.length).toBe(totalPosts);
    });
});