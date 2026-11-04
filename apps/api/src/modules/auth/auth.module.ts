import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import {
  ActiveSubscriptionGuard,
  JwtAuthGuard,
  OwnershipGuard,
  RolesGuard,
} from '../../common/security';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_SECRET');
        if (secret.length < 32 || secret.startsWith('replace-with-')) {
          throw new Error(
            'Set JWT_SECRET to a random local secret of at least 32 characters.',
          );
        }
        return { secret, signOptions: { algorithm: 'HS256', expiresIn: '1h' } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    OwnershipGuard,
    ActiveSubscriptionGuard,
  ],
  exports: [
    JwtModule,
    JwtAuthGuard,
    RolesGuard,
    OwnershipGuard,
    ActiveSubscriptionGuard,
  ],
})
export class AuthModule {}
