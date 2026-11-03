import { Injectable } from '@nestjs/common';

export const CLOCK = Symbol('CLOCK');

/** Services read the time from here so date boundaries can be tested exactly. */
export interface Clock {
  now(): Date;
}

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
