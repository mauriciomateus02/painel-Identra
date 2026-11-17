export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: string;
}

export interface PublicService {
  id: string;
  name: string;
  type: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  imageUrl: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  services?: PublicService[];
}
