/* TIMKIEM menu icons — Aave 40×40 rounded-square geometry, mint/dark fills (not Aave brand marks). */
(function (root) {
  'use strict';
  var SQ =
    'M30 0H10C4.48 0 0 4.48 0 10V30C0 35.52 4.48 40 10 40H30C35.52 40 40 35.52 40 30V10C40 4.48 35.52 0 30 0Z';
  function icon(bg, glyph) {
    return (
      '<svg class="qcx-menu-card-icon" width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">' +
      '<path d="' + SQ + '" fill="' + bg + '"/>' +
      glyph +
      '</svg>'
    );
  }
  var ICONS = {
    home: icon(
      '#1a2e24',
      '<path d="M20 9.2L10.5 17.2V30h6.2V22.5h6.6V30H29.5V17.2L20 9.2Z" fill="#28d28c"/>'
    ),
    posts: icon(
      '#1a2e24',
      '<rect x="11" y="10" width="18" height="4" rx="1.5" fill="#28d28c"/>' +
        '<rect x="11" y="18" width="18" height="4" rx="1.5" fill="#7dffc4"/>' +
        '<rect x="11" y="26" width="12" height="4" rx="1.5" fill="#28d28c" opacity=".7"/>'
    ),
    skill: icon(
      '#14261e',
      '<path d="M22.5 8L14 21.5h6.2L17.5 32 26 18.5h-6.2L22.5 8Z" fill="#28d28c"/>'
    ),
    code: icon(
      '#1a2e24',
      '<path d="M15.5 13.5L10 20l5.5 6.5" stroke="#28d28c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
        '<path d="M24.5 13.5L30 20l-5.5 6.5" stroke="#7dffc4" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
    ),
    tools: icon(
      '#1a2e24',
      '<rect x="11" y="12" width="18" height="14" rx="2.5" stroke="#28d28c" stroke-width="2" fill="none"/>' +
        '<path d="M11 17h18" stroke="#28d28c" stroke-width="2"/>' +
        '<circle cx="14.5" cy="14.5" r="1.1" fill="#28d28c"/>'
    ),
    search: icon(
      '#14261e',
      '<circle cx="18" cy="18" r="6.5" stroke="#28d28c" stroke-width="2.2" fill="none"/>' +
        '<path d="M23.2 23.2L29 29" stroke="#28d28c" stroke-width="2.2" stroke-linecap="round"/>'
    ),
    telegram: icon(
      '#1a2e24',
      '<path d="M12.2 19.4L27.8 12.6c.7-.3 1.4.3 1.2 1.1l-2.7 12.6c-.2.8-1 .9-1.5.5l-3.8-2.9-2.4 2.3c-.3.3-.8.1-.9-.3l-.5-4.2 9.2-8.3-11.4 6.9-3.9-1.2c-.8-.2-.8-1.3.1-1.6Z" fill="#28d28c"/>'
    ),
    label: icon(
      '#1a2e24',
      '<path d="M12 14.5c0-1.4 1.1-2.5 2.5-2.5H22l8 8-7.5 7.5-8-8V14.5Z" stroke="#28d28c" stroke-width="2" fill="none" stroke-linejoin="round"/>' +
        '<circle cx="16.2" cy="16.2" r="1.4" fill="#28d28c"/>'
    ),
    admin: icon(
      '#14261e',
      '<path d="M20 10l2.2 4.5 5 .7-3.6 3.5.9 5L20 21.5 15.5 23.7l.9-5-3.6-3.5 5-.7L20 10Z" fill="#28d28c"/>'
    )
  };
  root.QCX_MENU_ICONS = ICONS;
})(typeof window !== 'undefined' ? window : this);
