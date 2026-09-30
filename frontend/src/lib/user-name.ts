interface NamedUser {
  displayName: string;
  email: string;
}

export function userName(user: NamedUser) {
  return user.displayName || user.email;
}
