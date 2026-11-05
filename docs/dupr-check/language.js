// Hosted pages use ordinary links; installed-extension pages also share the UI preference.
(() => {
  if (typeof chrome === 'undefined' || !chrome.runtime?.id || !chrome.storage?.local) return;
  const current = document.documentElement.lang === 'en' ? 'en' : 'zh';
  let navigating = false;
  const switchPage = language => {
    if (language === current || navigating) return;
    navigating = true;
    const url = new URL(location.href);
    url.pathname = url.pathname.replace(/\/(guide|privacy|support)(?:\.en)?\.html$/, (_, page) => `/${page}${language === 'en' ? '.en' : ''}.html`);
    location.replace(url.href);
  };
  chrome.storage.local.get({ uiLanguage: current }).then(state => switchPage(state.uiLanguage));
  document.querySelectorAll('.language-switch a').forEach(link => {
    link.addEventListener('click', async event => {
      event.preventDefault();
      navigating = true;
      const language = link.lang === 'en' ? 'en' : 'zh';
      try { await chrome.storage.local.set({ uiLanguage: language }); } finally { location.href = link.href; }
    });
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.uiLanguage) switchPage(changes.uiLanguage.newValue);
  });
})();
