// dashboard.models.ts
export interface NewLead {
    clientId: string;
    clientName: string;
    createdAt: string;
  }
  
  export interface DashboardData {
    todayUsers: number;
    totalUsers: number;
    todayComments: number;
    newLeads: NewLead[];
    registrationCountries: string[];
  }
  
  export interface DashboardStats {
    monthlyDepositIncome: number;
    todayIncome: number;
    todayUsers: {
      new: number;
      total: number;
    };
    todayComments: number;
  }