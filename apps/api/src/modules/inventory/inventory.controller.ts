import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ActiveSubscriptionGuard,
  JwtAuthGuard,
  OwnershipGuard,
  OwnResource,
  Roles,
  RolesGuard,
} from '../../common/security';
import type { ActorRequest } from '../../common/security';
import { InventoryQueryDto, MedicineDto } from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PHARMACIST')
@Controller('pharmacist')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('medicines')
  list(@Req() request: ActorRequest, @Query() query: InventoryQueryDto) {
    return this.inventory.list(request.actor, query);
  }

  @Post('medicines')
  @UseGuards(ActiveSubscriptionGuard)
  createMedicine(@Req() request: ActorRequest, @Body() dto: MedicineDto) {
    return this.inventory.createMedicine(request.actor, dto);
  }

  @Patch('medicines/:id')
  @UseGuards(OwnershipGuard, ActiveSubscriptionGuard)
  @OwnResource('medicine')
  updateMedicine(
    @Req() request: ActorRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MedicineDto,
  ) {
    return this.inventory.updateMedicine(request.actor, id, dto);
  }
}
