import { createStore } from "@hls-downloader/core/lib/store/configure-store";
import { playlistsSlice } from "@hls-downloader/core/lib/store/slices";
import {
  webRequest,
  tabs,
  browserAction as actiobV2,
  action as actiobV3,
} from "webextension-polyfill";

export function addLinkedinListener(store: ReturnType<typeof createStore>) {
  webRequest.onCompleted.addListener(
    async (details) => {
      if (details.tabId < 0) {
        return;
      }

      // If the URL matches the old listener, let it handle it.
      if (details.url.endsWith(".m3u8") || details.url.includes(".m3u8?")) {
        return;
      }

      const tab = await tabs.get(details.tabId);
      if (!tab.url || !tab.url.includes("linkedin.com")) {
        return;
      }

      const contentTypeHeader = details.responseHeaders?.find(
        (h) => h.name.toLowerCase() === "content-type"
      );

      const contentType = contentTypeHeader?.value?.toLowerCase() || "";

      if (
        !contentType.includes("application/vnd.apple.mpegurl") &&
        !contentType.includes("application/x-mpegurl")
      ) {
        return;
      }

      if (
        details.statusCode &&
        (details.statusCode < 200 || details.statusCode >= 300)
      ) {
        return;
      }

      const playlistExists =
        !!store.getState().playlists.playlists[details.url];

      if (playlistExists) {
        return;
      }

      store.dispatch(
        playlistsSlice.actions.addPlaylist({
          id: details.url,
          uri: details.url,
          initiator: tab.url,
          pageTitle: tab.title,
          createdAt: Date.now(),
        })
      );

      const unsubscribe = store.subscribe(() => {
        const status =
          store.getState().playlists.playlistsStatus[details.url]?.status;
        if (status === "ready") {
          const action = actiobV2 || actiobV3;
          void action.setIcon({
            tabId: tab.id,
            path: {
              "16": "assets/icons/16-new.png",
              "48": "assets/icons/48-new.png",
              "128": "assets/icons/128-new.png",
              "256": "assets/icons/256-new.png",
            },
          });
          unsubscribe();
        } else if (status === "error") {
          unsubscribe();
        }
      });
    },
    {
      types: ["xmlhttprequest"],
      urls: ["<all_urls>"],
    },
    ["responseHeaders"]
  );
}
