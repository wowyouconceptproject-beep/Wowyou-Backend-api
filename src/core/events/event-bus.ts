import { EventEmitter } from "events";

class WowYouEventBus extends EventEmitter {}

export const eventBus =
  new WowYouEventBus();