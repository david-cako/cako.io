const { By, Builder, until } = require("selenium-webdriver");
const assert = require("assert");

const {
    parseArgs,
    setTimeouts,
    setWindowSize
} = require("./shared")

describe("Index", function () {
    const args = parseArgs();

    let baseUrl = "https://cako.io/";
    if (args.named.url) {
        baseUrl = args.named.url;
    }

    let driver;
    let currentUrl;

    before(async function () {
        driver = await new Builder().forBrowser("safari").build();
        await setTimeouts(driver);
        await setWindowSize(driver, "large");
        await driver.get(baseUrl);

        currentUrl = new URL(await driver.getCurrentUrl());
    });

    it("may redirect to private site login", async function () {
        if (currentUrl.pathname == "/private/") {
            console.log("Accessing private site.");
        }
    });

    if (!args.named.password || typeof args.named.password !== "string") {
        throw new Error("Missing --password=<password> argument!")
    }

    const password = args.named.password;

    it("sign-in element should be displayed", async function () {
        if (currentUrl.pathname == "/private/") {
            const signIn = await driver.findElement(By.className("gh-signin"));
            assert(await signIn.isDisplayed());
        }
    });

    it("sign-in element should be 400px wide", async function () {
        if (currentUrl.pathname == "/private/") {
            const signIn = await driver.findElement(By.className("gh-signin"));
            assert((await signIn.getRect()).width == 400);
        }
    });

    it('header should show "cako.io is private"', async function () {
        if (currentUrl.pathname == "/private/") {
            const header = await driver.findElement(By.css('.gh-signin h1'));
            assert(await header.isDisplayed());
            assert(await header.getText() == "cako.io is private");
        }
    });

    it("logo icon should be displayed", async function () {
        if (currentUrl.pathname == "/private/") {
            const logo = await driver.findElement(By.id("logo"));
            assert(await logo.isDisplayed());
        }
    });

    it('password should be displayed', async function () {
        if (currentUrl.pathname == "/private/") {
            const input = await driver.findElement(By.className("gh-input"));
            assert(await input.isDisplayed());
        }
    });

    it('password should have placeholder', async function () {
        if (currentUrl.pathname == "/private/") {
            const input = await driver.findElement(By.className("gh-input"));
            assert(await input.getAttribute("placeholder") == "Password");
        }
    });

    it("submit button should be white", async function () {
        if (currentUrl.pathname == "/private/") {
            const submitBtn = await driver.findElement(
                By.id("submit")
            );
            assert(await submitBtn.isDisplayed());
        }
    })

    it("submit button should be white", async function () {
        if (currentUrl.pathname == "/private/") {
            const submitBtn = await driver.findElement(
                By.id("submit")
            );

            const actions = driver.actions({ async: true });
            await actions.move({ x: 0, y: 0 }).perform();

            const color = await submitBtn.getCssValue("color");
            assert.strictEqual(color, "rgb(255, 255, 255)");

            const borderColor = await submitBtn.getCssValue("border-color");
            assert.strictEqual(color, "rgb(255, 255, 255)");
        }
    });

    it("submit button should be aqua when hovered", async function () {
        if (currentUrl.pathname == "/private/") {
            const submitBtn = await driver.findElement(
                By.id("submit")
            );

            const actions = driver.actions({ async: true });
            await actions.move({ origin: submitBtn }).perform();

            const color = await submitBtn.getCssValue("color");
            assert.strictEqual(color, "rgb(39, 215, 255)");

            const borderColor = await submitBtn.getCssValue("border-color");
            assert.strictEqual(color, "rgb(39, 215, 255)");
        }
    });

    it("should login with correct password", async function () {
        if (currentUrl.pathname == "/private/") {
            const input = await driver.findElement(By.className("gh-input"));

            await input.click();
            await input.sendKeys(password);

            const submitBtn = await driver.findElement(
                By.id("submit")
            );

            await submitBtn.click();

            await driver.wait(until.urlIs(baseUrl));

            currentUrl = new URL(await driver.getCurrentUrl());
            assert.strictEqual(currentUrl.pathname, "/");
        }
    });

    it("header should be displayed", async function () {
        const header = await driver.wait(
            until.elementLocated(By.id("cako-header-text")),
            5000
        );
        assert(await header.isDisplayed());

        const opacity = await header.getCssValue("opacity");
        assert.strictEqual(opacity, "1");
    });

    after(async () => await driver.quit());
})