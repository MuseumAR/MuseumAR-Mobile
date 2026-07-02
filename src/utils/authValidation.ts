const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Vui lòng nhập email.';
  if (!EMAIL_REGEX.test(trimmed)) return 'Email không hợp lệ.';
  return null;
}

export function validatePassword(password: string, minLength = 1): string | null {
  if (!password) return 'Vui lòng nhập mật khẩu.';
  if (password.length < minLength) {
    return `Mật khẩu phải có ít nhất ${minLength} ký tự.`;
  }
  return null;
}

export function validateLoginForm(email: string, password: string): {
  emailError: string | null;
  passwordError: string | null;
} {
  return {
    emailError: validateEmail(email),
    passwordError: validatePassword(password),
  };
}

export function validateResetPasswordForm(
  token: string,
  newPassword: string,
  confirmPassword: string,
): {
  tokenError: string | null;
  passwordError: string | null;
  confirmError: string | null;
} {
  const tokenError = !token.trim() ? 'Vui lòng nhập mã xác nhận từ email.' : null;
  const passwordError = validatePassword(newPassword, 8);
  let confirmError: string | null = null;
  if (!confirmPassword) {
    confirmError = 'Vui lòng xác nhận mật khẩu mới.';
  } else if (newPassword !== confirmPassword) {
    confirmError = 'Mật khẩu xác nhận không khớp.';
  }
  return { tokenError, passwordError, confirmError };
}
