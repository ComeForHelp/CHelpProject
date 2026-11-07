import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { AddressesService } from './addresses.service';
import { AddressesQueryDto, CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { AddressDto, ApiStandardErrors } from '../../common/dto/responses.dto';

@ApiTags('addresses')
@ApiBearerAuth()
@Roles(Role.RECIPIENT, Role.RELATIVE, Role.COORDINATOR)
@ApiStandardErrors()
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Адреса получателя (себя, подопечного или любого — координатору)' })
  @ApiOkResponse({ type: [AddressDto] })
  list(@CurrentUser() user: AuthUser, @Query() q: AddressesQueryDto) {
    return this.addresses.list(user, q.recipientId);
  }

  @Post()
  @ApiOperation({ summary: 'Добавить адрес с этажом, лифтом и подсказками про дорогу' })
  @ApiCreatedResponse({ type: AddressDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    return this.addresses.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Изменить адрес / сделать основным' })
  @ApiOkResponse({ type: AddressDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addresses.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить адрес, по которому не было заявок' })
  @ApiNoContentResponse({ description: 'Готово, тела ответа нет' })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.addresses.remove(user, id);
  }
}
