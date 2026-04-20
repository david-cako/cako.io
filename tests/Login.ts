import { test as setup, expect } from '@playwright/test';
import path from 'path';

import baseURL from './Url.ts';

setup.describe('Login', () => {
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

            await expect(logo).toBeVisible();

            await expect(heading).toBeVisible();
            await expect(heading).toBeInViewport();
        }
    });

    setup('layout is responsive', async ({ page }) => {
        const dialog = page.locator(".gh-signin");

        const viewport = page.viewportSize();

        const dialogBoundingBox = await dialog.boundingBox();

        if (viewport!.width >= 430) {
            await expect(dialogBoundingBox!.width).toBe(400);
        } else {
            await expect(dialogBoundingBox!.width).toBeCloseTo(viewport!.width - 30);
        }
    })

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

        await expect(submit).toHaveCSS("color", "rgb(255, 255, 255)");
        await expect(submit).toHaveCSS("border-color", "rgb(255, 255, 255)");
    })

    setup('submit button turns aqua on hover', async ({ page }) => {
        const submit = page.getByRole('button', { name: 'Enter Now' });

        await submit.hover();

        await expect(submit).toBeVisible();
        await expect(submit).toBeInViewport();

        await expect(submit).toHaveCSS("color", "rgb(39, 215, 255)");
        await expect(submit).toHaveCSS("border-color", "rgb(39, 215, 255)");
    });

    setup('submit button turns aqua on focus', async ({ page }) => {
        const submit = page.getByRole('button', { name: 'Enter Now' });

        await submit.focus();

        await expect(submit).toBeVisible();
        await expect(submit).toBeInViewport();

        await expect(submit).toHaveCSS("color", "rgb(39, 215, 255)");
        await expect(submit).toHaveCSS("border-color", "rgb(39, 215, 255)");
    });

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

        console.log("Saving login file to: ", loginFile);

        await page.context().storageState({ path: loginFile });
    });
})
