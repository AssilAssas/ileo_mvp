import { redirect } from 'next/navigation';

// Redirect root "/" to the dashboard
// Add a landing page here later if needed
export default function Home() {
  redirect('/dashboard');
}
