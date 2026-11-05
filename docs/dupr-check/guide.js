(() => {
  if (typeof chrome === 'undefined' || !chrome.runtime?.id || !chrome.storage?.local) return;
  const button = document.getElementById('consent-button');
  const status = document.getElementById('consent-status');
  const en = document.documentElement.lang === 'en';
  chrome.storage.local.get({ dataUseConsentVersion: 0 }).then(state => {
    button.hidden = state.dataUseConsentVersion === 1;
    if (button.hidden) status.textContent = en ? 'Data-use consent is complete. You can sign in to DUPR and test the connection.' : '已完成数据用途确认。可以登录 DUPR 并测试连接。';
  });
  button.onclick = async () => {
    button.disabled = true;
    try {
      await chrome.storage.local.set({ dataUseConsentVersion: 1, onboardingCompleted: true });
      button.hidden = true;
      status.textContent = en ? 'Confirmed. Open the extension, sign in and test the connection, then refresh older tournament tabs.' : '已确认。请打开插件登录并测试连接，刷新旧赛事页后即可使用。';
    } catch { status.textContent = en ? 'Could not save. Retry or confirm in the extension popup.' : '未能保存，请重试或在插件弹窗中完成确认。'; button.disabled = false; }
  };
})();
