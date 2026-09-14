import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
const b = await chromium.launch({ channel: 'msedge', headless: true, args: [] });
const p = await b.newPage();
await p.goto(pathToFileURL(process.argv[2]).href);
console.log(await p.evaluate(() => window.res));
await b.close();
