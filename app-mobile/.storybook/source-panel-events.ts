// Shared between the preview and the manager, which are separate bundles in
// separate frames. A typo in one half would fail silently as a panel that never
// updates, so the names live in one place.
export const ADDON_ID = 'pi/source-panel';
export const PANEL_ID = `${ADDON_ID}/panel`;
export const SOURCE_EVENT = `${ADDON_ID}/source`;
export const SOURCE_REQUEST_EVENT = `${ADDON_ID}/request`;
