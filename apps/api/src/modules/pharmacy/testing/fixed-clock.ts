import type { Clock } from '../clock';

// Test only: never bind this in a module.
export class FixedClock implements Clock {
  constructor(private readonly instant: Date) {}

  now(): Date {
    return new Date(this.instant);
  }
}
