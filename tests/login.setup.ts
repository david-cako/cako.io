import { test as setup, expect } from '@playwright/test';
import path from 'path';

import baseURL from './url';

setup.describe('login', () => {
    setup.beforeEach(async ({ page }) => {
        await page.goto(baseURL);
    });

    setup('shows login', async ({ page }) => {
        const url = new URL(page.url());

        if (url.pathname == "/private/") {
            const dialog = page.locator(".gh-signin");
            const logo = page.locator('#logo');
            const heading = page.getByRole('heading', { name: 'cako.io is private' });

            await expect(dialog).toBeVisible();
            await expect(dialog).toBeInViewport();
            await expect(dialog).toHaveCSS("width", "400px");

            await expect(logo).toBeVisible();

            await expect(heading).toBeVisible();
            await expect(heading).toBeInViewport();

        }
    });

    setup('shows password input', async ({ page }) => {
        const password = page.getByRole('textbox', { name: 'Password' });

        await expect(password).toBeVisible();
        await expect(password).toBeInViewport();
        await expect(password).toBeEditable();
    });

    setup('shows submit button', async ({ page }) => {
        const submit = page.getByRole('button', { name: 'Enter Now' });

        await expect(submit).toBeVisible();
        await expect(submit).toBeInViewport();

        await expect(submit).toHaveCSS("color", "#fff");
        await expect(submit).toHaveCSS("border-color", "#fff");
    })

    setup('submit button turns aqua on hover', async ({ page }) => {
        const submit = page.getByRole('button', { name: 'Enter Now' });

        await submit.hover();

        await expect(submit).toBeVisible();
        await expect(submit).toBeInViewport();

        await expect(submit).toHaveCSS("color", "#27d7ff");
        await expect(submit).toHaveCSS("border-color", "#27d7ff");
    })

    setup('logs into site with password', async ({ page }) => {
        const url = new URL(page.url());

        const loginFile = path.resolve(setup.info().project.outputDir, 'login.json');

        if (!process.env.PASSWORD) {
            throw new Error("Missing PASSWORD environment variable.")
        }

        const password = page.getByRole('textbox', { name: 'Password' });
        const submit = page.getByRole('button', { name: 'Enter Now' });

        if (url.pathname == "/private/") {
            await password.click();
            await password.fill(process.env.PASSWORD);

            await submit.click();
        }

        await page.context().storageState({ path: loginFile });
    });
})
