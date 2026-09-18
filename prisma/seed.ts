/**
 * Seeds the DB from Evil-corp frontend dummy data (1:1 IDs).
 * All 21 users: Password123!
 *
 * Do not run until migrate is applied (later step):
 *   npx prisma db seed
 */
import { PrismaClient, type InventoryCategory, type Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Password123!';

const COMPANY = {
  vertex: {
    id: 'company-1',
    name: 'Vertex Capital',
    type: 'platform' as const,
  },
  rapidRoute: {
    id: 'company-2',
    name: 'RapidRoute Logistics',
    type: 'client' as const,
    depotLat: 47.4812,
    depotLng: 19.1303,
  },
  peakStorage: {
    id: 'company-3',
    name: 'Peak Storage',
    type: 'client' as const,
    depotLat: 44.4949,
    depotLng: 11.3426,
  },
};

const USER_ROLES = [
  'SEO',
  'Driver',
  'Storekeeper',
  'Supply',
  'Accountant',
  'Staff',
  'Client',
  'Support',
  'Admin',
] as const;

type SeedRole = (typeof USER_ROLES)[number];

const CATEGORY_PRICE: Record<InventoryCategory, number> = {
  Packaging: 4.25,
  SpareParts: 32,
  Consumables: 2.4,
  Equipment: 145,
  Safety: 19.5,
};

const ZONE_BY_CATEGORY: Record<
  InventoryCategory,
  'Dock' | 'Chill' | 'Bulk' | 'Pick' | 'Safety'
> = {
  Packaging: 'Bulk',
  SpareParts: 'Pick',
  Consumables: 'Chill',
  Equipment: 'Dock',
  Safety: 'Safety',
};

type ItemDraft = {
  sku: string;
  name: string;
  description: string;
  quantity: number;
  category: InventoryCategory;
  price?: number;
};

type SupplierDraft = {
  name: string;
  type: 'Manufacturer' | 'Distributor' | 'Wholesaler' | 'Service' | 'Carrier';
  addedAt: string;
  description: string;
  doesNotSupply: string;
  notes: string;
};

const toCompanySlug = (companyName: string) =>
  companyName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const pathFor = (page: string, companyName: string) =>
  `/${toCompanySlug(companyName)}/${page}`;

const toCompanyItems = (
  company: { id: string },
  drafts: ItemDraft[],
): Prisma.InventoryItemCreateManyInput[] =>
  drafts.map((draft, index) => {
    const zone = ZONE_BY_CATEGORY[draft.category];
    return {
      id: `${company.id}-item-${index + 1}`,
      sku: draft.sku,
      name: draft.name,
      description: draft.description,
      quantity: draft.quantity,
      price:
        draft.price ??
        Number((CATEGORY_PRICE[draft.category] + index * 1.15).toFixed(2)),
      category: draft.category,
      zone,
      bin: `${zone.slice(0, 1)}-${String(index + 1).padStart(2, '0')}`,
      companyId: company.id,
    };
  });

const toCompanySuppliers = (
  company: { id: string },
  drafts: SupplierDraft[],
): Prisma.SupplierCreateManyInput[] =>
  drafts.map((draft, index) => ({
    id: `${company.id}-supplier-${index + 1}`,
    name: draft.name,
    type: draft.type,
    addedAt: new Date(draft.addedAt),
    description: draft.description,
    doesNotSupply: draft.doesNotSupply,
    notes: draft.notes,
    companyId: company.id,
  }));

const rapidRouteItems: ItemDraft[] = [
  {
    sku: 'RR-PAL-001',
    name: 'Euro pallet 120x80',
    description: 'Reusable wooden euro pallet for outbound mixed loads.',
    quantity: 136,
    category: 'Packaging',
  },
  {
    sku: 'RR-BOX-014',
    name: 'Carton box 40x30x25',
    description: 'Double-wall carton for spare parts and small goods.',
    quantity: 620,
    category: 'Packaging',
  },
  {
    sku: 'RR-TAPE-008',
    name: 'Packing tape 48mm',
    description: 'Clear acrylic packing tape, 66 m roll.',
    quantity: 232,
    category: 'Consumables',
  },
  {
    sku: 'RR-FLM-003',
    name: 'Stretch film 500mm',
    description: 'Hand stretch film for pallet wrapping.',
    quantity: 86,
    category: 'Packaging',
  },
  {
    sku: 'RR-LBL-021',
    name: 'Shipping label 100x150',
    description: 'Thermal shipping labels for last-mile parcels.',
    quantity: 1800,
    category: 'Consumables',
  },
  {
    sku: 'RR-GLV-004',
    name: 'Work gloves L',
    description: 'Cut-resistant gloves for warehouse handling.',
    quantity: 74,
    category: 'Safety',
  },
  {
    sku: 'RR-HLM-002',
    name: 'Safety helmet',
    description: 'Adjustable helmet for dock and yard operations.',
    quantity: 32,
    category: 'Safety',
  },
  {
    sku: 'RR-SCN-001',
    name: 'Handheld barcode scanner',
    description: 'USB barcode scanner for inbound checks.',
    quantity: 0,
    category: 'Equipment',
  },
  {
    sku: 'RR-JCK-006',
    name: 'Pallet jack 2.5t',
    description: 'Manual pallet jack for warehouse aisles.',
    quantity: 7,
    category: 'Equipment',
  },
  {
    sku: 'RR-FLT-009',
    name: 'Forklift filter kit',
    description: 'Replacement air and oil filter kit for electric forklifts.',
    quantity: 18,
    category: 'SpareParts',
  },
  {
    sku: 'RR-WHL-012',
    name: 'Pallet jack wheel',
    description: 'Nylon steering wheel for standard pallet jacks.',
    quantity: 26,
    category: 'SpareParts',
  },
  {
    sku: 'RR-WRP-005',
    name: 'Bubble wrap 1m',
    description: 'Protective wrap for fragile outbound goods.',
    quantity: 54,
    category: 'Packaging',
  },
  {
    sku: 'RR-STR-017',
    name: 'PP strapping 12mm',
    description: 'Polypropylene strapping for carton bundles.',
    quantity: 39,
    category: 'Packaging',
  },
  {
    sku: 'RR-MRK-011',
    name: 'Marker black',
    description: 'Permanent markers for crate labeling.',
    quantity: 95,
    category: 'Consumables',
  },
  {
    sku: 'RR-BAT-015',
    name: 'Scanner battery pack',
    description: 'Spare lithium battery for handheld scanners.',
    quantity: 22,
    category: 'SpareParts',
  },
  {
    sku: 'RR-BIN-019',
    name: 'Plastic storage bin 40L',
    description: 'Stackable bin for picking locations.',
    quantity: 64,
    category: 'Equipment',
  },
  {
    sku: 'RR-SHT-010',
    name: 'Hi-vis vest',
    description: 'High-visibility vest, size universal.',
    quantity: 41,
    category: 'Safety',
  },
  {
    sku: 'RR-TAP-022',
    name: 'Floor marking tape',
    description: 'Yellow/black hazard tape for aisle marking.',
    quantity: 28,
    category: 'Safety',
  },
  {
    sku: 'RR-CLP-016',
    name: 'Cable clip pack',
    description: 'Cable management clips for scanner docks.',
    quantity: 120,
    category: 'Consumables',
  },
  {
    sku: 'RR-NET-007',
    name: 'Cargo net 2x3m',
    description: 'Load-securing net for van deliveries.',
    quantity: 15,
    category: 'Equipment',
  },
  {
    sku: 'RR-OIL-018',
    name: 'Hydraulic oil 5L',
    description: 'Hydraulic oil for pallet jacks and lifts.',
    quantity: 19,
    category: 'Consumables',
  },
  {
    sku: 'RR-SEAL-013',
    name: 'Security seal',
    description: 'Numbered plastic seals for trailer doors.',
    quantity: 410,
    category: 'Safety',
  },
  {
    sku: 'RR-COR-020',
    name: 'Corner protector',
    description: 'Cardboard edge protectors for strapped pallets.',
    quantity: 210,
    category: 'Packaging',
  },
  {
    sku: 'RR-MAT-023',
    name: 'Anti-slip mat',
    description: 'Rubber mat for pallet deck grip.',
    quantity: 36,
    category: 'Equipment',
  },
];

const peakStorageItems: ItemDraft[] = [
  {
    sku: 'PS-RCK-001',
    name: 'Rack beam 2700mm',
    description: 'Replacement beam for pallet racking.',
    quantity: 24,
    category: 'SpareParts',
  },
  {
    sku: 'PS-BIN-004',
    name: 'Shelf bin 20L',
    description: 'Open-front bin for small-parts picking.',
    quantity: 88,
    category: 'Equipment',
  },
  {
    sku: 'PS-LBL-009',
    name: 'Location label',
    description: 'Aisle-rack-level barcode labels.',
    quantity: 960,
    category: 'Consumables',
  },
  {
    sku: 'PS-GLV-002',
    name: 'Cold storage gloves',
    description: 'Insulated gloves for chilled warehouse zones.',
    quantity: 34,
    category: 'Safety',
  },
  {
    sku: 'PS-WRP-006',
    name: 'Machine stretch film',
    description: 'Machine-grade film for automatic wrappers.',
    quantity: 33,
    category: 'Packaging',
  },
  {
    sku: 'PS-SCN-003',
    name: 'Wearable scanner',
    description: 'Ring scanner for high-volume picking.',
    quantity: 9,
    category: 'Equipment',
  },
  {
    sku: 'PS-PAD-008',
    name: 'Dock bumpers',
    description: 'Rubber dock bumpers for loading bays.',
    quantity: 12,
    category: 'Safety',
  },
  {
    sku: 'PS-BOX-011',
    name: 'Archive carton',
    description: 'Lidded carton for long-term storage.',
    quantity: 150,
    category: 'Packaging',
  },
  {
    sku: 'PS-BLT-005',
    name: 'Rack bolt set',
    description: 'Anchor bolts for pallet rack uprights.',
    quantity: 70,
    category: 'SpareParts',
  },
  {
    sku: 'PS-TAP-010',
    name: 'Aisle tape blue',
    description: 'Blue floor tape for pedestrian lanes.',
    quantity: 21,
    category: 'Safety',
  },
  {
    sku: 'PS-FAN-007',
    name: 'Warehouse fan filter',
    description: 'Replacement filter for ventilation units.',
    quantity: 16,
    category: 'SpareParts',
  },
  {
    sku: 'PS-TIE-012',
    name: 'Cable tie 300mm',
    description: 'Nylon cable ties for bundling returns.',
    quantity: 500,
    category: 'Consumables',
  },
];

const vertexItems: ItemDraft[] = [
  {
    sku: 'VC-PAP-001',
    name: 'Office paper A4',
    description: 'Copy paper for HQ operations.',
    quantity: 80,
    category: 'Consumables',
  },
  {
    sku: 'VC-LBL-002',
    name: 'Asset tag',
    description: 'Asset tags for internal equipment.',
    quantity: 200,
    category: 'Consumables',
  },
  {
    sku: 'VC-KIT-003',
    name: 'First aid kit',
    description: 'Wall-mounted first aid kit for office floors.',
    quantity: 8,
    category: 'Safety',
  },
  {
    sku: 'VC-MON-004',
    name: 'Monitor stand',
    description: 'Adjustable stand for operations monitors.',
    quantity: 14,
    category: 'Equipment',
  },
];

const rapidRouteSuppliers: SupplierDraft[] = [
  {
    name: 'Nordic Pallet Works',
    type: 'Manufacturer',
    addedAt: '2022-03-14',
    description:
      'Primary source of euro pallets and timber dunnage for outbound lanes.',
    doesNotSupply: 'Plastic pallets, temperature-controlled containers',
    notes: 'Lead time 5 days. Prefers full-truck orders on Tuesdays.',
  },
  {
    name: 'Apex Stretch Films',
    type: 'Distributor',
    addedAt: '2021-11-02',
    description: 'Hand and machine stretch film for RapidRoute wrapping lines.',
    doesNotSupply: 'Shrink hoods, paper wrapping',
    notes: 'Volume rebate after 40 rolls per month.',
  },
  {
    name: 'Harbor Label Co',
    type: 'Manufacturer',
    addedAt: '2023-01-20',
    description: 'Thermal shipping labels and location barcodes.',
    doesNotSupply: 'RFID tags, metal asset plates',
    notes: 'Can print overnight for urgent waves.',
  },
  {
    name: 'Summit Safety Gear',
    type: 'Wholesaler',
    addedAt: '2020-08-09',
    description: 'PPE for dock, yard, and warehouse teams.',
    doesNotSupply: 'Fire suppression systems, first-aid training',
    notes: 'Size XL gloves often backordered in winter.',
  },
  {
    name: 'VoltScan Devices',
    type: 'Distributor',
    addedAt: '2022-06-30',
    description: 'Handheld scanners, batteries, and charging docks.',
    doesNotSupply: 'Printers, warehouse management software',
    notes: 'On-site swap for failed units within 24 hours.',
  },
  {
    name: 'Ridgeway Hydraulics',
    type: 'Service',
    addedAt: '2019-04-18',
    description: 'Maintenance and spare parts for pallet jacks and lifts.',
    doesNotSupply: 'Electric forklifts, charging stations',
    notes: 'Quarterly inspection contract in place.',
  },
  {
    name: 'Coastline Cartons',
    type: 'Manufacturer',
    addedAt: '2021-02-11',
    description: 'Double-wall cartons and archive boxes for mixed SKUs.',
    doesNotSupply: 'Custom printed retail packaging',
    notes: 'Minimum order 200 units per size.',
  },
  {
    name: 'BlueLane Carriers',
    type: 'Carrier',
    addedAt: '2018-09-05',
    description: 'Line-haul partner for inbound supplier collections.',
    doesNotSupply: 'Last-mile parcels, air freight',
    notes: 'Cutoff 16:00 for next-day dock arrival.',
  },
  {
    name: 'Kite Strapping Ltd',
    type: 'Distributor',
    addedAt: '2023-07-12',
    description: 'PP strapping, buckles, and corner protectors.',
    doesNotSupply: 'Steel banding, automated strappers',
    notes: 'Holds buffer stock in their local depot.',
  },
  {
    name: 'Oak & Nylon Wheels',
    type: 'Manufacturer',
    addedAt: '2020-12-01',
    description: 'Replacement wheels and tillers for warehouse equipment.',
    doesNotSupply: 'Complete pallet jacks, batteries',
    notes: 'Compatible with most 2.5t jacks in the fleet.',
  },
  {
    name: 'Frostline Consumables',
    type: 'Wholesaler',
    addedAt: '2024-02-27',
    description: 'Tape, markers, cable ties, and other packing consumables.',
    doesNotSupply: 'Hazardous chemicals, food-grade liners',
    notes: 'Weekly van round every Thursday morning.',
  },
  {
    name: 'DockGuard Seals',
    type: 'Manufacturer',
    addedAt: '2022-10-08',
    description: 'Numbered security seals for trailer doors.',
    doesNotSupply: 'Electronic locks, GPS trackers',
    notes: 'Serial ranges reserved per depot.',
  },
  {
    name: 'Helix Cargo Nets',
    type: 'Distributor',
    addedAt: '2021-05-19',
    description: 'Load-securing nets and anti-slip mats for vans.',
    doesNotSupply: 'Trailer curtains, load bars',
    notes: 'Repair service available for damaged nets.',
  },
  {
    name: 'Pinebox Dunnage',
    type: 'Wholesaler',
    addedAt: '2023-09-03',
    description: 'Void fill, bubble wrap, and edge board for fragile freight.',
    doesNotSupply: 'Crate building, custom foam inserts',
    notes: 'Can stage seasonal peaks two weeks ahead.',
  },
];

const peakStorageSuppliers: SupplierDraft[] = [
  {
    name: 'Alpine Rack Systems',
    type: 'Manufacturer',
    addedAt: '2019-06-21',
    description: 'Pallet rack beams, uprights, and anchor hardware.',
    doesNotSupply: 'Mezzanine floors, automated cranes',
    notes: 'Site survey required before beam replacements.',
  },
  {
    name: 'Polar Bin Works',
    type: 'Manufacturer',
    addedAt: '2021-01-15',
    description: 'Open-front shelf bins for small-parts picking.',
    doesNotSupply: 'Plastic pallets, roll cages',
    notes: 'Colour-coded batches available on request.',
  },
  {
    name: 'Northwind Labels',
    type: 'Distributor',
    addedAt: '2022-04-04',
    description: 'Aisle, rack, and level barcode location labels.',
    doesNotSupply: 'Floor paint, hanging aisle signs',
    notes: 'Cold-storage adhesive variant in stock.',
  },
  {
    name: 'Glacier PPE',
    type: 'Wholesaler',
    addedAt: '2020-11-28',
    description: 'Insulated gloves and cold-zone garments.',
    doesNotSupply: 'Heated clothing, respiratory gear',
    notes: 'Exchange policy for unused sealed packs.',
  },
  {
    name: 'WrapMaster Films',
    type: 'Distributor',
    addedAt: '2023-03-09',
    description: 'Machine-grade stretch film for automatic wrappers.',
    doesNotSupply: 'Hand film, paper interleave',
    notes: 'Compatible with the two Peak wrappers on dock 4.',
  },
  {
    name: 'RingScan Tech',
    type: 'Service',
    addedAt: '2022-08-16',
    description: 'Wearable scanners and firmware support for pickers.',
    doesNotSupply: 'Desktop computers, Wi-Fi infrastructure',
    notes: 'Loaner units during repairs.',
  },
  {
    name: 'Bayline Dock Parts',
    type: 'Manufacturer',
    addedAt: '2018-02-07',
    description: 'Rubber dock bumpers and leveller wear parts.',
    doesNotSupply: 'Full dock levellers, shelter canopies',
    notes: 'Install team books two weeks out.',
  },
  {
    name: 'Archive Carton Mills',
    type: 'Manufacturer',
    addedAt: '2021-09-22',
    description: 'Lidded cartons for long-term storage accounts.',
    doesNotSupply: 'Retail display boxes, mailers',
    notes: 'Recycled board option at a small premium.',
  },
  {
    name: 'Bolt & Anchor Co',
    type: 'Wholesaler',
    addedAt: '2020-05-13',
    description: 'Rack bolts, clips, and floor anchors.',
    doesNotSupply: 'Structural steel, welding services',
    notes: 'Keeps Peak’s standard kit on standing order.',
  },
  {
    name: 'LaneMark Tapes',
    type: 'Distributor',
    addedAt: '2024-01-08',
    description: 'Floor marking tape for pedestrian and forklift lanes.',
    doesNotSupply: 'Epoxy flooring, anti-static mats',
    notes: 'Blue pedestrian tape is the site standard.',
  },
  {
    name: 'VentFilter Nordic',
    type: 'Service',
    addedAt: '2019-10-30',
    description: 'Replacement filters and servicing for warehouse fans.',
    doesNotSupply: 'HVAC design, refrigeration plant',
    notes: 'Filter change every 90 days in chilled halls.',
  },
  {
    name: 'TieFast Nylon',
    type: 'Wholesaler',
    addedAt: '2023-05-17',
    description: 'Cable ties and return-bundling consumables.',
    doesNotSupply: 'Metal strapping, stretch film',
    notes: '300 mm black ties are the default SKU.',
  },
  {
    name: 'ColdChain Carriers',
    type: 'Carrier',
    addedAt: '2017-12-12',
    description: 'Temperature-controlled inbound collections for Peak.',
    doesNotSupply: 'Ambient groupage, courier envelopes',
    notes: 'Reefer set-point must be confirmed 4 hours ahead.',
  },
];

const usersSeed: Array<{
  id: string;
  name: string;
  email: string;
  role: SeedRole;
  companyId: string;
}> = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@vertexcapital.com',
    role: 'Admin',
    companyId: COMPANY.vertex.id,
  },
  {
    id: '2',
    name: 'Amelia Grant',
    email: 'amelia.grant@vertexcapital.com',
    role: 'SEO',
    companyId: COMPANY.vertex.id,
  },
  {
    id: '3',
    name: 'Noah Ellison',
    email: 'noah.ellison@vertexcapital.com',
    role: 'Accountant',
    companyId: COMPANY.vertex.id,
  },
  {
    id: '4',
    name: 'Chloe Hart',
    email: 'chloe.hart@vertexcapital.com',
    role: 'Staff',
    companyId: COMPANY.vertex.id,
  },
  {
    id: '5',
    name: 'Liam Brooks',
    email: 'liam.brooks@rapidroute.com',
    role: 'Driver',
    companyId: COMPANY.rapidRoute.id,
  },
  {
    id: '19',
    name: 'Caleb Morse',
    email: 'caleb.morse@rapidroute.com',
    role: 'Driver',
    companyId: COMPANY.rapidRoute.id,
  },
  {
    id: '6',
    name: 'Sofia Alvarez',
    email: 'sofia.alvarez@rapidroute.com',
    role: 'Storekeeper',
    companyId: COMPANY.rapidRoute.id,
  },
  {
    id: '7',
    name: 'Ethan Park',
    email: 'ethan.park@rapidroute.com',
    role: 'SEO',
    companyId: COMPANY.rapidRoute.id,
  },
  {
    id: '8',
    name: 'Maya Singh',
    email: 'maya.singh@rapidroute.com',
    role: 'Accountant',
    companyId: COMPANY.rapidRoute.id,
  },
  {
    id: '9',
    name: 'Owen Blake',
    email: 'owen.blake@rapidroute.com',
    role: 'Staff',
    companyId: COMPANY.rapidRoute.id,
  },
  {
    id: '15',
    name: 'Harper Quinn',
    email: 'harper.quinn@rapidroute.com',
    role: 'Supply',
    companyId: COMPANY.rapidRoute.id,
  },
  {
    id: '17',
    name: 'Daniel Crowe',
    email: 'daniel.crowe@rapidroute.com',
    role: 'Client',
    companyId: COMPANY.rapidRoute.id,
  },
  {
    id: '10',
    name: 'Yuki Tanaka',
    email: 'yuki.tanaka@peakstorage.com',
    role: 'Driver',
    companyId: COMPANY.peakStorage.id,
  },
  {
    id: '20',
    name: 'Ava Chen',
    email: 'ava.chen@peakstorage.com',
    role: 'Driver',
    companyId: COMPANY.peakStorage.id,
  },
  {
    id: '11',
    name: 'Nina Kowalski',
    email: 'nina.kowalski@peakstorage.com',
    role: 'Storekeeper',
    companyId: COMPANY.peakStorage.id,
  },
  {
    id: '12',
    name: 'Claire Dubois',
    email: 'claire.dubois@peakstorage.com',
    role: 'SEO',
    companyId: COMPANY.peakStorage.id,
  },
  {
    id: '13',
    name: 'Robert Klein',
    email: 'robert.klein@peakstorage.com',
    role: 'Accountant',
    companyId: COMPANY.peakStorage.id,
  },
  {
    id: '14',
    name: 'Priya Nair',
    email: 'priya.nair@peakstorage.com',
    role: 'Staff',
    companyId: COMPANY.peakStorage.id,
  },
  {
    id: '16',
    name: 'Jonas Meier',
    email: 'jonas.meier@peakstorage.com',
    role: 'Supply',
    companyId: COMPANY.peakStorage.id,
  },
  {
    id: '18',
    name: 'Helen Varga',
    email: 'helen.varga@peakstorage.com',
    role: 'Client',
    companyId: COMPANY.peakStorage.id,
  },
  {
    id: '21',
    name: 'Lena Ortiz',
    email: 'lena.ortiz@vertexcapital.com',
    role: 'Support',
    companyId: COMPANY.vertex.id,
  },
];

