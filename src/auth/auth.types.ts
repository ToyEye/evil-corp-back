export type CompanyType = 'platform' | 'client';

export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  companyId: string;
  companyType: CompanyType;
};
