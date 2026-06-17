export type User = {
  id: string;
  username: string;
  displayName: string;
  email: string;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};
