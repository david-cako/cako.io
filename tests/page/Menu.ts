import { expect, Locator, Page } from '@playwright/test';
import Search from './Search';

export default class Menu {
    readonly page: Page;
    readonly inner: Locator;
    readonly menuIcon: Locator;
    readonly lights: Locator;
    readonly features: Locator;
    readonly lightsIcon: Locator;
    readonly featuresIcon: Locator;
    readonly search: Search;

    constructor(page: Page) {
        this.page = page;
        this.inner = page.locator("#cako-menu-inner");
        this.menuIcon = page.locator('#menu-icon');
        this.lights = page.locator('#cako-menu-lights')
        this.features = page.getByRole('link', { name: 'Features' });
        this.lightsIcon = page.locator('#cako-menu-lights svg');
        this.featuresIcon = page.locator('#cako-menu-features svg');
        this.search = new Search(page);
    }

    async show() {
        await this.menuIcon.click()
        await this.expectIsShown();
    }

    async expectIsShown() {
        await expect(this.inner).toBeVisible();
        await expect(this.inner).toBeInViewport();
        await expect(this.lightsIcon).toBeVisible();
        await expect(this.featuresIcon).toBeVisible();
        await expect(this.search.search).toBeVisible();
    }

    async expectIsNotShown() {
        await expect(this.inner).not.toBeVisible();
        await expect(this.inner).not.toBeInViewport();
        await expect(this.lightsIcon).not.toBeVisible();
        await expect(this.featuresIcon).not.toBeVisible();
        await expect(this.search.search).not.toBeVisible();
    }
}