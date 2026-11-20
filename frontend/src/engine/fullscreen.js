export async function toggleFullscreen(element, page = document) {
  if (page.fullscreenElement) return page.exitFullscreen();
  if (!element.requestFullscreen) throw new Error('Le plein écran est indisponible dans ce navigateur.');
  return element.requestFullscreen();
}
