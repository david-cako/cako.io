// @ts-check
import { test, expect } from '@playwright/test';
import baseURL from './url';

test.describe('index', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    test('header begins at full opacity', async ({ page }) => {
        const header = page.locator('#cako-header-text');

        const headerOpacityProgress = await header
            .evaluate(async (header) => {
                const animation = header.getAnimations().find(a =>
                    (a as CSSAnimation).animationName == "opacity");
                return animation?.overallProgress;
            });

        expect(headerOpacityProgress).toBe(0);
    });

    test('header is visible', async ({ page }) => {
        const header = page.locator('#cako-header-text');

        await expect(header).toBeVisible();
        await expect(header).toBeInViewport();
    });

    test('index is shown', async ({ page }) => {
        const indexInner = page.locator("#index-inner");

        await expect(indexInner).toBeVisible();
        await expect(indexInner).toBeInViewport();
    });

    test('post is not shown', async ({ page }) => {
        const postInner = page.locator("#post-inner");

        await expect(postInner).not.toBeVisible();
    });

    test('search is not shown', async ({ page }) => {
        const searchInner = page.locator("#search-inner");

        await expect(searchInner).not.toBeVisible();
    });

    test('index layout is responsive', async ({ page }) => {
        const indexInner = page.locator("#index-inner");
        const viewport = page.viewportSize();

        if (viewport!.width >= 900) {
            await expect(indexInner).toHaveCSS("max-width", `${viewport!.width * .9}px`);
        } else {
            await expect(indexInner).toHaveCSS("width", `100%`);
        }
    });

    test('index shows all posts', async ({ page }) => {
        const responsePromise = page.waitForResponse(r => r.url().includes('/ghost/api/v3/content/posts'));
        const response = await responsePromise;
        const obj = await response.json();

        const totalPosts: number = obj.meta.pagination.total;
        console.log("Total posts: ", totalPosts);

        const postElements = page.locator("#cako-post-feed .cako-post");
        await expect(postElements).toHaveCount(totalPosts, { timeout: 30000 });
    });

    test('index does not show duplicate posts', async ({ page }) => {
        const responsePromise = page.waitForResponse(r => r.url().includes('/ghost/api/v3/content/posts'));
        const response = await responsePromise;
        const obj = await response.json();

        const totalPosts: number = obj.meta.pagination.total;

        const postElements = await page.locator("#cako-post-feed .cako-post");
        await expect(postElements).toHaveCount(totalPosts, { timeout: 30000 });

        const allPostElements = await postElements.all();

        let postIds = []
        for (const p of allPostElements) {
            postIds.push(await p.getAttribute("data-post-id"));
        }
        for (const p of postIds) {
            const matchingPosts = postIds.filter(id => id == p);
            if (matchingPosts.length > 1) {
                console.log(postIds);
                console.log("Duplicate posts found: ", matchingPosts);
            }
            expect(matchingPosts.length).toBe(1);
        }
    });

    test('post link navigates to post', async ({ page }) => {

    });

    // test('search finds date results', async ({ page }) => {

    test('copyright is shown', async ({ page }) => {
        const copyright = page.getByText('cako.io ©');
        await expect(copyright).toBeVisible();
    });

    //test('navigation is not shown')
})