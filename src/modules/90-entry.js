(function () {
  'use strict';

  const R = window.GelekRuntime;
  if (!R) return;

  window.GelekModules = window.GelekModules || {};

  window.GelekModules['gelek-main-entry'] = async function gelekMainEntry() {
    if (window.__TS_RUNNING__) return;
    window.__TS_RUNNING__ = true;

    const session = R.AUTH.session();
    if (session) {
      try {
        await R.startGame(session.username, session.uid);
      } catch (error) {
        console.warn('[Gelek] Session restore failed:', error.message);
        R.AUTH.clearSession();
        R.showAuthModal(R.startGame);
      }
      return;
    }

    R.showAuthModal(R.startGame);
  };
})();
