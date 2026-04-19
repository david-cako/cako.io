import { test, expect } from "@playwright/test";
import Post from "./page/Post.ts";
import baseURL, { httpURL } from "./Url.ts";
import Header from "./page/Header.ts";
import Index from "./page/Index.ts";
import Search from "./page/Search.ts";
import Footer from "./page/Footer.ts";
import Features from "./page/Features.ts";

test.describe('Features', () => {
    const featuresObj = {
        title: "Features",
        slug: "/features/"
    }

    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL + featuresObj.slug);
    });

    test('http redirects to https', async ({ page }) => {
        await page.goto(httpURL + featuresObj.slug);
        await expect(page).toHaveURL(baseURL + featuresObj.slug);
    });

    test("displays features", async ({ page }) => {
        const features = new Features(page);
        await features.expectPostIsDisplayed();
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
    });

    test("copyright is displayed", async ({ page }) => {
        const footer = new Footer(page);
        await footer.expectCopyrightIsVisible();
    });

    test("email is displayed", async ({ page }) => {
        const footer = new Footer(page);
        await footer.expectEmailAddressIsVisible();
    });

    test("post navigation is not displayed", async ({ page }) => {
        const footer = new Footer(page);
        await expect(footer.postNav).not.toBeVisible();
    });
});