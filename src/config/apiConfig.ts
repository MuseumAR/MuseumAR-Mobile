import { Platform } from 'react-native';

// Khi chạy trên Android Emulator, localhost của máy tính host sẽ được ánh xạ qua IP 10.0.2.2
export const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5149/api',
  ios: 'http://localhost:5149/api',
  default: 'http://localhost:5149/api',
});
