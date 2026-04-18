import { expect, Locator, Page } from '@playwright/test';

export default class Header {
    readonly page: Page;
    readonly header: Locator;

    constructor(page: Page) {
        this.page = page;
        this.header = page.locator('#cako-header-text');
    }

    async headerOpacityProgress() {
        return this.header.evaluate(async (header) => {
            const animation = header.getAnimations().find(a =>
                (a as CSSAnimation).animationName == "opacity");
            return animation?.overallProgress;
        });
    }

    async expectIsVisible() {
        await expect(this.header).toBeVisible();
        await expect(this.header).toBeInViewport();
    }
}