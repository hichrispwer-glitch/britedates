Local static landing page for Britedates

To preview locally:

1) From the project root run a simple static server. If you have `serve` installed globally use:

```
serve landing
```

or use `npx` to run without installing:

```
npx serve landing
```

This will serve the page at http://localhost:5000 (or the port printed by `serve`).

Alternatively you can open `landing/index.html` directly in your browser, but some form features may require running via HTTP.

Want this integrated into the Expo web build instead? I can convert it into a React component and wire it into the Expo web flow.