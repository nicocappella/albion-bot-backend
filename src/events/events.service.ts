import { Injectable } from '@nestjs/common';
import {
  BASE_EVENT_COMPOSITIONS,
  DEFAULT_EVENT_COMPOSITION_KEY,
  type EventComposition,
} from './event-composition';

@Injectable()
export class EventsService {
  // TODO: listen to Albion game events and push domain events into the system

  findCompositionByKey(key: string): EventComposition | undefined {
    return BASE_EVENT_COMPOSITIONS.find(
      (composition) => composition.key === key,
    );
  }

  getDefaultComposition(): EventComposition {
    return this.findCompositionByKey(DEFAULT_EVENT_COMPOSITION_KEY)!;
  }
}
