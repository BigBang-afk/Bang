import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes a password and can verify it against the hash', async () => {
    const hash = await service.hash('correct horse battery staple');
    expect(hash).not.toEqual('correct horse battery staple');
    await expect(service.compare('correct horse battery staple', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password against a hash', async () => {
    const hash = await service.hash('correct horse battery staple');
    await expect(service.compare('wrong password', hash)).resolves.toBe(false);
  });

  it('produces different hashes for the same input (random salt)', async () => {
    const hashA = await service.hash('same-input');
    const hashB = await service.hash('same-input');
    expect(hashA).not.toEqual(hashB);
  });
});
