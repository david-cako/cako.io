import { expect, type Locator, type Page } from '@playwright/test';

export interface PostObj {
    title: string;
    date?: string;
    slug: string;
    content?: string;
}

export default class Post {
    readonly page: Page;
    readonly post: PostObj;

    readonly inner: Locator;
    readonly heading: Locator;
    readonly date: Locator;
    readonly paragraph: Locator;
    readonly img: Locator;

    constructor(page: Page, post: PostObj) {
        this.page = page;
        this.post = post;
        this.inner = page.locator("#post-inner");
        this.heading = page.locator("h1.post-full-title");
        this.date = page.locator("#post-inner time");
        this.paragraph = page.locator("p");
        this.img = page.locator("img");
    }

    async navigateToPost() {
        await this.page.getByRole("link",
            { name: this.post.title + " " + this.post.date }).click();

        await this.expectPostIsDisplayed();
    }

    async expectPostIsDisplayed() {
        await expect(this.heading).toHaveText(this.post.title);
        await expect(this.heading).toBeVisible();
        await expect(this.heading).toBeInViewport();

        if (this.post.date) {
            await expect(this.date).toHaveText(this.post.date)
            await expect(this.date).toBeVisible();
            await expect(this.date).toBeInViewport();
        }

        if (this.post.content) {
            await expect(this.inner).toContainText(this.post.content);
            await expect(this.inner).toBeVisible();
            await expect(this.inner).toBeInViewport();
        }

        if (await this.img.count() > 0) {
            await expect(this.img).toBeVisible();
        }
    }
}