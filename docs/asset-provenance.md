# Asset provenance

This document records the current first-party visual assets in the repository and the rules for adding new media.

| Asset | Provenance | Notes |
| --- | --- | --- |
| `docs/vibetrace-mark.svg` | Project-authored vector source stored directly in this repository | Simple geometric mark; no third-party logo or font file is embedded. |
| `docs/vibetrace-dashboard.png` | Generated from the project's own browser demo by `e2e/demo.spec.mjs` | The screenshot is CI/browser evidence of VibeTrace's own interface, not a screenshot copied from another product. |
| Inline SVG in `web/index.html` | Project-authored interface glyphs | No external icon package is bundled for these glyphs. |
| Web typography | System font fallback stack in `web/styles.css` | No `.ttf`, `.otf`, `.woff`, or `.woff2` font file is currently redistributed by the repository. |

This provenance record is an engineering record, not a trademark clearance opinion. A first-party asset can still require a separate name/logo clearance review before commercial branding.

## Adding assets

Before adding an image, screenshot, logo, icon set, font, video, dataset, template, or other media:

1. record whether it is original, generated from project-owned material, licensed, or used with permission;
2. if third-party, record the source and applicable license/permission;
3. preserve any required attribution or notice;
4. do not use third-party product logos merely to make compatibility claims more visually prominent; and
5. do not commit screenshots containing confidential repositories, personal data, credentials, or material the contributor is not authorized to publish.

The CI rights check rejects newly bundled font binaries until their redistribution terms are deliberately reviewed and the check is updated.
