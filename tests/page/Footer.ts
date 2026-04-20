import { expect, type Locator, type Page } from '@playwright/test';
import Header from './Header.ts';
import type { PostObj } from './Post.ts';

export default class Footer {
    readonly page: Page;
    readonly footer: Locator;
    readonly copyright: Locator;
    readonly copyrightDate: Locator;
    readonly emailAddress: Locator;
    readonly postNav: Locator;
    readonly postNavLeft: Locator;
    readonly postNavRight: Locator;

    constructor(page: Page) {
        this.page = page;
        this.footer = page.locator(".site-footer-content");
        this.copyright = page.locator(".copyright");
        this.copyrightDate = page.locator(".copyright-date");
        this.emailAddress = page.locator("#email-address");
        this.postNav = page.locator("#post-nav");
        this.postNavLeft = page.locator("#post-nav .post-nav-link.left");
        this.postNavRight = page.locator("#post-nav .post-nav-link.right");
    }

    async expectCopyrightIsVisible(post?: { date: string }) {
        await expect(this.copyright).toBeVisible();
        await expect(this.copyright).toContainText("cako.io ©")

        if (post) {
            const d = new Date(post.date);
            await expect(this.copyrightDate).toContainText(String(d.getFullYear()));
        }
    }

    async expectPageNavIsVisible(
        prev?: PostObj,
        next?: PostObj) {
        await expect(this.postNav).toBeVisible();

        if (prev) {
            await expect(this.postNavLeft).toBeVisible();
            await expect(this.postNavLeft).toContainText(prev.title);
            await expect(this.postNavLeft).toContainText(prev.date!);
        }

        if (next) {
            await expect(this.postNavRight).toBeVisible();
            await expect(this.postNavRight).toContainText(next.title);
            await expect(this.postNavRight).toContainText(next.date!);
        }
    }

    async expectEmailAddressIsVisible() {
        await expect(this.emailAddress).toBeVisible();
        await expect(this.emailAddress).toContainText('dc@cako.io');
    }

    async expectFooterLayoutIsResponsive() {
        const viewport = this.page.viewportSize();
        if (viewport!.width <= 500) {
            const box = await this.footer.boundingBox();
            expect(box!.y + box!.height).toBeCloseTo(viewport!.height)

            const pageNavBox = await this.postNav.boundingBox();
            expect(viewport!.height - pageNavBox!.y).toBeLessThan(125);
        }
    }
}