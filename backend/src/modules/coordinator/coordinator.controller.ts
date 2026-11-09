import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators';
import { CoordinatorService } from './coordinator.service';
import { ReportQueryDto } from './dto/coordinator.dto';
import { DashboardDto, ReportDto } from './dto/coordinator-responses.dto';
import { ApiStandardErrors } from '../../common/dto/responses.dto';

@ApiTags('coordinator')
@ApiBearerAuth()
@Roles(Role.COORDINATOR)
@ApiStandardErrors()
@Controller('coordinator')
export class CoordinatorController {
  constructor(private readonly coordinator: CoordinatorService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Счётчики: без волонтёра, срочные, просроченные, в работе, волонтёры на проверку',
  })
  @ApiOkResponse({ type: DashboardDto })
  dashboard() {
    return this.coordinator.dashboard();
  }

  @Get('reports')
  @ApiOperation({
    summary: 'Метрики пилота за период',
    description:
      'Пользователи по ролям, заявки по статусам/категориям/районам, доля выполненных, ' +
      'среднее время до отклика волонтёра, средняя оценка',
  })
  @ApiOkResponse({ type: ReportDto })
  reports(@Query() q: ReportQueryDto) {
    return this.coordinator.reports(q);
  }
}
