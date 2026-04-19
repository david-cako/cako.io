// @ts-check
import { test, expect } from '@playwright/test';
import baseURL from './Url.ts';
import Search from './page/Search.ts';
import { expectNoDuplicatePosts } from './page/Utils.ts';

test.describe('Search', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
        await page.waitForTimeout(100);
    });

    test('finds text results', async ({ page }) => {
        const search = new Search(page);
        await search.findResults();
    });

    test('finds title results', async ({ page }) => {
        const search = new Search(page);
        await search.findTitleResults();
    });

    test('does not find duplicate text results', async ({ page }) => {
        const search = new Search(page);
        await search.findResults();
        await expectNoDuplicatePosts(await search.results.all());
    });

    test('is cleared when clear icon is clicked', async ({ page }) => {
        const search = new Search(page);

        await search.findResults();
        await search.clearIcon.click();

        await expect(search.results).toHaveCount(0);
    })

    // test('finds date results', async ({ page }) => {
});