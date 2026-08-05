import Constants from 'expo-constants';
import { Platform } from 'react-native';

type AndroidConstants = {
  Brand?: string;
  Manufacturer?: string;
  Model?: string;
};

/**
 * Human-readable device model for POST /Visitor/sync.
 * Works on physical phones and emulators/simulators.
 *
 * - Physical Android: e.g. "google Pixel 7"
 * - Physical iOS: e.g. "iPhone" / device name from Constants
 * - Emulator: e.g. "google sdk_gphone64_x86_64"
 */
export function getDeviceModel(): string {
  if (Platform.OS === 'android') {
    const c = Platform.constants as AndroidConstants;
    const model = c.Model?.trim();
    const brand = (c.Brand ?? c.Manufacturer)?.trim();
    if (model && brand && !model.toLowerCase().startsWith(brand.toLowerCase())) {
      return `${brand} ${model}`;
    }
    return model || brand || 'Android Device';
  }

  if (Platform.OS === 'ios') {
    const iosModel = Constants.platform?.ios?.model?.trim();
    if (iosModel) return iosModel;
    const deviceName = Constants.deviceName?.trim();
    if (deviceName) return deviceName;
    return 'iOS Device';
  }

  return Platform.OS;
}

export function getDeviceType(): string {
  return Platform.OS;
}
