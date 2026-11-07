import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { InviteRelativeDto, RequestLinkDto, StaffLinkDto } from './dto/relatives.dto';
import { RelativesService } from './relatives.service';
import {
  RelativeLinkDto,
  RelativeOfRecipientDto,
  WardLinkDto,
} from './dto/relatives-responses.dto';
import { ApiStandardErrors } from '../../common/dto/responses.dto';

@ApiTags('relatives')
@ApiBearerAuth()
@ApiStandardErrors()
@Controller('relatives')
export class RelativesController {
  constructor(private readonly relatives: RelativesService) {}

  @Get('links')
  @Roles(Role.RECIPIENT, Role.RELATIVE)
  @ApiOperation({
    summary: 'Мои связи',
    description: 'Родственнику — подопечные с числом активных заявок; получателю — родственники',
  })
  @ApiExtraModels(WardLinkDto, RelativeOfRecipientDto)
  @ApiOkResponse({
    description: 'RELATIVE получает WardLinkDto[], RECIPIENT — RelativeOfRecipientDto[]',
    schema: {
      oneOf: [
        { type: 'array', items: { $ref: getSchemaPath(WardLinkDto) } },
        { type: 'array', items: { $ref: getSchemaPath(RelativeOfRecipientDto) } },
      ],
    },
  })
  links(@CurrentUser() user: AuthUser) {
    return this.relatives.myLinks(user);
  }

  @Post('links/request')
  @Roles(Role.RELATIVE)
  @ApiOperation({ summary: 'Родственник: отправить запрос подопечному по телефону' })
  @ApiCreatedResponse({ type: RelativeLinkDto })
  request(@CurrentUser() user: AuthUser, @Body() dto: RequestLinkDto) {
    return this.relatives.request(user.id, dto.recipientPhone, dto.relation);
  }

  @Post('links/invite')
  @Roles(Role.RECIPIENT)
  @ApiOperation({ summary: 'Получатель: пригласить родственника (связь подтверждена сразу)' })
  @ApiCreatedResponse({ type: RelativeLinkDto })
  invite(@CurrentUser() user: AuthUser, @Body() dto: InviteRelativeDto) {
    return this.relatives.invite(user.id, dto.relativePhone, dto.relation);
  }

  @Post('links')
  @Roles(Role.COORDINATOR)
  @ApiOperation({ summary: 'Координатор: связать получателя и родственника' })
  @ApiCreatedResponse({ type: RelativeLinkDto })
  staffLink(@Body() dto: StaffLinkDto) {
    return this.relatives.staffLink(dto);
  }

  @Post('links/:id/confirm')
  @HttpCode(200)
  @Roles(Role.RECIPIENT, Role.COORDINATOR)
  @ApiOperation({ summary: 'Подтвердить запрос родственника' })
  @ApiOkResponse({ type: RelativeLinkDto })
  confirm(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.relatives.confirm(user, id);
  }

  @Delete('links/:id')
  @HttpCode(204)
  @Roles(Role.RECIPIENT, Role.RELATIVE, Role.COORDINATOR)
  @ApiOperation({ summary: 'Отклонить запрос или разорвать связь' })
  @ApiNoContentResponse({ description: 'Готово, тела ответа нет' })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.relatives.remove(user, id);
  }
}
