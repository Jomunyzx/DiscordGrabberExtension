## 📦 Overview

**AdShield** is a Chrome browser extension that masquerades as an ad blocker, but instead detects when a user visits [Discord](https://discord.com), extracts their authentication token and sensitive user/payment data, and sends it to a predefined Discord webhook.

> ⚠️ The name and description in `manifest.json` are intentionally misleading.

---

## 🧠 Features

- 🕵️ Detects when a user opens a `discord.com` tab.
- 🔐 Extracts the Discord authentication token from `localStorage`.
- 🧾 Fetches:
  - User account information (username, ID, email, avatar, verification status)
  - Saved payment methods (credit card or PayPal)
- 📤 Sends the data to a remote Discord webhook.
- ⏱️ Cooldown logic to avoid repeated sends within a short time frame.

---

## 📂 Project Structure

```
📦 extension-root/
├── background.js      # Listens for tab updates and triggers token scraping
├── popup.js           # Main logic with webhook integration and cooldown
├── manifest.json      # Extension configuration
└── icon.png           # Extension icon
```