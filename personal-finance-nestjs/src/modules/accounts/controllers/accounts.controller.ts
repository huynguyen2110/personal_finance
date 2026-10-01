import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccountsService } from '../services/accounts.service';
import { CreateAccountDto, UpdateAccountDto } from '../dto/account.dto';

@ApiTags('Accounts')
@ApiBearerAuth('JWT-auth')
@Controller('api/accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list() {
    return this.accounts.listWithBalances();
  }

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.accounts.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAccountDto) {
    return this.accounts.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.accounts.remove(id);
  }
}
