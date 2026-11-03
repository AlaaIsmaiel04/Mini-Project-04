import React, { useState } from 'react';

interface PharmacyProfile {
  name: string;
  area: string;
  address: string;
  phone: string;
}

interface Duty {
  id: string;
  startTime: string;
  endTime: string;
}

export const PharmacyProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<PharmacyProfile>({
    name: 'Al-Shifa Pharmacy', 
    area: 'Downtown Area',
    address: 'King Talal St, Building 4',
    phone: '0791234567',
  });

  const [duties, setDuties] = useState<Duty[]>([
    { id: '1', startTime: '2023-11-01T08:00', endTime: '2023-11-01T16:00' },
    { id: '2', startTime: '2023-11-02T16:00', endTime: '2023-11-03T00:00' },
  ]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Data saved locally (will be connected to API later)');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Pharmacy Profile & Duty</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Profile Settings</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Pharmacy Name (Read-only)</label>
              <input
                type="text"
                value={profile.name}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm p-2 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Area</label>
              <input
                type="text"
                name="area"
                value={profile.area}
                onChange={handleProfileChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Detailed Address</label>
              <input
                type="text"
                name="address"
                value={profile.address}
                onChange={handleProfileChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleProfileChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Duty Schedule</h2>
            <button className="text-sm bg-green-600 text-white py-1 px-3 rounded hover:bg-green-700">
              + Add Duty
            </button>
          </div>
          
          {duties.length === 0 ? (
            <p className="text-gray-500 text-sm">No duties scheduled.</p>
          ) : (
            <ul className="space-y-3">
              {duties.map((duty) => (
                <li key={duty.id} className="flex justify-between items-center p-3 border rounded-md bg-gray-50">
                  <div className="text-sm text-gray-600">
                    <p><strong>From:</strong> {new Date(duty.startTime).toLocaleString('en-US')}</p>
                    <p><strong>To:</strong> {new Date(duty.endTime).toLocaleString('en-US')}</p>
                  </div>
                  <button className="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};