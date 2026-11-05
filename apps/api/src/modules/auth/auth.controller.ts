import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/security';
import type { ActorRequest } from '../../common/security';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto, SessionUserDto } from './dto/responses.dto';

@ApiTags('auth')
@ApiUnauthorizedResponse({ description: 'Invalid credentials or token.' })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Sign in; inactive subscriptions may still sign in',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Read the current account from PostgreSQL' })
  @ApiOkResponse({ type: SessionUserDto })
  me(@Req() request: ActorRequest) {
    return request.actor;
  }
}
