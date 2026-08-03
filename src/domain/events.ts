/**
 * Typed runtime event bus (spec §206 Event Catalog).
 *
 * Events are the contract between the runtime and plugins/experiences. The
 * catalog is a curated set: unknown events are not part of the public API.
 */

export interface CharacterPosition {
  x: number;
  y: number;
}

export interface CharacterEventData {
  characterId: string;
}

export interface CharacterMovedData extends CharacterEventData, CharacterPosition {}

export interface CharacterClickedData extends CharacterEventData, CharacterPosition {}

export interface CharacterSpeakingData extends CharacterEventData {
  message: string;
}

export interface MischiefEvents {
  RuntimeStarted: { version: string };
  RuntimeStopped: Record<string, never>;
  CharacterSpawned: CharacterEventData;
  CharacterMoved: CharacterMovedData;
  CharacterClicked: CharacterClickedData;
  CharacterSleeping: CharacterEventData;
  CharacterSpeaking: CharacterSpeakingData;
  CharacterRemoved: CharacterEventData;
  ThemeLoaded: { themeId: string };
}

export type EventName = keyof MischiefEvents;

export type EventPayload<K extends EventName> = MischiefEvents[K];

export type EventListener<K extends EventName> = (payload: MischiefEvents[K]) => void;

export type Unsubscribe = () => void;

export class EventBus {
  private listeners = new Map<EventName, Set<(payload: never) => void>>();

  on<K extends EventName>(name: K, listener: EventListener<K>): Unsubscribe {
    let set = this.listeners.get(name);
    if (!set) {
      set = new Set();
      this.listeners.set(name, set);
    }
    set.add(listener as (payload: never) => void);
    return () => {
      set.delete(listener as (payload: never) => void);
    };
  }

  emit<K extends EventName>(name: K, payload: MischiefEvents[K]): void {
    const set = this.listeners.get(name);
    if (!set) return;
    for (const listener of [...set]) {
      (listener as EventListener<K>)(payload);
    }
  }

  listenerCount(name: EventName): number {
    return this.listeners.get(name)?.size ?? 0;
  }

  clear(): void {
    this.listeners.clear();
  }
}
