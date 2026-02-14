import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Lấy token từ Header gửi lên
    const clientAuthHeader = request.headers['authorization'];

    // 2. Lấy token chuẩn từ ConfigService (giả sử đây là token bạn mong đợi)
    const expectedToken = this.configService.get<string>(
      'DECK_LOG_BEARER_TOKEN',
    );

    // 3. Kiểm tra xem header có tồn tại và đúng định dạng Bearer không
    if (!clientAuthHeader || !clientAuthHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Thiếu hoặc sai định dạng Authorization header',
      );
    }

    // 4. So sánh token (Đảm bảo khớp chính xác với Bearer + token từ ConfigService)
    if (clientAuthHeader === `Bearer ${expectedToken}`) {
      return true;
    }

    throw new UnauthorizedException('Token không hợp lệ');
  }
}
