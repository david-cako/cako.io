import { expect, Locator, Page } from '@playwright/test';

export default class Index {
    readonly page: Page;
    readonly inner: Locator;
    readonly posts: Locator;
    readonly copyright: Locator;

    constructor(page: Page) {
        this.page = page;
        this.inner = page.locator("#index-inner");
        this.posts = page.locator("#cako-post-feed .cako-post");
        this.copyright = page.getByText('cako.io ©');
    }
}