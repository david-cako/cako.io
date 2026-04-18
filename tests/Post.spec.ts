import { test, expect } from "@playwright/test";
import Post from "./page/Post.ts";
import baseURL from "./Url.ts";
import Header from "./page/Header.ts";
import Index from "./page/Index.ts";
import Search from "./page/Search.ts";

test.describe('Post', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL + "/super/");
    });

    test("displays post", async ({ page }) => {
        const post = new Post(page);
        await post.expectPostIsDisplayed();
    });

    test("navigates to index", async ({ page }) => {
        const header = new Header(page);
        const index = new Index(page);

        await header.header.click();

        await expect(index.inner).toBeVisible();
        await expect(index.posts.first()).toBeVisible();
    });

    test("shows search results", async ({ page }) => {
        const search = new Search(page);
        await search.findResults();
    })
})