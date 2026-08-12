export const DEMO_STATUSES = [
  { id: 'available', name: 'Available', color: '#16a34a', active: true },
  { id: 'reserved', name: 'Reserved', color: '#f59e0b', active: true },
  { id: 'sold', name: 'Sold', color: '#dc2626', active: true },
  { id: 'hold', name: 'Hold', color: '#7c3aed', active: true }
];

export const DEMO_UNITS = [
  { id: 1, floor: '01', unit_type: 'Apartment', unit_number: 'A101', svg_id: 'F01_APARTMENT_A101', status_id: 'available', area: 1450 },
  { id: 2, floor: '01', unit_type: 'Apartment', unit_number: 'A102', svg_id: 'F01_APARTMENT_A102', status_id: 'sold', area: 1520 },
  { id: 3, floor: '01', unit_type: 'Shop', unit_number: 'S001', svg_id: 'F01_SHOP_S001', status_id: 'reserved', area: 820 },
  { id: 4, floor: '01', unit_type: 'Shop', unit_number: 'S002', svg_id: 'F01_SHOP_S002', status_id: 'available', area: 1200 },

  { id: 5, floor: '02', unit_type: 'Apartment', unit_number: 'B201', svg_id: 'F02_APARTMENT_B201', status_id: 'available', area: 1450 },
  { id: 6, floor: '02', unit_type: 'Apartment', unit_number: 'B202', svg_id: 'F02_APARTMENT_B202', status_id: 'reserved', area: 1520 },
  { id: 7, floor: '02', unit_type: 'Office', unit_number: 'B203', svg_id: 'F02_OFFICE_B203', status_id: 'sold', area: 980 },
  { id: 8, floor: '02', unit_type: 'Apartment', unit_number: 'B204', svg_id: 'F02_APARTMENT_B204', status_id: 'available', area: 1650 },

  { id: 9, floor: '03', unit_type: 'Apartment', unit_number: 'C301', svg_id: 'F03_APARTMENT_C301', status_id: 'sold', area: 1450 },
  { id: 10, floor: '03', unit_type: 'Apartment', unit_number: 'C302', svg_id: 'F03_APARTMENT_C302', status_id: 'available', area: 1520 },
  { id: 11, floor: '03', unit_type: 'Office', unit_number: 'C303', svg_id: 'F03_OFFICE_C303', status_id: 'hold', area: 980 },
  { id: 12, floor: '03', unit_type: 'Apartment', unit_number: 'C304', svg_id: 'F03_APARTMENT_C304', status_id: 'reserved', area: 1650 }
];
