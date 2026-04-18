// @ts-check
import { test, expect } from '@playwright/test';
import baseURL from './url';
import Index from './page/Index';
import Search from './page/Search';
import Api from './page/Api';
import { expectNoDuplicatePosts } from './page/utls';
import Post from './page/Post';

test.describe('Index', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('index is shown', async ({ page }) => {
        const index = new Index(page);

        await expect(index.inner).toBeVisible();
        await expect(index.inner).toBeInViewport();
    });

    test('post is not shown', async ({ page }) => {
        const postInner = page.locator("#post-inner");

        await expect(postInner).not.toBeVisible();
    });

    test('search is not shown', async ({ page }) => {
        const search = new Search(page);

        await expect(search.inner).not.toBeVisible();
    });

    test('index layout is responsive', async ({ page }) => {
        const index = new Index(page);
        const viewport = page.viewportSize();

        const indexInnerBoundingBox = await index.inner.boundingBox();

        if (viewport!.width >= 900) {
            await expect(indexInnerBoundingBox!.width).toBe(viewport!.width * .9);
        } else {
            await expect(index.inner).toHaveCSS("width", `100%`);
        }
    });

    test('index shows all posts', async ({ page }) => {
        const index = new Index(page);

        const api = new Api(page);
        const obj = await api.waitForAnyResponse();

        const totalPosts: number = obj.meta.pagination.total;
        console.log("Total posts: ", totalPosts);

        await expect(index.posts).toHaveCount(totalPosts, { timeout: 30000 });
    });

    test('index does not show duplicate posts', async ({ page }) => {
        const index = new Index(page);

        const api = new Api(page);
        const obj = await api.waitForAnyResponse();

        const totalPosts: number = obj.meta.pagination.total;

        await expect(index.posts).toHaveCount(totalPosts, { timeout: 30000 });

        await expectNoDuplicatePosts(await index.posts.all());
    });

    test('post link navigates to post', async ({ page }) => {
        const post = new Post(page);
        await post.navigateToPost();
    });

    test('copyright is shown', async ({ page }) => {
        const index = new Index(page);
        await expect(index.copyright).toBeVisible();
    });

    test('navigation is not shown', async ({ page }) => {
        const post = new Post(page);
        await expect(post.nav).not.toBeVisible();
    })
})