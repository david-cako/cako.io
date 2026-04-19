// @ts-check
import { test, expect } from '@playwright/test';
import baseURL, { httpURL } from './Url.ts';
import Index from './page/Index.ts';
import Search from './page/Search.ts';
import Api from './page/Api.ts';
import { expectNoDuplicatePosts } from './page/Utils.ts';
import Post from './page/Post.ts';
import Footer from './page/Footer.ts';

test.describe('Index', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('http redirects to https', async ({ page }) => {
        await page.goto(httpURL);
        await expect(page).toHaveURL(baseURL);
    });

    test('is shown', async ({ page }) => {
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

    test('layout is responsive', async ({ page }) => {
        const index = new Index(page);
        const viewport = page.viewportSize();

        const indexInnerBoundingBox = await index.inner.boundingBox();

        if (viewport!.width >= 900) {
            await expect(indexInnerBoundingBox!.width).toBeCloseTo(viewport!.width * .9);
        } else {
            await expect(indexInnerBoundingBox!.width).toBeCloseTo(viewport!.width);
        }
    });

    test('shows all posts', async ({ page }) => {
        const index = new Index(page);

        const api = new Api(page);
        const obj = await api.waitForAnyResponse();

        const totalPosts: number = obj.meta.pagination.total;
        console.log("Total posts: ", totalPosts);

        await expect(index.posts).toHaveCount(totalPosts, { timeout: 30000 });
    });

    test('does not show duplicate posts', async ({ page }) => {
        const index = new Index(page);

        const api = new Api(page);
        const obj = await api.waitForAnyResponse();

        const totalPosts: number = obj.meta.pagination.total;

        await expect(index.posts).toHaveCount(totalPosts, { timeout: 30000 });

        await expectNoDuplicatePosts(await index.posts.all());
    });

    test('post link navigates to post', async ({ page }) => {
        const post = new Post(page, { title: "Super", date: "1 June 2024", slug: "/super/" });
        await post.navigateToPost();
    });

    test('copyright is shown', async ({ page }) => {
        const footer = new Footer(page);
        await footer.expectCopyrightIsVisible();
    });

    test('post navigation is not shown', async ({ page }) => {
        const footer = new Footer(page);
        await expect(footer.postNav).not.toBeVisible();
    });
})