async function clearDatabase() {
  await prisma.supportMessage.deleteMany();
  await prisma.supportThread.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.appNotification.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.restockRequest.deleteMany();
  await prisma.deliveryProof.deleteMany();
  await prisma.deliveryItem.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.dispatchRoute.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.clientAddress.deleteMany();
  await prisma.client.deleteMany();
  await prisma.pageAccess.deleteMany();
  await prisma.joinRequest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
}

async function main() {
  if (usersSeed.length !== 21) {
    throw new Error(`Expected 21 users, got ${usersSeed.length}`);
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  await clearDatabase();

  await prisma.company.createMany({
    data: [
      {
        id: COMPANY.vertex.id,
        name: COMPANY.vertex.name,
        type: COMPANY.vertex.type,
      },
      {
        id: COMPANY.rapidRoute.id,
        name: COMPANY.rapidRoute.name,
        type: COMPANY.rapidRoute.type,
        depotLat: COMPANY.rapidRoute.depotLat,
        depotLng: COMPANY.rapidRoute.depotLng,
      },
      {
        id: COMPANY.peakStorage.id,
        name: COMPANY.peakStorage.name,
        type: COMPANY.peakStorage.type,
        depotLat: COMPANY.peakStorage.depotLat,
        depotLng: COMPANY.peakStorage.depotLng,
      },
    ],
  });

  await prisma.user.createMany({
    data: usersSeed.map((user) => ({
      ...user,
      passwordHash,
    })),
  });

  await prisma.pageAccess.createMany({
    data: [
      { pageId: 'dashboard', roles: [...USER_ROLES] },
      { pageId: 'users', roles: ['Admin', 'SEO', 'Staff'] },
      { pageId: 'settings', roles: ['Admin', 'SEO'] },
      { pageId: 'warehouse', roles: ['SEO', 'Storekeeper'] },
      { pageId: 'suppliers', roles: ['SEO', 'Supply'] },
      { pageId: 'clients', roles: ['SEO', 'Staff'] },
      { pageId: 'deliveries', roles: ['SEO', 'Staff', 'Driver'] },
      { pageId: 'orders', roles: ['Staff', 'Accountant'] },
      { pageId: 'invoices', roles: ['SEO', 'Accountant'] },
      { pageId: 'support', roles: [...USER_ROLES] },
    ],
  });

  await prisma.client.create({
    data: {
      id: 'client-rr-1',
      name: 'Marta Kovacs',
      phone: '+36 30 555 0188',
      email: 'marta.kovacs@northgate.hu',
      addedAt: new Date('2025-11-04'),
      note: 'Prefers morning drop-offs at the warehouse gate, not the office.',
      companyId: COMPANY.rapidRoute.id,
      addresses: {
        create: [
          {
            id: 'addr-rr-1a',
            line: 'Northgate Logistics, Dock 4, 1087 Budapest',
            lat: 47.4981,
            lng: 19.0817,
          },
          {
            id: 'addr-rr-1b',
            line: 'Kovacs Retail Hub, Vaci ut 45, 1134 Budapest',
            lat: 47.5132,
            lng: 19.0494,
          },
        ],
      },
    },
  });

  await prisma.client.create({
    data: {
      id: 'client-rr-2',
      name: 'James Whitfield',
      phone: '+44 7700 900214',
      email: 'james.whitfield@whitfieldgoods.co.uk',
      addedAt: new Date('2026-02-18'),
      note: 'Call before arrival. Security needs the delivery number.',
      companyId: COMPANY.rapidRoute.id,
      addresses: {
        create: [
          {
            id: 'addr-rr-2a',
            line: 'Whitfield Goods, Unit 12 Saxon Park, Birmingham B6 7EU',
            lat: 52.4862,
            lng: -1.8904,
          },
        ],
      },
    },
  });

  await prisma.client.create({
    data: {
      id: 'client-rr-3',
      name: 'Sofia Almeida',
      phone: '+351 912 440 118',
      email: 'sofia.almeida@almeidafresh.pt',
      addedAt: new Date('2026-06-01'),
      note: '',
      companyId: COMPANY.rapidRoute.id,
      addresses: {
        create: [
          {
            id: 'addr-rr-3a',
            line: 'Almeida Fresh, Rua do Comercio 22, 1990 Lisbon',
            lat: 38.7223,
            lng: -9.1393,
          },
          {
            id: 'addr-rr-3b',
            line: 'Cold store B, Parque Tejo, 2685 Sacavem',
            lat: 38.7947,
            lng: -9.1053,
          },
        ],
      },
    },
  });

  await prisma.client.create({
    data: {
      id: 'client-ps-1',
      name: 'Elena Rossi',
      phone: '+39 347 120 8844',
      email: 'elena.rossi@rossistorage.it',
      addedAt: new Date('2025-09-14'),
      note: 'Chilled zone access only with a Peak escort.',
      companyId: COMPANY.peakStorage.id,
      addresses: {
        create: [
          {
            id: 'addr-ps-1a',
            line: 'Rossi Storage, Via Emilia 80, 40026 Imola',
            lat: 44.3592,
            lng: 11.7131,
          },
          {
            id: 'addr-ps-1b',
            line: "Rossi Cross-dock, Via dell'Industria 3, 40127 Bologna",
            lat: 44.4949,
            lng: 11.3426,
          },
        ],
      },
    },
  });

  await prisma.client.create({
    data: {
      id: 'client-ps-2',
      name: 'Tom Becker',
      phone: '+49 171 555 6621',
      email: 'tom.becker@beckerparts.de',
      addedAt: new Date('2026-01-22'),
      note: 'Leave pallets against the north wall unless a storekeeper is present.',
      companyId: COMPANY.peakStorage.id,
      addresses: {
        create: [
          {
            id: 'addr-ps-2a',
            line: 'Becker Parts GmbH, Industriestrasse 16, 70565 Stuttgart',
            lat: 48.7758,
            lng: 9.1829,
          },
        ],
      },
    },
  });

  const inventoryItems = [
    ...toCompanyItems(COMPANY.rapidRoute, rapidRouteItems),
    ...toCompanyItems(COMPANY.peakStorage, peakStorageItems),
    ...toCompanyItems(COMPANY.vertex, vertexItems),
  ];
  await prisma.inventoryItem.createMany({ data: inventoryItems });

  await prisma.supplier.createMany({
    data: [
      ...toCompanySuppliers(COMPANY.rapidRoute, rapidRouteSuppliers),
      ...toCompanySuppliers(COMPANY.peakStorage, peakStorageSuppliers),
    ],
  });

  await prisma.vehicle.createMany({
    data: [
      {
        id: 'vehicle-rr-1',
        name: 'City van 01',
        plate: 'RR-VAN-01',
        type: 'Van',
        maxUnits: 25,
        companyId: COMPANY.rapidRoute.id,
      },
      {
        id: 'vehicle-rr-2',
        name: 'Box truck 04',
        plate: 'RR-TRK-04',
        type: 'Truck',
        maxUnits: 80,
        companyId: COMPANY.rapidRoute.id,
      },
      {
        id: 'vehicle-ps-1',
        name: 'Reefer 02',
        plate: 'PS-REF-02',
        type: 'Reefer',
        maxUnits: 40,
        companyId: COMPANY.peakStorage.id,
      },
      {
        id: 'vehicle-ps-2',
        name: 'Dock van 01',
        plate: 'PS-VAN-01',
        type: 'Van',
        maxUnits: 20,
        companyId: COMPANY.peakStorage.id,
      },
    ],
  });

  const pallet = inventoryItems.find((i) => i.id === `${COMPANY.rapidRoute.id}-item-1`)!;
  const tape = inventoryItems.find((i) => i.id === `${COMPANY.rapidRoute.id}-item-3`)!;
  const scanner = inventoryItems.find((i) => i.id === `${COMPANY.rapidRoute.id}-item-8`)!;
  const gloves = inventoryItems.find((i) => i.id === `${COMPANY.peakStorage.id}-item-4`)!;
  const bin = inventoryItems.find((i) => i.id === `${COMPANY.peakStorage.id}-item-2`)!;
  const carton = inventoryItems.find((i) => i.id === `${COMPANY.peakStorage.id}-item-8`)!;
  const palletJack = inventoryItems.find(
    (i) => i.id === `${COMPANY.rapidRoute.id}-item-9`,
  )!;
  const wearableScanner = inventoryItems.find(
    (i) => i.id === `${COMPANY.peakStorage.id}-item-6`,
  )!;
  const rackBeam = inventoryItems.find(
    (i) => i.id === `${COMPANY.peakStorage.id}-item-1`,
  )!;

  await prisma.order.create({
    data: {
      id: 'order-rr-1',
      number: 'ORD-1001',
      clientId: 'client-rr-1',
      clientName: 'Marta Kovacs',
      addressId: 'addr-rr-1a',
      destination: 'Northgate Logistics, Dock 4, 1087 Budapest',
      notes: 'Use dock 4. Ask for Marta if the gate is closed.',
      status: 'New',
      fulfillmentStatus: 'Ready',
      companyId: COMPANY.rapidRoute.id,
      createdAt: new Date('2026-09-07T15:10:00.000Z'),
      items: {
        create: [
          {
            productId: pallet.id!,
            sku: pallet.sku!,
            name: pallet.name!,
            quantity: 12,
            unitPrice: pallet.price!,
            reservedQuantity: 12,
            pickedQuantity: 12,
          },
          {
            productId: tape.id!,
            sku: tape.sku!,
            name: tape.name!,
            quantity: 8,
            unitPrice: tape.price!,
            reservedQuantity: 8,
            pickedQuantity: 8,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      id: 'order-rr-2',
      number: 'ORD-1002',
      clientId: 'client-rr-2',
      clientName: 'James Whitfield',
      addressId: 'addr-rr-2a',
      destination: 'Whitfield Goods, Unit 12 Saxon Park, Birmingham B6 7EU',
      notes: 'Waiting for remaining scanners from supply.',
      status: 'Paid',
      fulfillmentStatus: 'Waiting',
      companyId: COMPANY.rapidRoute.id,
      createdAt: new Date('2026-09-08T08:40:00.000Z'),
      items: {
        create: [
          {
            productId: scanner.id!,
            sku: scanner.sku!,
            name: scanner.name!,
            quantity: 20,
            unitPrice: scanner.price!,
            reservedQuantity: 11,
            pickedQuantity: 0,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      id: 'order-ps-1',
      number: 'ORD-2001',
      clientId: 'client-ps-1',
      clientName: 'Elena Rossi',
      addressId: 'addr-ps-1a',
      destination: 'Rossi Storage, Via Emilia 80, 40026 Imola',
      notes: 'Peak escort required for the chilled hall.',
      status: 'Paid',
      fulfillmentStatus: 'Reserved',
      companyId: COMPANY.peakStorage.id,
      createdAt: new Date('2026-09-08T09:05:00.000Z'),
      items: {
        create: [
          {
            productId: gloves.id!,
            sku: gloves.sku!,
            name: gloves.name!,
            quantity: 6,
            unitPrice: gloves.price!,
            reservedQuantity: 6,
            pickedQuantity: 0,
          },
        ],
      },
    },
  });

  await prisma.dispatchRoute.createMany({
    data: [
      {
        id: 'route-rr-1',
        number: 'RT-1001',
        driverId: '5',
        driverName: 'Liam Brooks',
        vehicleId: 'vehicle-rr-1',
        vehicleName: 'RR-VAN-01 · City van 01',
        companyId: COMPANY.rapidRoute.id,
        createdAt: new Date('2026-09-07T16:00:00.000Z'),
      },
      {
        id: 'route-ps-1',
        number: 'RT-2001',
        driverId: '10',
        driverName: 'Yuki Tanaka',
        vehicleId: 'vehicle-ps-1',
        vehicleName: 'PS-REF-02 · Reefer 02',
        companyId: COMPANY.peakStorage.id,
        createdAt: new Date('2026-09-08T09:20:00.000Z'),
      },
    ],
  });

  await prisma.delivery.create({
    data: {
      id: 'delivery-rr-1',
      number: 'DLV-1001',
      clientId: 'client-rr-1',
      clientName: 'Marta Kovacs',
      driverId: '5',
      driverName: 'Liam Brooks',
      vehicleId: 'vehicle-rr-1',
      vehicleName: 'RR-VAN-01 · City van 01',
      routeId: 'route-rr-1',
      routeNumber: 'RT-1001',
      stopIndex: 0,
      addressId: 'addr-rr-1a',
      destination: 'Northgate Logistics, Dock 4, 1087 Budapest',
      lat: 47.4981,
      lng: 19.0817,
      dispatchAt: new Date('2026-09-08T07:30:00.000Z'),
      deliverBy: new Date('2026-09-08T11:00:00.000Z'),
      notes: 'Use dock 4. Ask for Marta if the gate is closed.',
      status: 'Planned',
      reservesStock: false,
      stockWrittenOff: false,
      orderId: 'order-rr-1',
      orderNumber: 'ORD-1001',
      companyId: COMPANY.rapidRoute.id,
      createdAt: new Date('2026-09-07T15:10:00.000Z'),
      items: {
        create: [
          {
            productId: pallet.id!,
            sku: pallet.sku!,
            name: pallet.name!,
            quantity: 12,
          },
          {
            productId: tape.id!,
            sku: tape.sku!,
            name: tape.name!,
            quantity: 8,
          },
        ],
      },
    },
  });

  await prisma.delivery.create({
    data: {
      id: 'delivery-rr-2',
      number: 'DLV-1002',
      clientId: 'client-rr-2',
      clientName: 'James Whitfield',
      driverId: '5',
      driverName: 'Liam Brooks',
      vehicleId: 'vehicle-rr-1',
      vehicleName: 'RR-VAN-01 · City van 01',
      routeId: 'route-rr-1',
      routeNumber: 'RT-1001',
      stopIndex: 1,
      addressId: 'addr-rr-2a',
      destination: 'Whitfield Goods, Unit 12 Saxon Park, Birmingham B6 7EU',
      lat: 52.4862,
      lng: -1.8904,
      notes: '',
      status: 'New',
      reservesStock: false,
      stockWrittenOff: false,
      companyId: COMPANY.rapidRoute.id,
      createdAt: new Date('2026-09-08T08:40:00.000Z'),
      items: {
        create: [
          {
            productId: scanner.id!,
            sku: scanner.sku!,
            name: scanner.name!,
            quantity: 2,
          },
        ],
      },
    },
  });

  await prisma.delivery.create({
    data: {
      id: 'delivery-rr-3',
      number: 'DLV-1003',
      clientId: 'client-rr-3',
      clientName: 'Sofia Almeida',
      driverId: '5',
      driverName: 'Liam Brooks',
      vehicleId: 'vehicle-rr-2',
      vehicleName: 'RR-TRK-04 · Box truck 04',
      addressId: 'addr-rr-3b',
      destination: 'Cold store B, Parque Tejo, 2685 Sacavem',
      lat: 38.7947,
      lng: -9.1053,
      dispatchAt: new Date('2026-09-08T06:00:00.000Z'),
      deliverBy: new Date('2026-09-08T09:30:00.000Z'),
      notes: 'Cold store B. Keep film on the pallets.',
      status: 'InTransit',
      reservesStock: false,
      stockWrittenOff: true,
      shippedAt: new Date('2026-09-08T06:00:00.000Z'),
      companyId: COMPANY.rapidRoute.id,
      createdAt: new Date('2026-09-07T18:20:00.000Z'),
      items: {
        create: [
          {
            productId: pallet.id!,
            sku: pallet.sku!,
            name: pallet.name!,
            quantity: 20,
          },
        ],
      },
    },
  });

  await prisma.delivery.create({
    data: {
      id: 'delivery-ps-1',
      number: 'DLV-2001',
      clientId: 'client-ps-1',
      clientName: 'Elena Rossi',
      driverId: '10',
      driverName: 'Yuki Tanaka',
      vehicleId: 'vehicle-ps-1',
      vehicleName: 'PS-REF-02 · Reefer 02',
      routeId: 'route-ps-1',
      routeNumber: 'RT-2001',
      stopIndex: 0,
      addressId: 'addr-ps-1a',
      destination: 'Rossi Storage, Via Emilia 80, 40026 Imola',
      lat: 44.3592,
      lng: 11.7131,
      dispatchAt: new Date('2026-09-09T08:00:00.000Z'),
      deliverBy: new Date('2026-09-09T13:00:00.000Z'),
      notes: 'Peak escort required for the chilled hall.',
      status: 'Planned',
      reservesStock: false,
      stockWrittenOff: false,
      companyId: COMPANY.peakStorage.id,
      createdAt: new Date('2026-09-08T09:05:00.000Z'),
      items: {
        create: [
          {
            productId: gloves.id!,
            sku: gloves.sku!,
            name: gloves.name!,
            quantity: 6,
          },
        ],
      },
    },
  });

  await prisma.delivery.create({
    data: {
      id: 'delivery-ps-2',
      number: 'DLV-2002',
      clientId: 'client-ps-2',
      clientName: 'Tom Becker',
      addressId: 'addr-ps-2a',
      destination: 'Becker Parts GmbH, Industriestrasse 16, 70565 Stuttgart',
      lat: 48.7758,
      lng: 9.1829,
      notes: 'North wall drop if nobody is at the dock.',
      status: 'New',
      reservesStock: false,
      stockWrittenOff: false,
      companyId: COMPANY.peakStorage.id,
      createdAt: new Date('2026-09-08T10:15:00.000Z'),
      items: {
        create: [
          {
            productId: bin.id!,
            sku: bin.sku!,
            name: bin.name!,
            quantity: 10,
          },
          {
            productId: carton.id!,
            sku: carton.sku!,
            name: carton.name!,
            quantity: 15,
          },
        ],
      },
    },
  });

  await prisma.restockRequest.createMany({
    data: [
      {
        id: 'restock-1',
        productId: scanner.id!,
        sku: scanner.sku!,
        productName: scanner.name!,
        quantity: 20,
        note: 'Two docks are down to spare units only.',
        status: 'New',
        purposes: ['warehouse'],
        requestedById: '6',
        requestedByName: 'Sofia Alvarez',
        companyId: COMPANY.rapidRoute.id,
        createdAt: new Date('2026-09-06T08:15:00.000Z'),
      },
      {
        id: 'restock-2',
        productId: palletJack.id!,
        sku: palletJack.sku!,
        productName: palletJack.name!,
        quantity: 4,
        note: 'Need extras before the weekend inbound wave.',
        status: 'Delivered',
        purposes: ['warehouse'],
        requestedById: '6',
        requestedByName: 'Sofia Alvarez',
        companyId: COMPANY.rapidRoute.id,
        createdAt: new Date('2026-09-07T11:40:00.000Z'),
      },
      {
        id: 'restock-3',
        productId: pallet.id!,
        sku: pallet.sku!,
        productName: pallet.name!,
        quantity: 80,
        note: 'Stock is still healthy; topping up for a large outbound contract.',
        status: 'New',
        purposes: ['warehouse'],
        requestedById: '6',
        requestedByName: 'Sofia Alvarez',
        companyId: COMPANY.rapidRoute.id,
        createdAt: new Date('2026-09-08T07:05:00.000Z'),
      },
      {
        id: 'restock-4',
        productId: wearableScanner.id!,
        sku: wearableScanner.sku!,
        productName: wearableScanner.name!,
        quantity: 12,
        note: 'Pick team is sharing units on the night shift.',
        status: 'New',
        purposes: ['warehouse'],
        requestedById: '11',
        requestedByName: 'Nina Kowalski',
        companyId: COMPANY.peakStorage.id,
        createdAt: new Date('2026-09-05T14:20:00.000Z'),
      },
      {
        id: 'restock-5',
        productId: rackBeam.id!,
        sku: rackBeam.sku!,
        productName: rackBeam.name!,
        quantity: 10,
        note: '',
        status: 'New',
        purposes: ['warehouse'],
        requestedById: '11',
        requestedByName: 'Nina Kowalski',
        companyId: COMPANY.peakStorage.id,
        createdAt: new Date('2026-09-08T06:50:00.000Z'),
      },
      {
        id: 'restock-6',
        productId: scanner.id!,
        sku: scanner.sku!,
        productName: scanner.name!,
        quantity: 9,
        note: 'Shortage for ORD-1002',
        status: 'New',
        purposes: ['order'],
        orderId: 'order-rr-2',
        orderNumber: 'ORD-1002',
        requestedById: '9',
        requestedByName: 'Owen Blake',
        companyId: COMPANY.rapidRoute.id,
        createdAt: new Date('2026-09-08T08:42:00.000Z'),
      },
    ],
  });

  const invoiceRr2Total = 20 * scanner.price!;
  const invoicePs1Total = 6 * gloves.price!;

  await prisma.invoice.createMany({
    data: [
      {
        id: 'invoice-1',
        number: 'INV-1001',
        orderId: 'order-rr-2',
        orderNumber: 'ORD-1002',
        clientId: 'client-rr-2',
        clientName: 'James Whitfield',
        status: 'Paid',
        total: invoiceRr2Total,
        companyId: COMPANY.rapidRoute.id,
        createdAt: new Date('2026-09-08T08:40:00.000Z'),
        paidAt: new Date('2026-09-08T08:40:00.000Z'),
      },
      {
        id: 'invoice-2',
        number: 'INV-1002',
        orderId: 'order-ps-1',
        orderNumber: 'ORD-2001',
        clientId: 'client-ps-1',
        clientName: 'Elena Rossi',
        status: 'Paid',
        total: invoicePs1Total,
        companyId: COMPANY.peakStorage.id,
        createdAt: new Date('2026-09-08T09:05:00.000Z'),
        paidAt: new Date('2026-09-08T09:05:00.000Z'),
      },
    ],
  });

  await prisma.appNotification.createMany({
    data: [
      {
        id: 'notice-1',
        companyId: COMPANY.rapidRoute.id,
        recipientUserId: '5',
        title: 'New trip assigned',
        body: 'DLV-1001 to Marta Kovacs',
        href: pathFor('deliveries', COMPANY.rapidRoute.name),
        read: false,
        createdAt: new Date('2026-09-07T15:10:00.000Z'),
      },
      {
        id: 'notice-2',
        companyId: COMPANY.rapidRoute.id,
        recipientRole: 'SEO',
        title: 'Delivery is overdue',
        body: 'DLV-1003 is still in transit past its ETA',
        href: pathFor('deliveries', COMPANY.rapidRoute.name),
        read: false,
        createdAt: new Date('2026-09-08T12:00:00.000Z'),
      },
      {
        id: 'notice-3',
        companyId: COMPANY.rapidRoute.id,
        recipientRole: 'Storekeeper',
        title: 'Goods waiting at the dock',
        body: 'Pallet jack restock is ready to receive into the warehouse',
        href: pathFor('warehouse', COMPANY.rapidRoute.name),
        read: false,
        createdAt: new Date('2026-09-09T09:05:00.000Z'),
      },
      {
        id: 'notice-4',
        companyId: COMPANY.vertex.id,
        recipientRole: 'Support',
        title: 'Support: Peak Storage',
        body: 'Priya Nair: Peak Storage paid the last invoice, but warehouse still shows the order waiting for stock.',
        href: `${pathFor('support', COMPANY.vertex.name)}?thread=support-thread-2`,
        read: false,
        createdAt: new Date('2026-09-17T08:40:00.000Z'),
      },
    ],
  });

  await prisma.activityEvent.createMany({
    data: [
      {
        id: 'activity-1',
        companyId: COMPANY.rapidRoute.id,
        entityType: 'order',
        entityId: 'order-rr-1',
        entityNumber: 'ORD-1001',
        message: 'Order created',
        actorId: '9',
        actorName: 'Owen Blake',
        createdAt: new Date('2026-09-07T15:10:00.000Z'),
      },
      {
        id: 'activity-2',
        companyId: COMPANY.rapidRoute.id,
        entityType: 'order',
        entityId: 'order-rr-2',
        entityNumber: 'ORD-1002',
        message: 'Order created with a stock shortage',
        actorId: '9',
        actorName: 'Owen Blake',
        createdAt: new Date('2026-09-08T08:40:00.000Z'),
      },
      {
        id: 'activity-3',
        companyId: COMPANY.rapidRoute.id,
        entityType: 'order',
        entityId: 'order-rr-2',
        entityNumber: 'ORD-1002',
        message: 'Marked as paid',
        actorId: '8',
        actorName: 'Maya Singh',
        createdAt: new Date('2026-09-08T10:15:00.000Z'),
      },
      {
        id: 'activity-4',
        companyId: COMPANY.rapidRoute.id,
        entityType: 'delivery',
        entityId: 'delivery-rr-1',
        entityNumber: 'DLV-1001',
        message: 'Scheduled for Liam Brooks',
        actorId: '9',
        actorName: 'Owen Blake',
        createdAt: new Date('2026-09-07T15:10:00.000Z'),
      },
      {
        id: 'activity-5',
        companyId: COMPANY.rapidRoute.id,
        entityType: 'delivery',
        entityId: 'delivery-rr-3',
        entityNumber: 'DLV-1003',
        message: 'Marked in transit, stock written off',
        actorId: '5',
        actorName: 'Liam Brooks',
        createdAt: new Date('2026-09-08T06:00:00.000Z'),
      },
      {
        id: 'activity-6',
        companyId: COMPANY.rapidRoute.id,
        entityType: 'restock',
        entityId: 'restock-2',
        entityNumber: 'RR-JCK-006',
        message: 'Supplier delivery arrived at the dock',
        actorId: '15',
        actorName: 'Harper Quinn',
        createdAt: new Date('2026-09-09T09:00:00.000Z'),
      },
    ],
  });

  await prisma.supportThread.create({
    data: {
      id: 'support-thread-1',
      companyId: COMPANY.rapidRoute.id,
      requesterId: '9',
      requesterName: 'Owen Blake',
      requesterRole: 'Staff',
      supportLastReadAt: new Date('2026-09-16T11:20:00.000Z'),
      requesterLastReadAt: new Date('2026-09-16T11:20:00.000Z'),
      createdAt: new Date('2026-09-16T10:12:00.000Z'),
      updatedAt: new Date('2026-09-16T11:18:00.000Z'),
      messages: {
        create: [
          {
            id: 'support-msg-1',
            authorId: '9',
            authorName: 'Owen Blake',
            authorRole: 'Staff',
            body: "City van 01 is at the RapidRoute gate but yesterday's dock code does not work. Can Support reset it so Liam can unload?",
            createdAt: new Date('2026-09-16T10:12:00.000Z'),
          },
          {
            id: 'support-msg-2',
            authorId: '21',
            authorName: 'Lena Ortiz',
            authorRole: 'Support',
            body: 'Reset the dock code and emailed it to Owen. If the gate is still closed, ask Marta at dock 4.',
            createdAt: new Date('2026-09-16T11:18:00.000Z'),
          },
        ],
      },
    },
  });

  await prisma.supportThread.create({
    data: {
      id: 'support-thread-2',
      companyId: COMPANY.peakStorage.id,
      requesterId: '14',
      requesterName: 'Priya Nair',
      requesterRole: 'Staff',
      requesterLastReadAt: new Date('2026-09-17T08:40:00.000Z'),
      createdAt: new Date('2026-09-17T08:40:00.000Z'),
      updatedAt: new Date('2026-09-17T08:40:00.000Z'),
      messages: {
        create: [
          {
            id: 'support-msg-3',
            authorId: '14',
            authorName: 'Priya Nair',
            authorRole: 'Staff',
            body: 'Peak Storage paid the last invoice, but warehouse still shows the order waiting for stock. Can you check the reservation?',
            createdAt: new Date('2026-09-17T08:40:00.000Z'),
          },
        ],
      },
    },
  });

  console.log(
    `Seeded frontend dummy data. ${usersSeed.length} users, password: ${SEED_PASSWORD}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
