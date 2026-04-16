// @ts-check
import { test, expect } from '@playwright/test';
import baseURL from './url';

test.describe('index', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
  });

  test('index', async ({ page }) => {
    await expect(page.locator('#menu-icon')).toBeVisible();
    await expect(page.locator('#menu-icon')).toBeInViewport();
    await expect(page.getByText('Lights Features')).not.toBeVisible();
  });

  test('header is visible', async ({ page }) => {
    await expect(page.locator('#cako-header-text')).toBeVisible();
    await expect(page.locator('#cako-header-text')).toBeInViewport();
  });

  test('header begins at full opacity', async ({ page }) => {
    const headerOpacityProgress = page.locator('#cako-header-text')
      .evaluate(async (header) => {
        const animation = header.getAnimations().find(a =>
          (a as CSSAnimation).animationName == "opacity");
        return animation?.overallProgress;
      });

    expect(headerOpacityProgress).toBe(0);
  });

  test('menu is shown when icon is clicked', async ({ page }) => {
    await page.locator('#menu-icon').click();
    await expect(page.locator('#cako-menu-lights svg')).toBeVisible();
  });

  test('search finds text results', async ({ page }) => {
    await page.locator('#menu-icon').click();
    await page.getByRole('textbox', { name: 'Search' }).fill('test');
    await expect(page.getByRole('link', { name: 'Lovely Rita (fuck.tha.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Winter\'s Toll 16 October' })).toBeVisible();
  });

  test('search finds title results', async ({ page }) => {
    await page.locator('#menu-icon').click();
    await page.getByRole('textbox', { name: 'Search' }).fill('diamond praeturnal');
    await expect(page.getByRole('link', { name: 'Diamond Praeturnal Reorder' })).toBeVisible();
  });

  test('copyright is shown', async ({ page }) => {
    await expect(page.getByText('cako.io ©')).toBeVisible();
  });

  //test('navigation is not shown')
})