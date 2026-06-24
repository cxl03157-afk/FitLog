export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
};

export type User = AuthUser & {
  avatarUrl: string | null;
  bio: string | null;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};
