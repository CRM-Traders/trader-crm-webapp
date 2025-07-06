export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  telephone: string | null;
  skype: string | null;
  country: string | null;
  language: string | null;
  dateOfBirth: string | null;
  status: LeadStatus;
  kycStatusId: string | null;
  salesStatus: string | null;
  isProblematic: boolean;
  isBonusAbuser: boolean;
  bonusAbuserReason: string | null;
  hasInvestments: boolean;
  affiliateId: string;
  affiliateName: string | null;
  ftdTime: string | null;
  ltdTime: string | null;
  qualificationTime: string | null;
  registrationDate: string;
  registrationIP: string | null;
  source: string | null;
  lastLogin: string | null;
  lastCommunication: string | null;
}

export interface LeadCreateRequest {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  telephone: string;
  country: string;
  language: string;
  dateOfBirth: string;
  source: string;
}

export interface LeadCreateResponse {
  leadId: string;
  userId: string;
  generatedPassword: string;
}

export interface LeadUpdateRequest {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  telephone?: string | null;
  secondTelephone?: string | null;
  skype?: string | null;
  country?: string | null;
  language?: string | null;
  dateOfBirth?: string | null;
}

export interface LeadsListRequest {
  pageIndex?: number;
  pageSize?: number;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  visibleColumns?: string[] | null;
  globalFilter?: string | null;
  filters?: Record<string, any> | null;
}

export interface LeadImportResult {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  generatedPassword: string;
  clientId: string;
  userId: string;
  affiliateId: string;
}

export interface LeadImportResponse {
  successCount: number;
  failureCount: number;
  clientResults: LeadImportResult[];
}

export enum LeadStatus {
  Active = 1,
  Inactive = 0,
  Suspended = 2,
  Closed = 3,
}

export const LeadStatusLabels: Record<LeadStatus, string> = {
  [LeadStatus.Active]: 'Active',
  [LeadStatus.Inactive]: 'Inactive',
  [LeadStatus.Suspended]: 'Suspended',
  [LeadStatus.Closed]: 'Closed',
};

export const LeadStatusColors: Record<LeadStatus, string> = {
  [LeadStatus.Active]: 'bg-green-100 text-green-800',
  [LeadStatus.Inactive]: 'bg-gray-100 text-gray-800',
  [LeadStatus.Suspended]: 'bg-yellow-100 text-yellow-800',
  [LeadStatus.Closed]: 'bg-red-100 text-red-800',
};

export enum KycStatus { 
  Active = 0,
  Appointment24Hr = 1,
  BlackListCountry = 2,
  Callback = 3,
  CallbackNA = 4,
  CallAgain = 5,
  CallbackInsff = 6,
  Converted = 7,
  Depositor = 8,
  DepositWithMe = 9,
  DialerAssigned = 10,
  DialerDrop = 11,
  DialerFailed = 12,
  DialerNA = 13,
  DialerNew = 14,
  DifferentVoice = 15,
  DoNotCall = 16,
  Duplicate = 17,
  Expectation = 18,
  FailedDeposit = 19,
  Fault = 20,
  Frost = 21,
  Hot = 22,
  HungUp = 23,
  InitialCall = 24,
  InvalidCountry = 25,
  InvalidLanguage = 26,
  JunkLead = 27,
  LongTermCallBack = 28,
  Media = 29,
  Messenger = 30,
  NeverAnswer = 31,
  New = 32,
  NoAnswer = 33,
  NoAnswer2 = 34,
  NoAnswer3 = 35,
  NoAnswer4 = 36,
  NoAnswer5 = 37,
  NotInterested = 38,
  NoPotential = 39,
  Pending = 40,
  PotentialFraud = 41,
  PotentialHigh = 42,
  PotentialLow = 43,
  PublicNumber = 44,
  ReAssign = 45,
  Referral = 46,
  SelfDepositor = 47,
  Shared = 48,
  Shared10 = 49,
  Shared2 = 50,
  Shared3 = 51,
  Test = 52,
  Under18 = 53,
  VoiceMail = 54,
  WireSent = 55,
  WrongInfo = 56,
  WrongNumber = 57,
}

export const KycStatusLabels: Record<KycStatus, string> = {
  [KycStatus.Active]: 'Active',
  [KycStatus.Appointment24Hr]: 'Appointment 24Hr',
  [KycStatus.BlackListCountry]: 'Black List Country',
  [KycStatus.Callback]: 'Callback',
  [KycStatus.CallbackNA]: 'Callback N/A',
  [KycStatus.CallAgain]: 'Call Again',
  [KycStatus.CallbackInsff]: 'Callback Insufficient',
  [KycStatus.Converted]: 'Converted',
  [KycStatus.Depositor]: 'Depositor',
  [KycStatus.DepositWithMe]: 'Deposit With Me',
  [KycStatus.DialerAssigned]: 'Dialer Assigned',
  [KycStatus.DialerDrop]: 'Dialer Drop',
  [KycStatus.DialerFailed]: 'Dialer Failed',
  [KycStatus.DialerNA]: 'Dialer N/A',
  [KycStatus.DialerNew]: 'Dialer New',
  [KycStatus.DifferentVoice]: 'Different Voice',
  [KycStatus.DoNotCall]: 'Do Not Call',
  [KycStatus.Duplicate]: 'Duplicate',
  [KycStatus.Expectation]: 'Expectation',
  [KycStatus.FailedDeposit]: 'Failed Deposit',
  [KycStatus.Fault]: 'Fault',
  [KycStatus.Frost]: 'Frost',
  [KycStatus.Hot]: 'Hot',
  [KycStatus.HungUp]: 'Hung Up',
  [KycStatus.InitialCall]: 'Initial Call',
  [KycStatus.InvalidCountry]: 'Invalid Country',
  [KycStatus.InvalidLanguage]: 'Invalid Language',
  [KycStatus.JunkLead]: 'Junk Lead',
  [KycStatus.LongTermCallBack]: 'Long Term Callback',
  [KycStatus.Media]: 'Media',
  [KycStatus.Messenger]: 'Messenger',
  [KycStatus.NeverAnswer]: 'Never Answer',
  [KycStatus.New]: 'New',
  [KycStatus.NoAnswer]: 'No Answer',
  [KycStatus.NoAnswer2]: 'No Answer 2',
  [KycStatus.NoAnswer3]: 'No Answer 3',
  [KycStatus.NoAnswer4]: 'No Answer 4',
  [KycStatus.NoAnswer5]: 'No Answer 5',
  [KycStatus.NotInterested]: 'Not Interested',
  [KycStatus.NoPotential]: 'No Potential',
  [KycStatus.Pending]: 'Pending',
  [KycStatus.PotentialFraud]: 'Potential Fraud',
  [KycStatus.PotentialHigh]: 'Potential High',
  [KycStatus.PotentialLow]: 'Potential Low',
  [KycStatus.PublicNumber]: 'Public Number',
  [KycStatus.ReAssign]: 'Re-Assign',
  [KycStatus.Referral]: 'Referral',
  [KycStatus.SelfDepositor]: 'Self Depositor',
  [KycStatus.Shared]: 'Shared',
  [KycStatus.Shared10]: 'Shared 10',
  [KycStatus.Shared2]: 'Shared 2',
  [KycStatus.Shared3]: 'Shared 3',
  [KycStatus.Test]: 'Test',
  [KycStatus.Under18]: 'Under 18',
  [KycStatus.VoiceMail]: 'Voice Mail',
  [KycStatus.WireSent]: 'Wire Sent',
  [KycStatus.WrongInfo]: 'Wrong Info',
  [KycStatus.WrongNumber]: 'Wrong Number',
};
