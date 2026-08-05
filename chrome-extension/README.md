# H2Ohhh Companion — Chrome Extension

A Chrome extension for **H2Ohhh** that shows the existing transparent
animated girl/boy on **every website** when it is time to drink water.

- No white background, no rectangular popup — only the transparent character
  sliding in at the bottom-right, floating for **8 seconds**, then sliding out.
- Reuses the app's own `girl-reminder.mp4` / `boy-reminder.mp4` and voice logic.
- Timers live in the **service worker** (`chrome.alarms`), so they keep running
  when you switch tabs or close the popup.
- Settings sync automatically from the H2Ohhh website while you are logged in.

## Folder contents

| File | Purpose |
| --- | --- |
| `manifest.json` | Manifest V3 config |
| `background.js` | Service worker: alarms, storage, message passing |
| `content.js` | Overlay shown on every site (WebGL chroma-key = transparency) |
| `bridge.js` | Runs on the H2Ohhh site, syncs its `localStorage` settings |
| `popup.html` / `popup.js` | Extension popup (ON/OFF, interval, avatar, voice) |
| `options.html` / `options.js` | Full options page (interval, sound, voice sliders) |
| `styles.css` | Shared popup/options styling |
| `icons/` | 16/48/128 water-drop icons |
| `assets/` | Copies of the app's `girl-reminder.mp4` and `boy-reminder.mp4` |

> **Why is there no transparent MP4?** The videos are H.264, which has no alpha
> channel in Chrome (the baked-in background is a light gray). The content
> script removes that gray with a tiny WebGL chroma-key shader, so the video
> still renders as a transparent character.

## How to load the extension (Developer Mode)

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the **`chrome-extension`** folder of this project.
5. Pin **H2Ohhh Companion** to the toolbar.

## How to test

1. **Log in on the website** so the extension knows your settings:
   - Open the H2Ohhh website (e.g. `https://h2ohhh.vercel.app`) and log in,
     or use a local dev server (`npm run dev`, then the bridge also matches
     `http://localhost:5173`).
   - The extension reads the site's `localStorage`
     (`h2ohhh:session` + `h2ohhh:users`) and syncs automatically (every few
     seconds while the tab is open).
2. **Check sync**: open the extension popup — the status dot should be green and
   show "Synced with H2Ohhh website". The interval/avatar/voice you set on the
   website appear here.
3. **Turn the reminder ON** in the popup or options (or it is ON already if it
   was ON in the website settings).
4. **Pick a short interval** (e.g. **2 minutes**) in the popup/options, or on
   the website Settings page.
5. Open **YouTube, Gmail, ChatGPT, LinkedIn or any normal website** (not
   `chrome://` pages, which block extensions).
6. Wait for the countdown. When it fires you should see the transparent
   character slide in at the bottom-right, float, optionally speak, and slide
   out after **8 seconds**. The timer then restarts.
7. Switch tabs while waiting — the reminder still appears because the timer is
   in the service worker.

## Testing reminders instantly

There is no built-in "test now" button, so the fastest way is a 2-minute
interval. To go even faster you can trigger it manually once the extension is
loaded:

```js
chrome.runtime.sendMessage({
  type: 'SAVE_SETTINGS',
  settings: { enabled: true, intervalMinutes: 2, customIntervalMinutes: 0 }
})
```

Run it from the DevTools console of any tab (`window.chrome` is available when
the tab is on a page that allows the extension). The alarm fires after
2 minutes — or use the options page custom interval to set it as low as 1 minute.

## Notes

- **Timers restart on browser open**: the service worker re-creates the alarm
  on startup from stored settings.
- **Sync needs the website open**: settings are stored in the website's
  `localStorage`; the extension reads them while a website tab is open. Once
  synced, they are kept in `chrome.storage.local`, so they persist.
- **Add your Vercel domain**: if you deploy to a domain other than
  `*.vercel.app`, add it to the `content_scripts[0].matches` list in
  `manifest.json` (the bridge content script), then reload the extension.
- `chrome://`, the Chrome Web Store and other restricted pages cannot show the
  overlay by design.
