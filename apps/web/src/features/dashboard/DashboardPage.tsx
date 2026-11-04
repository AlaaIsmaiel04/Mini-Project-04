import DashboardPreview from './DashboardPreview';

export default function DashboardPage() {
  // TODO: Fetch real API data here when backend is fully connected.
  // Blocked by shared Database Schema (Mustafa) and Auth Guards.
  
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardPreview />
    </div>
  );
}