# Calculated — Web Calculator

A small, polished calculator for everyday math, built as a fast static website. It works offline after the first load and keeps theme and calculation history in your browser—no account, backend, API, or external JavaScript dependency required.

## Features

- Addition, subtraction, multiplication, division, decimals, unary negatives, and percentages.
- Parentheses and normal multiplication/division precedence.
- Safe math parser; expressions are parsed as arithmetic and are never passed to `eval()` or `Function()`.
- Keyboard input: digits and operators, `Enter`/`=` to calculate, `Backspace` to delete, and `Escape` to clear. Shift+8 and Shift+9/0 work for multiplication and parentheses on common keyboard layouts.
- Sign toggle, clear all, delete, live result preview, copy result, and reusable calculation history.
- Light/dark themes and history persisted in local storage.
- Responsive layout, semantic controls, screen-reader announcements, strong focus styles, and reduced-motion support.

## Technologies

HTML5, CSS3, vanilla JavaScript ES modules, browser localStorage and Clipboard APIs, and Node.js's built-in test runner. There are no runtime dependencies, external requests, or build step; system fonts keep the app self-contained offline.

## Project structure

```text
calculator/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── calculator.js
├── assets/
│   └── favicon.svg
├── tests/
│   └── calculator.test.js
├── .gitignore
├── LICENSE
├── package.json
└── README.md
```

## Run locally

1. Open the project folder in VS Code.
2. For module support and reliable local storage, use a local static server such as the **Live Server** VS Code extension, then choose **Open with Live Server**. Alternatively, with Python installed, run `python -m http.server 8000` in this folder and visit `http://localhost:8000`.
3. Try button and keyboard entry. Check the history, copy result, and theme controls. The app makes no network requests and remains usable offline.

## Test

Install Node.js if it is not already installed, then run from the project root:

```sh
npm test
```

This uses Node's built-in test runner and needs no package installation. The automated suite covers basic arithmetic, precision cleanup, negative values, percentages, precedence and parentheses, parser errors/security, keyboard-to-action mapping, and history/theme persistence. Responsive layout and the actual browser controls require a quick manual check: resize the browser to desktop and phone widths, toggle the theme, calculate, refresh, and confirm the selected theme and history return. Tests are useful, but they do not replace this browser check.

## Screenshots

To add portfolio screenshots, capture the calculator in both light and dark themes (desktop and mobile are useful), save the images under a new `screenshots/` folder, and embed them here with relative links, for example:

```md
![Calculator in light theme](screenshots/calculator-light.png)
```

Do not commit browser chrome or personal data in screenshots.

## Publish with GitHub Pages

1. Create a **public** GitHub repository named `calculator` (do not initialize it with a README if you already have this local README).
2. In a terminal opened at this project root, initialize and commit:

   ```sh
   git init
   git add .
   git commit -m "Build responsive web calculator"
   git branch -M main
   ```

3. Add your GitHub repository as the remote and push (replace `YOUR-USERNAME`):

   ```sh
   git remote add origin https://github.com/YOUR-USERNAME/calculator.git
   git push -u origin main
   ```

4. On GitHub, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select branch **main** and folder **/(root)**, then save.
5. Wait for the Pages deployment to finish. The public site URL is normally `https://YOUR-USERNAME.github.io/calculator/`. GitHub displays the exact URL in **Settings → Pages**.
6. To publish later changes, make and test them locally, then run `git add .`, `git commit -m "Describe your change"`, and `git push`. Pages republishes the new `main` branch contents automatically.

The CSS, script, and favicon use relative paths, so they resolve at the repository subpath as well as on a custom domain. No build command or backend is required.

## Future ideas

- Memory keys and scientific operations with clearly bounded input.
- A downloadable/exportable history option.
- Browser-based end-to-end tests across multiple viewport sizes.
- Localization and an optional selectable precision setting.

## License

Released under the MIT License. See [LICENSE](LICENSE).
