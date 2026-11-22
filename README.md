# BJB Holiday Wish List

A static page on GitHub Pages. Purchases are saved in a Google Sheet through a small
Apps Script web app. It costs $0 to run.

```
Browser ──GET (every 30s)──▶ Apps Script web app ──▶ Google Sheet "Purchases" tab
        ──POST mark/undo──▶   (lock + duplicate check)
```

- **No double purchases.** The script holds a lock and refuses to mark an item that's
  already marked, so the second person who clicks sees "Someone already marked this one."
- **Emails stay private.** Browsers only get masked emails (`al•••@example.com`).
  The full email is only in your Sheet.
- **Undo.** Only the browser that marked an item can undo it, using a token it saved when
  it marked the item. You can fix anything else by editing or deleting the row in the Sheet.
- **Only known items.** The script rejects item ids that aren't on the list.

## 1. Create the backend (about 10 minutes)

1. Open the Google Sheet **BJB Wish List storage**.
2. Open **Extensions → Apps Script**. Delete the starter code, paste in
   [`apps-script/Code.gs`](apps-script/Code.gs), and save.
3. Click **Deploy → New deployment**. Click the gear icon, choose **Web app**, and set:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy** and approve the permissions prompt. Google warns that the app isn't
   verified because it's your own script: click **Advanced → Go to … (unsafe)**.
5. Copy the **Web app URL**. It ends in `/exec`.
6. Optional check: open that URL in a browser. You should see
   `{"ok":true,"purchases":{}}`, and a **Purchases** tab appears in the Sheet.

> If you change `Code.gs` later, use **Deploy → Manage deployments → Edit → Version: New version**.
> That keeps the same URL. A *new deployment* gets a new URL.

## 2. Point the page at it

In [`index.html`](index.html), set:

```js
const API_URL = 'https://script.google.com/macros/s/XXXX/exec';
```

## 3. Publish on GitHub Pages

This repo is public, so Pages is free.

1. Go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
2. Merge to `main`. The workflow `.github/workflows/pages.yml` publishes only
   `index.html`. You can also run it by hand from the **Actions** tab.
3. The site appears at `https://charlesbaer.github.io/bjbwishlist/`.

## Adding or changing gifts

Add the item to `ITEMS` in **both** `index.html` and `Code.gs`, using the same `id`.
Then redeploy the script as a new version, as described above.

## Shutting it down in January

- Turn off Pages in **Settings → Pages**, or delete the repo.
- Archive the Apps Script deployment: **Deploy → Manage deployments → Archive**.
- Keep or delete the Sheet.
