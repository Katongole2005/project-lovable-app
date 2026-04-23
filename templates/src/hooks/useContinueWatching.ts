import { useSyncExternalStore } from "react";

import {
  getContinueWatching,
  subscribeContinueWatching,
} from "@/lib/storage";

const EMPTY_CONTINUE_WATCHING = Object.freeze([]) as readonly [];

export function useContinueWatching() {
  return useSyncExternalStore(
    subscribeContinueWatching,
    getContinueWatching,
    () => EMPTY_CONTINUE_WATCHING as never
  );
}
