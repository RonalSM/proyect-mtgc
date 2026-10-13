import test from 'node:test';
import assert from 'node:assert';
import { PasswordService } from '../src/services/password.service.js';
import { authService } from '../src/services/auth.service.js';

test('PasswordService - hashes passwords with salt and verifies correctly', () => {
  const password = 'SuperSecretCommanderPassword123!';
  const hash = PasswordService.hash(password);

  assert.ok(hash.includes(':'));
  assert.strictEqual(PasswordService.verify(password, hash), true);
  assert.strictEqual(PasswordService.verify('WrongPassword', hash), false);
  assert.strictEqual(PasswordService.verify('', hash), false);
});

test('AuthService - registers user and authenticates login successfully', async () => {
  const username = `test_user_${Date.now()}`;
  const password = 'ValidPassword999';

  const user = await authService.register({
    username,
    email: `${username}@mtgc.local`,
    password,
  });

  assert.strictEqual(user.username, username);
  assert.strictEqual(user.isGuest, false);

  // Successful login
  const loggedIn = await authService.login({
    identifier: username,
    password,
  });
  assert.strictEqual(loggedIn.id, user.id);
  assert.strictEqual(loggedIn.username, username);

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
