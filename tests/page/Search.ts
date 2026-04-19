import { expect, type Locator, type Page } from '@playwright/test';
import Api from './Api.ts';

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
        const api = new Api(this.page);
        await api.waitForAnyResponse();

        await this.menuIcon.click();
        await this.search.fill('test');
        await expect(this.inner.getByRole('link', { name: 'Lovely Rita (fuck.tha.' }))
            .toBeVisible({ timeout: 30000 });
        await expect(this.inner.getByRole('link', { name: 'Winter\'s Toll 16 October' }))
            .toBeVisible({ timeout: 30000 });
    }

    async findTitleResults() {
        const api = new Api(this.page);
        await api.waitForAnyResponse();

        await this.menuIcon.click();
        await this.search.fill('diamond praeturnal');
        await expect(this.inner.getByRole('link', { name: 'Diamond Praeturnal Reorder' }))
            .toBeVisible({ timeout: 30000 });
    }
}