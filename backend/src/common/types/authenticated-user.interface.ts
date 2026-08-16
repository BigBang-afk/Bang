/** Shape of req.user once the JWT strategy has validated an access token. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}
