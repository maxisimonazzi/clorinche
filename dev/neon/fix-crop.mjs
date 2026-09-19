// recorte ampliado de una captura: node crop.mjs in.png out.png x y w h scale
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [,, inp, out, x, y, w, h, sc = 4] = process.argv;
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport: { width: w * sc, height: h * sc } });
const data = fs.readFileSync(inp).toString('base64');
await p.setContent(`<body style="margin:0;background:#000"><div style="width:${w*sc}px;height:${h*sc}px;overflow:hidden;position:relative"><img id=i src="data:image/png;base64,${data}" style="position:absolute;image-rendering:pixelated;transform-origin:0 0;transform:scale(${sc});left:${-x*sc}px;top:${-y*sc}px"></div></body>`);
await p.waitForTimeout(200);
await p.screenshot({ path: out });
await b.close();
