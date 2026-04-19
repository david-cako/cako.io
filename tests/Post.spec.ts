import { test, expect } from "@playwright/test";
import Post from "./page/Post.ts";
import baseURL, { httpURL } from "./Url.ts";
import Header from "./page/Header.ts";
import Index from "./page/Index.ts";
import Search from "./page/Search.ts";
import Footer from "./page/Footer.ts";

test.describe('Post', () => {
    const postObj = {
        title: "Super",
        date: "1 June 2024",
        slug: "/super/",
        content: "If I could tell every boy and girl one thing that I know is true \
with every bone in my body, it is that prayers are real.  Use them on things \
that count and trust that things will make sense when the time is right."
    };

    const prevPostObj = {
        title: "Beach",
        date: "14 May 2024",
        slug: "/beach/"
    };

    test.beforeEach(async ({ page }) => {
        await page.goto(baseURL + postObj.slug);
    });

    test('http redirects to https', async ({ page }) => {
        await page.goto(httpURL + postObj.slug);
        await expect(page).toHaveURL(baseURL + postObj.slug);
    });

    test("displays post", async ({ page }) => {
        const post = new Post(page, postObj);
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
    });

    test("copyright is displayed", async ({ page }) => {
        const footer = new Footer(page);
        await footer.expectCopyrightIsVisible();
    });

    test("email is displayed", async ({ page }) => {
        const footer = new Footer(page);
        await footer.expectEmailAddressIsVisible();
    });

    test("post navigation is displayed", async ({ page }) => {
        const footer = new Footer(page);
        await footer.expectPageNavIsVisible(prevPostObj);
    });

    test("post navigation goes to previous post", async ({ page }) => {
        const footer = new Footer(page);
        await footer.expectPageNavIsVisible(prevPostObj);
        await footer.postNavLeft.click();

        const post = new Post(page, prevPostObj);
        await post.expectPostIsDisplayed();
    });

    test("post navigation goes to next post", async ({ page }) => {
        const p = { title: "Springs", date: "1 May 2024", slug: "/springs/" };
        await page.goto(httpURL + p.slug);

        const footer = new Footer(page);
        await footer.expectPageNavIsVisible({
            title: "0°",
            date: "1 April 2024",
            slug: "/0deg/"
        }, {
            title: "Beach",
            date: "14 May 2024",
            slug: "/beach/"
        });
        await footer.postNavRight.click();

        const post = new Post(page, prevPostObj);
        await post.expectPostIsDisplayed();
    });

    test("footer layout is responsive", async ({ page }) => {
        const p = { title: "Face Value", date: "28 January 2024", slug: "/face-value/" };
        await page.goto(httpURL + p.slug);

        const footer = new Footer(page);
        await footer.expectFooterLayoutIsResponsive();
    });
})