export interface SensorReading {
  id: number;
  deviceId: number;
  plantationId: number;
  monitoringZoneId: number;
  userId: number;
  variableType: 'temperature' | 'soil_humidity' | 'soil_ph';
  label: string;
  value: number;
  unit: string;
  deviceSerial?: string;
  plantationName?: string;
  recordedAt: string;
}

export interface SensorReadingsResponse {
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  readings: SensorReading[];
}
