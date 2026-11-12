(function(){
  function clearHeights(){
    var cards = document.querySelectorAll('.all_posts .card, .qcx-rescue-blog .card');
    Array.prototype.forEach.call(cards, function(card){
      card.style.minHeight = '';
      card.style.height = '';
    });
  }
  function run(){
    if (typeof window.__qcxCleanCardSnippets === 'function') window.__qcxCleanCardSnippets();
    clearHeights();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
  else run();
  window.addEventListener('resize', function(){
    window.clearTimeout(window.__qcxEqT);
    window.__qcxEqT = window.setTimeout(clearHeights, 120);
  });
})();
