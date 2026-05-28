import { Injectable, Optional } from '@nestjs/common';
import {
  BASE_EVENT_COMPOSITIONS,
  DEFAULT_EVENT_COMPOSITION_KEY,
  type EventComposition,
} from './event-composition';
import type { CompositionsService } from '../compositions/compositions.service';

@Injectable()
export class EventsService {
  constructor(
    /**
     * Solo disponible cuando CompositionsModule está cargado (MONGO_URI configurado).
     * Si es null, se usan las composiciones hardcodeadas como fallback.
     */
    @Optional()
    private readonly compositionsService: CompositionsService | null,
  ) {}

  async findCompositionByKey(
    key: string,
  ): Promise<EventComposition | undefined> {
    if (this.compositionsService) {
      return this.compositionsService.findByKey(key);
    }
    return BASE_EVENT_COMPOSITIONS.find((c) => c.key === key);
  }

  async getDefaultComposition(): Promise<EventComposition> {
    if (this.compositionsService) {
      const composition = await this.compositionsService.getDefault();
      if (composition) return composition;
    }
    return BASE_EVENT_COMPOSITIONS.find(
      (c) => c.key === DEFAULT_EVENT_COMPOSITION_KEY,
    )!;
  }

}
