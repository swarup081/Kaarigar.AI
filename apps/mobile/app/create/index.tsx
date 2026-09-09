// Redirect to camera (step 1)
import { Redirect } from 'expo-router';

export default function CreateIndex() {
  return <Redirect href="/create/camera" />;
}
