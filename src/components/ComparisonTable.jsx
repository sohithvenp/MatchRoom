import React from 'react';
import ComparisonIndicator from './ComparisonIndicator';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

export default function ComparisonTable({ properties, onRemove }) {
  const navigate = useNavigate();
  
  const features = [
    { label: 'Monthly Rent', key: 'price', type: 'price' },
    { label: 'Compatibility Score', key: 'score', type: 'score', source: 'compatibility' },
    { label: 'Commute Time', key: 'transit', type: 'time', source: 'commute.modes' },
    { label: 'Distance to Campus', key: 'distance', type: 'text', source: 'commute', suffix: ' km' },
    { label: 'Property Type', key: 'propertyType', type: 'text' },
    { label: 'Furnished', key: 'furnishing', type: 'text' },
    { label: 'Environment', key: 'environmentType', type: 'text' },
    { label: 'Smoking Policy', key: 'smokingPolicy', type: 'text' },
    { label: 'Guest Policy', key: 'guestPolicy', type: 'text' },
    { label: 'Quiet Hours', key: 'quietHours', type: 'text' },
  ];

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  return (
    <div className="overflow-x-auto pb-8">
      <div className="min-w-[800px] bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="p-8 w-64 border-b border-gray-100">
                <span className="text-xs font-bold text-mainText/30 uppercase tracking-[0.2em]">Comparison Matrix</span>
              </th>
              {properties.map(property => (
                <th key={property.id} className="p-8 border-b border-gray-100 min-w-[250px] relative group">
                  <button 
                    onClick={() => onRemove(property.id)}
                    className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                  <img src={property.imageUrl} alt="" className="w-full h-32 object-cover rounded-2xl mb-4 shadow-md" />
                  <h3 className="font-display font-bold text-mainText mb-2 truncate">{property.propertyName}</h3>
                  <button 
                    onClick={() => navigate(`/property/${property.id}`)}
                    className="text-primary text-xs font-bold hover:underline"
                  >
                    View Details
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature, idx) => (
              <tr key={feature.label} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                <td className="p-8 border-b border-gray-100 align-top">
                  <span className="text-sm font-bold text-mainText/40">{feature.label}</span>
                </td>
                {properties.map(property => {
                  let value = feature.source ? getNestedValue(property, feature.source)?.[feature.key] : property[feature.key];
                  if (!value && feature.source && !feature.source.includes('.')) {
                    // Fallback for single depth source
                    value = property[feature.source]?.[feature.key];
                  }
                  if (!value && !feature.source) value = property[feature.key];
                  
                  // Special cases
                  if (feature.key === 'distance' && property.commute) value = property.commute.distance;
                  if (feature.key === 'score' && property.compatibility) value = property.compatibility.score;
                  if (feature.key === 'transit' && property.commute?.modes) value = property.commute.modes.transit;

                  return (
                    <td key={property.id} className="p-8 border-b border-gray-100">
                      <ComparisonIndicator 
                        type={feature.type} 
                        value={value} 
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
