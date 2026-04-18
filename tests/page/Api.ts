import { Page } from "@playwright/test";

export default class Api {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async waitForAnyResponse() {
        const responsePromise = this.page.waitForResponse(r => r.url().includes('/ghost/api/v3/content/posts'));
        const response = await responsePromise;
        const obj = await response.json();

        return obj;
    }

    async getAllPosts() {
        return await this.page.evaluate(async () => {
            return await (window as any).Api.getAllPosts()
        });
    }
}