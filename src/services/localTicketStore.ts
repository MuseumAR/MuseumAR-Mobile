import * as FileSystem from 'expo-file-system/legacy';
import { CreateOrderResponse, MyTicketDto } from './apiService';

const TICKETS_PATH = FileSystem.documentDirectory + 'local_tickets_v1.json';

export type LocalCreateTicketInput = {
  ticketTypeId: number;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  museumId?: number | null;
  museumName?: string;
  visitDate?: string;
};

const SEED_TICKETS: MyTicketDto[] = [
  {
    id: 1,
    orderId: 1001,
    ticketCode: 'MOCK-SEED-001',
    ticketTypeId: 1,
    ticketTypeName: 'Vé người lớn',
    museumId: 1,
    museumName: 'Bảo tàng Lịch sử',
    price: 50000,
    status: 'Valid',
    visitDate: new Date().toISOString().slice(0, 10),
    purchasedAt: new Date().toISOString(),
  },
];

async function readTickets(): Promise<MyTicketDto[]> {
  try {
    const info = await FileSystem.getInfoAsync(TICKETS_PATH);
    if (!info.exists) {
      await FileSystem.writeAsStringAsync(TICKETS_PATH, JSON.stringify(SEED_TICKETS));
      return [...SEED_TICKETS];
    }
    const raw = await FileSystem.readAsStringAsync(TICKETS_PATH);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MyTicketDto[]) : [...SEED_TICKETS];
  } catch {
    return [...SEED_TICKETS];
  }
}

async function writeTickets(list: MyTicketDto[]): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(TICKETS_PATH, JSON.stringify(list));
  } catch (error) {
    console.warn('localTicketStore write failed:', error);
  }
}

export async function loadLocalTickets(): Promise<MyTicketDto[]> {
  return readTickets();
}

function nextId(list: MyTicketDto[]): number {
  return list.reduce((max, t) => Math.max(max, t.id), 0) + 1;
}

/** Tạo đơn + vé local trên thiết bị (không gọi API). */
export async function createLocalOrder(
  input: LocalCreateTicketInput,
): Promise<{ order: CreateOrderResponse; tickets: MyTicketDto[] }> {
  const list = await readTickets();
  const orderId = 1000 + nextId(list);
  const orderCode = `LOC-${Date.now().toString(36).toUpperCase()}`;
  const qty = Math.max(1, Math.floor(input.quantity));
  const created: MyTicketDto[] = [];

  for (let i = 0; i < qty; i += 1) {
    const id = nextId([...list, ...created]);
    created.push({
      id,
      orderId,
      ticketCode: `${orderCode}-${String(i + 1).padStart(2, '0')}`,
      ticketTypeId: input.ticketTypeId,
      ticketTypeName: input.ticketTypeName,
      museumId: input.museumId ?? undefined,
      museumName: input.museumName,
      price: input.unitPrice,
      status: 'Valid',
      visitDate: input.visitDate,
      purchasedAt: new Date().toISOString(),
    });
  }

  const next = [...created, ...list];
  await writeTickets(next);

  return {
    order: {
      orderId,
      orderCode,
      totalAmount: input.unitPrice * qty,
      status: 'Paid',
      tickets: created.map((t) => ({
        id: t.id,
        ticketCode: t.ticketCode,
        ticketTypeId: t.ticketTypeId,
        ticketTypeName: t.ticketTypeName,
        status: t.status,
      })),
    },
    tickets: next,
  };
}
