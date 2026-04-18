// @ts-check
import { test, expect } from '@playwright/test';
import baseURL from './url';
import Api from './page/Api';

test.describe('Api', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('Api retrieves all posts', async ({ page }) => {
        const api = new Api(page);
        const obj = await api.waitForAnyResponse();

        const totalPosts: number = obj.meta.pagination.total;

        const posts = await api.getAllPosts();

        expect(posts.length).toBe(totalPosts);
    });
});