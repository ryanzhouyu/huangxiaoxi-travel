import * as art from './renderer.mjs';
import {demoKey, demoStorage, sessionPrefix, epochKey} from './storage.mjs';
import {composeImage} from './postcard.mjs';
import {renderDetails, collectionExtras} from './views.mjs';

export async function loadDemo() {
  await art.prepareArtwork();
  return {
    art,
    composeImage,
    renderDetails,
    collectionExtras,
    storage: demoStorage(localStorage),
    storageKey: demoKey,
    epochKey,
    sessionPrefix:
      sessionPrefix + (localStorage.getItem(epochKey) || 'initial') + '.',
    orderPages: true,
  };
}
