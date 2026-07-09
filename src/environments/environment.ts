export const environment = {
  production: false,
  /** SmartPalm .NET API (Render). */
  apiUrl: 'https://smart-palm-platform.onrender.com/api/v1',
  /** `real` = deployed backend; `mock` = legacy local mock-api paths. */
  dataSource: 'real' as 'real' | 'mock',
  /** While POST /authentication/sign-in is broken (missing users table). */
  demoAuth: true,
  demo: {
    plantationId: 1,
    agronomistId: 1,
    deviceMac: '123456',
    gatewayMac: '12345',
  },
  features: {
    recommendations: true,
    sensors: true,
    iotStatus: true,
    alerts: false,
    reports: false,
    inspections: false,
    notifications: false,
    plantationsApi: false,
    subscriptionApi: false,
  },
};
