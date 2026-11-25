import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const entries = await readdir(root, { withFileTypes: true });
const htmlFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.html')).map((entry) => entry.name);
for (const name of htmlFiles) {
  let html = await readFile(path.join(root, name), 'utf8');
  html = html.replace(/onsubmit="event\.preventDefault\(\);\s*this\.reset\(\);\s*alert\('Subscribed! Market notes land in your inbox every Monday\.'\);"/g, 'data-sheet-form="Newsletter"');
  html = html.replace('<form id="contactForm" novalidate="">', '<form id="contactForm" data-sheet-form="ContactRequests" novalidate="">');
  html = html.replace(/<script src="\/js\/site\.8c3481c7aeea\.min\.js"><\/script>/g, '<script src="/js/site.8c3481c7aeea.min.js"></script><script src="/js/sheets-forms.js" defer></script>');
  if (name === 'login.html') {
    html = html.replace(/<form id="loginForm"[\s\S]*?<\/form>/, '<form id="loginForm" data-sheet-form="AccessRequests"><div class="mb-3"><label class="form-label" for="accessName">Name</label><input class="form-control" id="accessName" name="name" required maxlength="100"></div><div class="mb-3"><label class="form-label" for="accessEmail">Google Drive email</label><input class="form-control" id="accessEmail" name="email" type="email" required maxlength="254"></div><div class="mb-3"><label class="form-label" for="accessReason">What access do you need?</label><textarea class="form-control" id="accessReason" name="reason" rows="3" maxlength="1000"></textarea></div><button class="btn btn-primary w-100 py-3" type="submit">Request access</button></form>');
    html = html.replace(/<h2 class="mb-1 h3" style="color:#fff;">Member Login<\/h2>/, '<h2 class="mb-1 h3" style="color:#fff;">Request member access</h2>');
    html = html.replace(/Welcome back to your trading room\./, 'Member access is managed through the Big Deal Google Drive. Request access here.');
  }
  await writeFile(path.join(output, name), html);
}

for (const name of ['assets', 'css', 'img', 'js', 'lib', 'presentations']) {
  await cp(path.join(root, name), path.join(output, name), { recursive: true, force: true });
}
for (const name of ['robots.txt', 'sitemap.xml', 'site.webmanifest', 'favicon.svg']) {
  try { await cp(path.join(root, name), path.join(output, name)); } catch { /* optional public file */ }
}
await cp(path.join(root, 'js', 'sheets-forms.js'), path.join(output, 'js', 'sheets-forms.js'));
const nextPublic = path.join(root, 'public', 'legacy-site');
await rm(nextPublic, { recursive: true, force: true });
await cp(output, nextPublic, { recursive: true });
console.log(`Prepared previous static website (${htmlFiles.length} HTML pages) in dist/`);
