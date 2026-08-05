import { Redirect } from 'expo-router';

/**
 * App entry gate — always start on the login screen.
 * Guest / logged-in access happens from the login UI itself.
 */
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
