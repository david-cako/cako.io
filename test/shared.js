export const windowSizes = {
    "large": {
        "width": 1200,
        "height": 1000
    },
    "tablet": {
        "width": 820,
        "height": 1180
    },
    "medium": {
        "width": 390,
        "height": 844
    },
    "small": {
        "width": 320,
        "height": 568
    }
};

export const timeouts = { implicit: 5000, script: 5000 };

export function parseArgs() {
    let named = {};
    let positional = [];

    for (const arg of process.argv) {
        if (arg.startsWith("--")) {
            const [_, flag] = arg.split("--");
            const [key, value] = flag.split("=");

            if (value) {
                named[key] = value;
            } else {
                named[key] = true;
            }
        } else {
            positional.push(arg);
        }
    }

    return { named, positional };
}

export async function setWindowSize(driver, size) {
    const s = windowSizes[size];
    console.log("Setting window size: ", windowSizes);
    await driver.manage().window().setRect(s);
}

export async function setTimeouts(driver,) {
    console.log("Setting timeouts: ", timeouts)
    await driver.manage().setTimeouts(timeouts);
}
