import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class UnavailableDataAdapter {
  async getMedicinesScopedToPharmacy(pharmacyId: string): Promise<any[]> {
    throw new ServiceUnavailableException('Database implementation blocked by Mustafa. Inventory data is currently unavailable.');
  }
}