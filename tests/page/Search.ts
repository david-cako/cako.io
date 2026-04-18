import { expect, Locator, Page } from '@playwright/test';

export default class Search {
    readonly page: Page;
    readonly search: Locator;
    readonly inner: Locator;
    readonly menuIcon: Locator;
    readonly clearIcon: Locator;
    readonly results: Locator

    constructor(page: Page) {
        this.page = page;
        this.search = page.locator("#cako-search");
        this.inner = page.locator("#search-inner");
        this.menuIcon = page.locator('#menu-icon');
        this.clearIcon = page.locator('#cako-search-clear');
        this.results = this.page.locator("#cako-search-results .cako-post");
    }

    async findResults() {
        await this.menuIcon.click();
        await this.page.waitForTimeout(1000);
        await this.search.fill('test');
        try {
            await expect(this.inner.getByRole('link', { name: 'Lovely Rita (fuck.tha.' }))
                .toBeVisible({ timeout: 30000 });
            await expect(this.inner.getByRole('link', { name: 'Winter\'s Toll 16 October' }))
                .toBeVisible({ timeout: 30000 });
        } catch (e) {
            await this.page.screenshot({ path: "test-results/search.jpg" });
            throw e;
        }
    }

    async findTitleResults() {
        await this.menuIcon.click();
        await this.page.waitForTimeout(1000);
        await this.search.fill('diamond praeturnal');
        await expect(this.inner.getByRole('link', { name: 'Diamond Praeturnal Reorder' }))
            .toBeVisible({ timeout: 30000 });
    }
}