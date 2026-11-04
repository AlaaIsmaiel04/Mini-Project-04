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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ActiveSubscriptionGuard,
  JwtAuthGuard,
  OwnershipGuard,
  OwnResource,
  Roles,
  RolesGuard,
} from '../../common/security';
import type { ActorRequest } from '../../common/security';
import {
  CreateBatchDto,
  InventoryQueryDto,
  MedicineDto,
  UpdateBatchDto,
} from './dto/inventory.dto';
import {
  BatchResponseDto,
  InventoryResponseDto,
  MedicineResponseDto,
} from './dto/responses.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@ApiBadRequestResponse({ description: 'Invalid UUID, body, date or filter.' })
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired token.' })
@ApiForbiddenResponse({
  description: 'Wrong role, or inactive subscription for a write.',
})
@ApiNotFoundResponse({ description: 'Record not found in your pharmacy.' })
@ApiConflictResponse({
  description: 'Duplicate medicine name or batch number.',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PHARMACIST')
@Controller('pharmacist')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('medicines')
  @ApiOperation({ summary: 'Own inventory; inactive subscriptions may read' })
  @ApiOkResponse({ type: InventoryResponseDto })
  list(@Req() request: ActorRequest, @Query() query: InventoryQueryDto) {
    return this.inventory.list(request.actor, query);
  }

  @Post('medicines')
  @UseGuards(ActiveSubscriptionGuard)
  @ApiOperation({ summary: 'Create an own-pharmacy medicine' })
  @ApiCreatedResponse({ type: MedicineResponseDto })
  createMedicine(@Req() request: ActorRequest, @Body() dto: MedicineDto) {
    return this.inventory.createMedicine(request.actor, dto);
  }

  @Patch('medicines/:id')
  @UseGuards(OwnershipGuard, ActiveSubscriptionGuard)
  @OwnResource('medicine')
  @ApiOperation({ summary: 'Replace all four editable medicine fields' })
  @ApiOkResponse({ type: MedicineResponseDto })
  updateMedicine(
    @Req() request: ActorRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MedicineDto,
  ) {
    return this.inventory.updateMedicine(request.actor, id, dto);
  }

  @Post('medicines/:id/batches')
  @UseGuards(OwnershipGuard, ActiveSubscriptionGuard)
  @OwnResource('medicine')
  @ApiOperation({ summary: 'Add a batch; already expired stock is allowed' })
  @ApiCreatedResponse({ type: BatchResponseDto })
  createBatch(
    @Req() request: ActorRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBatchDto,
  ) {
    return this.inventory.createBatch(request.actor, id, dto);
  }

  @Patch('batches/:id')
  @UseGuards(OwnershipGuard, ActiveSubscriptionGuard)
  @OwnResource('batch')
  @ApiOperation({
    summary:
      'Edit quantity, expiryDate and storageLocation only; all three required',
  })
  @ApiOkResponse({ type: BatchResponseDto })
  updateBatch(
    @Req() request: ActorRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.inventory.updateBatch(request.actor, id, dto);
  }
}
