import {giftPreview, poolProgress} from './collection-preview.mjs';
import * as presentation from './visual/pages.mjs';
import * as art from './renderer.mjs';
import {demoKey, demoStorage, sessionPrefix, epochKey} from './storage.mjs';
import {composeImage, paintDraft, draftMarkup} from './postcard.mjs';
import {renderDetails, collectionExtras} from './views.mjs';

export async function loadDemo() {
  await art.prepareArtwork();
  return {
    art,
    presentation,
    composeImage,
    paintDraft,
    draftMarkup,
    renderDetails,
    collectionExtras,
    giftPreview,
    poolProgress,
    storage: demoStorage(localStorage),
    storageKey: demoKey,
    epochKey,
    sessionPrefix:
      sessionPrefix + (localStorage.getItem(epochKey) || 'initial') + '.',
    orderPages: true,
  };
}
