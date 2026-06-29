// packages/twenty-server/src/modules/calllive-webhook/calllive-webhook.validator.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CallLiveWebhookValidator {
  constructor(private readonly configService: ConfigService) {}

  verifyHmac(rawBody: Buffer, signatureHeader: string): boolean {
    const secret = this.configService.get<string>('CALLLIVE_WEBHOOK_SECRET');
    if (!secret) {
      return false;
    }

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }

    const providedSignature = signatureHeader.replace('sha256=', '');

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature.length !== providedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(providedSignature),
    );
  }
}
