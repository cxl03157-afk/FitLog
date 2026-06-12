import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreatePersonalRecordDto } from './dto/create-personal-record.dto';
import { UpdatePersonalRecordDto } from './dto/update-personal-record.dto';
import { PersonalRecordsService } from './personal-records.service';

@ApiTags('personal-records')
@ApiBearerAuth()
@Controller('personal-records')
@UseGuards(JwtAuthGuard)
export class PersonalRecordsController {
  constructor(
    private readonly personalRecordsService: PersonalRecordsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'パーソナルレコード一覧取得' })
  @ApiQuery({
    name: 'exerciseId',
    required: false,
    description: '種目 ID でフィルタ',
  })
  @ApiQuery({
    name: 'recordType',
    required: false,
    enum: ['MAX_WEIGHT', 'MAX_REPS'],
    description: 'レコードタイプでフィルタ',
  })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('exerciseId') exerciseId?: string,
    @Query('recordType') recordType?: string,
  ) {
    return this.personalRecordsService.findAll(
      user.sub,
      exerciseId,
      recordType,
    );
  }

  @Post()
  @ApiOperation({ summary: 'パーソナルレコード登録' })
  create(
    @Body() dto: CreatePersonalRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.personalRecordsService.create(dto, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'パーソナルレコード詳細取得' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.personalRecordsService.findOne(id, user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'パーソナルレコード更新' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePersonalRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.personalRecordsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'パーソナルレコード削除' })
  @ApiNoContentResponse({ description: '削除成功' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.personalRecordsService.remove(id, user.sub);
  }
}
