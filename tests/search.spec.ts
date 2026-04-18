// @ts-check
import { test, expect } from '@playwright/test';
import baseURL from './url';
import Search from './page/Search';
import { expectNoDuplicatePosts } from './page/utls';

test.describe('Search', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('search finds text results', async ({ page }) => {
        const search = new Search(page);
        await search.findResults();
    });

    test('search finds title results', async ({ page }) => {
        const search = new Search(page);
        await search.findTitleResults();
    });

    test('search does not find duplicate text results', async ({ page }) => {
        const search = new Search(page);
        await search.findResults();
        await expectNoDuplicatePosts(await search.results.all());
    });

    test('search is cleared when clear icon is clicked', async ({ page }) => {
        const search = new Search(page);

        await search.findResults();
        await search.clearIcon.click();

        await expect(search.results).toHaveCount(0);
    })

    // test('search finds date results', async ({ page }) => {
});