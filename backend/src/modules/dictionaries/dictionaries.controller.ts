import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { DictionariesService } from './dictionaries.service';
import { ApiStandardErrors, CategoryDto, DistrictDto } from '../../common/dto/responses.dto';

@ApiTags('dictionaries')
@Public()
@ApiStandardErrors()
@Controller('dictionaries')
export class DictionariesController {
  constructor(private readonly dictionaries: DictionariesService) {}

  @Get('districts')
  @ApiOperation({ summary: 'Районы Владивостока' })
  @ApiOkResponse({ type: [DistrictDto] })
  districts() {
    return this.dictionaries.districts();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Виды помощи (продукты, лекарства, ЖКХ…)' })
  @ApiOkResponse({ type: [CategoryDto] })
  categories() {
    return this.dictionaries.categories();
  }
}
