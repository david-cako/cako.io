import { expect, type Locator, type Page } from '@playwright/test';
import Header from './Header.ts';

export default class Post {
    readonly page: Page;
    readonly header: Header;
    readonly inner: Locator;
    readonly heading: Locator;
    readonly date: Locator;
    readonly paragraph: Locator;
    readonly img: Locator;
    readonly nav: Locator;

    constructor(page: Page) {
        this.page = page;
        this.header = new Header(page);
        this.inner = page.locator("#post-inner");
        this.heading = page.locator("h1.post-full-title");
        this.date = page.locator("#post-inner time");
        this.paragraph = page.locator("p");
        this.img = page.locator("img");
        this.nav = page.locator("#post-nav");
    }

    async navigateToPost() {
        await this.page.getByRole("link", { name: 'Super 1 June' }).click();

        await this.expectPostIsDisplayed();
    }

    async expectPostIsDisplayed() {
        await this.header.expectIsVisible();
        await expect(this.heading).toHaveText("Super");
        await expect(this.heading).toBeVisible();
        await expect(this.heading).toBeInViewport();

        await expect(this.date).toHaveText("1 June 2024")
        await expect(this.date).toBeVisible();
        await expect(this.date).toBeInViewport();

        await expect(this.paragraph.first()).toHaveText(/If I could tell every boy and .*/);
        await expect(this.paragraph.first()).toBeVisible();
        await expect(this.paragraph.first()).toBeInViewport();

        await expect(this.img).toBeVisible();
        const imgBoundingBox = await this.img.boundingBox();
        const innerBoundingBox = await this.inner.boundingBox();
        expect(imgBoundingBox!.width).toBe(innerBoundingBox!.width - 30);

        await expect(this.nav).toBeVisible();
    }
}