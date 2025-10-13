import { createStore } from "@hls-downloader/core/lib/store/configure-store";
import { addLinkedinListener } from "./addLinkedinListener";
import { addPlaylistListener } from "./addPlaylistListener";
import { setTabListener } from "./setTabListener";

export function subscribeListeners(store: ReturnType<typeof createStore>) {
  setTabListener(store);
  addPlaylistListener(store);
  addLinkedinListener(store);
}
