import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Process health only; does not assert database readiness',
  })
  getHealth() {
    return { status: 'ok', service: 'smartshelf-api', stage: 'foundation' };
  }
}
