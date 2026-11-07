import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';
import { AuthResponseDto } from './dto/auth-responses.dto';
import { ApiStandardErrors } from '../../common/dto/responses.dto';

@ApiTags('auth')
@Public()
@ApiStandardErrors()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Регистрация: «Мне нужна помощь / Помогаю родному / Хочу помогать»',
    description: 'Требует согласия на обработку ПД. Волонтёр получает статус PENDING до проверки.',
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Вход по телефону и паролю' })
  @ApiOkResponse({ type: AuthResponseDto })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Обновить пару токенов (старый refresh-токен отзывается)' })
  @ApiOkResponse({ type: AuthResponseDto })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Выход: отозвать refresh-токен' })
  @ApiNoContentResponse({ description: 'Готово, тела ответа нет' })
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }
}
