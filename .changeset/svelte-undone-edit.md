---
'@dynamic-field-kit/svelte': patch
---

`MultiFieldInput` no longer brings back an edit that was just undone. It kept the user's last change for as long as the `properties` object it was made on was the one handed in, so an undo history that hands back that same object showed the undone change again. The change is now dropped as soon as other properties arrive, and stays dropped.
