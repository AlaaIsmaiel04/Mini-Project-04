export default function DashboardPreview() {
  const mockContractData = {
    pharmacyName: 'Test Pharmacy',
    subscriptionStatus: 'ACTIVE',
    totalMedicines: 120,
    attentionItems: 5,
    totalValue: '1250.50',
    wasteValue: '45.00'
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded">
        <p className="font-bold">Development Preview</p>
        <p>This screen uses hardcoded prototype data. Real API integration pending scheduled days.</p>
      </div>
      
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        {mockContractData.pharmacyName} Dashboard
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm">Total Medicines</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{mockContractData.totalMedicines}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm">Attention Items</h3>
          <p className="text-3xl font-bold text-orange-500 mt-2">{mockContractData.attentionItems}</p>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-xl font-bold mb-4">Profile & Duties Management</h3>
        <div className="flex gap-3">
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded cursor-not-allowed opacity-50"
            title="TODO: Scheduled for implementation"
            onClick={() => alert('TODO: Profile saving API pending implementation')}
          >
            Save Profile (TODO)
          </button>
          <button 
            className="px-4 py-2 bg-green-500 text-white rounded cursor-not-allowed opacity-50"
            title="TODO: Scheduled for implementation"
          >
            Add Duty (TODO)
          </button>
          <button 
            className="px-4 py-2 bg-red-500 text-white rounded cursor-not-allowed opacity-50"
            title="TODO: Scheduled for implementation"
          >
            Delete Duty (TODO)
          </button>
        </div>
      </div>
    </div>
  );
}