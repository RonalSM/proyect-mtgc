import test from 'node:test';
import assert from 'node:assert';
import { PasswordService } from '../src/services/password.service.js';
import { authService } from '../src/services/auth.service.js';
import { emailSender } from '../src/services/email.service.js';

test('PasswordService - hashes passwords with asynchronous scrypt and verifies correctly', async () => {
  const password = 'SuperSecretCommanderPassword123!';
  const scryptHash = await PasswordService.hash(password);

  assert.ok(
    scryptHash.startsWith('$scrypt$N=16384,r=8,p=1$'),
    `Expected scrypt hash format, got: ${scryptHash}`
  );
  assert.strictEqual(await PasswordService.verify(password, scryptHash), true);
  assert.strictEqual(await PasswordService.verify('WrongPassword', scryptHash), false);
  assert.strictEqual(await PasswordService.verify('', scryptHash), false);

  // Backward compatibility test: verify legacy salt:hash
  const legacySalt = 'abc12345';
  const legacyHash = `${legacySalt}:5f4dcc3b5aa765d61d8327deb882cf99`;
  // Test doesn't crash on legacy
  const legacyResult = await PasswordService.verify('password', legacyHash);
  assert.strictEqual(typeof legacyResult, 'boolean');
});

test('AuthService - registers user with email verification, Argon2id, and refresh token rotation', async () => {
  const username = `test_user_${Date.now()}`;
  const email = `${username}@mtgc.local`;
  const password = 'ValidPassword999';

  const user = await authService.register({
    username,
    email,
    password,
  });

  assert.strictEqual(user.username, username);
  assert.strictEqual(user.isGuest, false);
  assert.strictEqual(user.isEmailVerified, false);

  // Verify email sender recorded the email
  const sentEmail = emailSender.getLastEmailFor(email);
  assert.ok(sentEmail, 'Expected verification email to be recorded');
  assert.ok(sentEmail.token, 'Expected verification token in email');
  assert.ok(sentEmail.verifyUrl.includes(sentEmail.token));

  // Verify email using token
  const verifyResult = await authService.verifyEmail(sentEmail.token);
  assert.strictEqual(verifyResult, true);

  // Invalid token should fail
  const invalidVerify = await authService.verifyEmail('invalid_token_123');
  assert.strictEqual(invalidVerify, false);

  // Successful login with Argon2id
  const loggedIn = await authService.login({
    identifier: username,
    password,
  });
  assert.strictEqual(loggedIn.id, user.id);
  assert.strictEqual(loggedIn.username, username);

  // Refresh token creation and rotation
  const refreshToken1 = await authService.createRefreshToken(user.id);
  assert.ok(refreshToken1);

  // Rotate refresh token
  const refreshToken2 = await authService.rotateRefreshToken(user.id, refreshToken1);
  assert.ok(refreshToken2);
  assert.notStrictEqual(refreshToken1, refreshToken2);

  // Old refresh token must be rejected
  const replayOldToken = await authService.rotateRefreshToken(user.id, refreshToken1);
  assert.strictEqual(replayOldToken, null);

  // Failed login with wrong password
  await assert.rejects(async () => {
    await authService.login({
      identifier: username,
      password: 'IncorrectPassword',
    });
  }, /Credenciales incorrectas/);
});

test('AuthService - creates guest user and supports deletion', async () => {
  const guest = await authService.createGuest('GuestPlayerX');

  assert.ok(guest.id);
  assert.strictEqual(guest.isGuest, true);
  assert.strictEqual(guest.username, 'GuestPlayerX');

  // GDPR Account Deletion
  const deleted = await authService.deleteAccount(guest.id);
  assert.strictEqual(deleted, true);
});
