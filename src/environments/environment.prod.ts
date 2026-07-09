export const environment = {
  production: true,
  apiUrl: 'https://smart-palm-platform.onrender.com/api/v1',
  dataSource: 'real' as 'real' | 'mock',
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
