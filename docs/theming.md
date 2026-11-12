# Theming

## Light or dark

The widgets pick the first rule that matches:

| Order | Rule |
|---|---|
| 1 | `data-theme="dark"` or `"light"` on the root element |
| 2 | An `a2ui-dark` or `a2ui-light` class on the root element, the body or an ancestor of the widget |
| 3 | The system setting (`prefers-color-scheme`) |

Without `matchMedia`, the Unisphere widgets use dark and the Chart uses light.

## Colours

| Token | Used by | Default (light / dark) |
|---|---|---|
| `--a2ui-color-surface` | Chart background | `#ffffff` / `#1c2128` |
| `--a2ui-color-on-surface` | Chart text | `#0f1a2a` / `#f0f4f8` |
| `--a2ui-color-border` | Chart borders | `rgba(15, 26, 42, 0.1)` / `rgba(139, 163, 189, 0.14)` |

Series colours stay fixed. The other widgets read the page tokens in [host-integration](host-integration.md#theming).

## Basic components

The A2UI basic components (Button, Tabs, TextField and others) read their own tokens. The default primary colour `#17e` is 4.28:1 with white text, below WCAG AA (4.5:1). Set your own on the page or on an ancestor of the surface:

```css
:root {
  --a2ui-color-primary: #0b5fd6;
  --a2ui-color-on-primary: #ffffff;
  --a2ui-tabs-header-color: #4a5a70;
}
```

The [live demo](../examples/demo) sets these and passes axe in both themes.
