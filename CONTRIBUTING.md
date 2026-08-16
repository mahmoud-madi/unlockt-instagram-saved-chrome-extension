# 🤝 Contributing to Unlockt (Instagram Saved Vault)

Thank you for your interest in contributing to **Unlockt**! We welcome contributions from developers, designers, and open-source enthusiasts.

---

## 👨‍💻 Project Information

* **Lead Developer**: **Mahmoud Madi** (Digital Marketing & IT Specialist)
* **Organizations**: **Premier Tech | For Integrated Solutions** & **VOXO | AI & Media Agency**
* **License**: MIT License (Open Source)

---

## 🛠️ Code of Conduct & Principles

1. **Local-First & 100% Privacy**: Unlockt must **never** send personal user data, cookies, saved links, or tokens to any external cloud service, telemetry server, or third party. All operations must remain local on the user's machine.
2. **Safe Rate-Limiting**: Any changes to Instagram API pagination or sync logic must include randomized jitter delays to protect user accounts from automated action blocks.
3. **Clean Code & Watermarks**: Please preserve all module headers and developer attributions in source files.

---

## 🚀 Development Setup

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/mahmoud-madi/unlockt-instagram-saved-chrome-extension.git
   cd unlockt-instagram-saved-chrome-extension
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Start Development Server**:
   ```bash
   npm run dev
   ```
4. **Load Extension**:
   - Open Chrome/Brave/Edge → `chrome://extensions`
   - Toggle **Developer mode** on.
   - Click **Load unpacked** and select the `extension/` folder.

---

## 📝 Pull Request Guidelines

1. Create a descriptive feature branch (`git checkout -b feature/amazing-feature`).
2. Test changes locally across both the extension and the web dashboard.
3. Ensure no personal credentials, session IDs, or private saved data are included in `data/saved.json` or media folders.
4. Open a Pull Request with a clear summary of what was added or fixed.

Thank you for building with us!
