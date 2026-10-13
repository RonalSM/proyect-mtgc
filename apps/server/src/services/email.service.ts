/**
 * Email Sender interface for user account email verification (REQ-1.1)
 */
export interface EmailSender {
  sendVerificationEmail(to: string, token: string, verifyUrl: string): Promise<boolean>;
}

export interface SentEmailRecord {
  to: string;
  token: string;
  verifyUrl: string;
  sentAt: Date;
}

/**
 * Development Email Sender that records sent emails and logs them
 * to the console without requiring external third-party paid providers.
 */
export class DevEmailSender implements EmailSender {
  private sentEmails: SentEmailRecord[] = [];

  public async sendVerificationEmail(to: string, token: string, verifyUrl: string): Promise<boolean> {
    const record: SentEmailRecord = {
      to,
      token,
      verifyUrl,
      sentAt: new Date(),
    };
    this.sentEmails.push(record);
    console.log(`📧 [DevEmailSender] Verificación enviada a: ${to}`);
    console.log(`   URL de verificación: ${verifyUrl}`);
    console.log(`   Token: ${token}`);
    return true;
  }

  public getSentEmails(): SentEmailRecord[] {
    return [...this.sentEmails];
  }

  public getLastEmailFor(to: string): SentEmailRecord | undefined {
    return this.sentEmails.filter(e => e.to.toLowerCase() === to.toLowerCase()).pop();
  }

  public clear(): void {
    this.sentEmails = [];
  }
}

export const emailSender = new DevEmailSender();
