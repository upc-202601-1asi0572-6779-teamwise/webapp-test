export const environment = {
  production: true,
  apiUrl: 'https://smart-palm-platform.onrender.com/api/v1',
  dataSource: 'real' as 'real' | 'mock',
  demoAuth: false,
  demo: {
    plantationId: 1,
    agronomistId: 3,
    /** Align with backend seed when available on Render. */
    deviceMac: 'AA:BB:CC:DD:EE:01',
    gatewayMac: 'AA:BB:CC:00:00:01',
    sectorId: 1,
  },
  features: {
    recommendations: true,
    sensors: true,
    iotStatus: true,
    monitoring: true,
    interventions: true,
    subscriptionApi: true,
    alerts: false,
    reports: false,
    inspections: false,
    notifications: false,
    plantationsApi: false,
  },
};
