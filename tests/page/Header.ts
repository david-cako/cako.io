import { expect, type Locator, type Page } from '@playwright/test';

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
            return animation!.overallProgress;
        });
    }

    async expectIsVisible() {
        await expect(this.header).toBeVisible();
        await expect(this.header).toBeInViewport();

        await expect(async () => {
            const progress = await this.headerOpacityProgress();
            await expect(progress).toBe(0);
        }).toPass()
    }

    async expectIsFadingOut() {
        await expect(async () => {
            const progress = await this.headerOpacityProgress();
            await expect(progress).toBeGreaterThan(0);
            await expect(progress).toBeLessThan(1);
        }).toPass()
    }

    async expectIsInvisible() {
        await expect(async () => {
            const progress = await this.headerOpacityProgress();
            await expect(progress).toBe(1);
        }).toPass()
    }
}