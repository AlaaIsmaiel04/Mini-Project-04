import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaService {
  public medicine = {
    findMany: async (args?: any): Promise<any[]> => {
      return []; 
    },
  };

  async onModuleInit() {
  }

  async onModuleDestroy() {
  }
}