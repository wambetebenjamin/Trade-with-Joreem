# Google Search Console verification

**Status: pending the property's genuine Google verification token and a Google account with access to the property.** No verification has been claimed and no placeholder token is present in the site.

The SEO implementation is otherwise ready: all public pages allow indexing, `sitemap.xml` uses the production HTTPS origin, and `robots.txt` advertises that sitemap.

## Verify the production property

1. Open [Google Search Console](https://search.google.com/search-console) and add a **URL prefix** property for:
   `https://trade-with-joreem.vercel.app/`
2. Choose the **HTML tag** verification method. Copy only the token from Google's `content` value; do not use an example or invented token.
3. From the repository root, run (substituting the real token):

   ```bash
   .venv/bin/python tools/add_search_console_verification.py 'REAL_GOOGLE_TOKEN'
   ```

4. Commit and deploy `index.html` to the **production** Vercel deployment. The public URL must return the exact `<meta name="google-site-verification" ...>` tag in its initial HTML.
5. Return to Search Console and click **Verify**. Keep the tag in the homepage after verification.
6. In Search Console, open **Sitemaps** and submit:
   `https://trade-with-joreem.vercel.app/sitemap.xml`
7. Use **URL Inspection** on the homepage and a clean URL such as `/mentorship`, then request indexing after the deployment is live.

## Notes

- Verification cannot be completed from this repository alone; it requires Google's real token and the property owner's Google access.
- Vercel already provides HTTPS. `vercel.json` adds HSTS, clean URLs, and permanent `.html` → clean-slug redirects.
- If the production domain changes, update `ORIGIN` in `tools/optimize_site.py`, rerun the optimizer, and use the matching Search Console property instead.
