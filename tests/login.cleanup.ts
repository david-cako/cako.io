import { test as teardown } from '@playwright/test';
import fs from "fs";
import path from 'path';

teardown.describe('Login Cleanup', () => {
    teardown('delete login.json', async ({ }) => {
        const loginFile = path.resolve(teardown.info().project.outputDir, 'login.json');
        console.log(`deleting login.json at ${loginFile}...`);
        fs.unlinkSync(loginFile);
    });
})
