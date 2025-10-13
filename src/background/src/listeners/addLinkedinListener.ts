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

      let tab;
      try {
        tab = await tabs.get(details.tabId);
      } catch (error) {
        // Tab may have been closed
        return;
      }

      if (!tab.url || !tab.url.includes("linkedin.com")) {
        return;
      }

      const contentTypeHeader = details.responseHeaders?.find(
        (h) => h.name.toLowerCase() === "content-type"
      );

      const contentType = contentTypeHeader?.value?.toLowerCase() || "";

      // Check if this is an HLS manifest request
      const isM3U8 = details.url.endsWith(".m3u8") || details.url.includes(".m3u8?");
      const hasHLSContentType = 
        contentType.includes("application/vnd.apple.mpegurl") ||
        contentType.includes("application/x-mpegurl");

      // LinkedIn serves .m3u8 files with text/plain content-type, so check URL pattern
      if (!isM3U8 && !hasHLSContentType) {
        return;
      }

      console.log("[LinkedIn Listener] HLS manifest detected:", {
        url: details.url,
        statusCode: details.statusCode,
        contentType,
        isM3U8,
        hasHLSContentType
      });

      if (
        details.statusCode &&
        (details.statusCode < 200 || details.statusCode >= 300)
      ) {
        console.log("[LinkedIn Listener] Rejected due to status code:", details.statusCode);
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
          action.setIcon({
            tabId: tab.id,
            path: {
              "16": "assets/icons/16-new.png",
              "48": "assets/icons/48-new.png",
              "128": "assets/icons/128-new.png",
              "256": "assets/icons/256-new.png",
            },
          }).catch(() => {
            // Tab may have been closed, ignore error
          });
          unsubscribe();
        } else if (status === "error") {
          unsubscribe();
        }
      });
    },
    {
      types: ["xmlhttprequest", "media", "other"],
      urls: ["<all_urls>"],
    },
    ["responseHeaders"]
  );
}
