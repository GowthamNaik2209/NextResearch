// Guided tour (camera auto-cycle + Web Speech narration/subtitles) is built but
// muted everywhere at the user's request — the narration scripts need more work
// before this ships. The toolbar controls, the overview page's entry link, and
// the ?tour=1 auto-start in SectorExplorer.tsx all gate on this single flag, so
// turning it back on is a one-line change once the scripts are ready.
export const GUIDED_TOUR_ENABLED = false;
