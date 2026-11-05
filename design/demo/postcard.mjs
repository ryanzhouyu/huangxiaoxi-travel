import {renderedLook} from './renderer.mjs';
import {paintCard} from './visual/print.mjs';

export const draftMarkup =
  '<canvas class="draft-postcard" role="img" aria-label="当前搭配与所选经历的纪念图草稿"></canvas>';

export function paintDraft(canvas, options) {
  paintCard(canvas, options, renderedLook(options.look).surface);
}

export async function composeImage(options) {
  if (!options.events.length) throw Error('请先选择一段到访经历。');
  const paper = document.createElement('canvas');
  const bitmap = await createImageBitmap(renderedLook(options.look).surface);
  try {
    paintCard(paper, options, bitmap);
    return paper.toDataURL('image/png');
  } finally {
    bitmap.close();
  }
}
