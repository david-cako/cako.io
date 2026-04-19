import { expect, type Locator, type Page } from '@playwright/test';
import Post from './Post.ts';

export default class Features extends Post {
    readonly title = this.page.getByRole('heading', { name: 'Features' });
    readonly subtitle = this.page.getByText('Selected reading from cako.io.')
    readonly features = this.page.locator(".cako-featured");

    constructor(page: Page) {
        const featuresObj = { title: "Features", slug: "/features/" };
        super(page, featuresObj);
    }
}