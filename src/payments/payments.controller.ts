import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaymentIdDto } from './dto/payment-id.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import type { AuthRequest } from '../auth/types/auth-request';

@Controller('payments')
@UseGuards(AuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Roles('admin', 'receptionist')
  async findAll(@Query() query: PaymentQueryDto) {
    const result = await this.paymentsService.findAll(query);

    return {
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Req() request: AuthRequest, @Param() params: PaymentIdDto) {
    const payment = await this.paymentsService.findOne(params.id, request.user);

    return {
      data: payment,
    };
  }

  @Post()
  @Roles('admin', 'receptionist')
  async create(@Req() request: AuthRequest, @Body() dto: CreatePaymentDto) {
    const payment = await this.paymentsService.create(dto, request.user);

    return {
      data: payment,
    };
  }

  @Patch(':id')
  @Roles('admin', 'receptionist')
  async update(
    @Req() request: AuthRequest,
    @Param() params: PaymentIdDto,
    @Body() dto: UpdatePaymentDto,
  ) {
    const payment = await this.paymentsService.update(
      params.id,
      dto,
      request.user,
    );

    return {
      data: payment,
    };
  }
}
