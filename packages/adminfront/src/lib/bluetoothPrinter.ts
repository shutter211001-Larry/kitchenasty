/**
 * Bluetooth Printer Utility for Offline Kitchen Order Tickets (KOT)
 * Uses Web Bluetooth API to communicate with ESC/POS compatible thermal printers.
 */

export class BluetoothPrinter {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async connect() {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not supported in this browser.');
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // Typical ESC/POS service UUID
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      const server = await this.device.gatt?.connect();
      if (!server) throw new Error('Could not connect to GATT server');

      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      
      return true;
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      throw error;
    }
  }

  async print(text: string) {
    if (!this.characteristic) {
      throw new Error('Printer not connected. Call connect() first.');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(text + '\n\n\n'); // Add some padding

    // Split data into chunks if needed (some printers limit chunk size)
    const CHUNK_SIZE = 512;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      await this.characteristic.writeValue(chunk);
    }
  }

  async printKOT(order: any) {
    // Basic ESC/POS formatting (simplified for text-only mode)
    // Real ESC/POS would use byte commands for bold/size.
    const date = new Date().toLocaleString('zh-TW');
    const header = `--- KITCHEN ORDER TICKET ---\n`;
    const orderInfo = `Order #: ${order.orderNumber || 'OFFLINE'}\nType: ${order.orderType}\nDate: ${date}\n`;
    const line = `----------------------------\n`;
    
    let itemsStr = '';
    for (const item of order.items || []) {
      itemsStr += `${item.quantity}x ${item.name || item.menuItem?.name}\n`;
      if (item.options && item.options.length > 0) {
        for (const opt of item.options) {
          itemsStr += `   - ${opt.name}: ${opt.value}\n`;
        }
      }
      if (item.comment) {
        itemsStr += `   * Note: ${item.comment}\n`;
      }
    }
    
    const footer = `\n--- END OF TICKET ---\n`;
    
    const fullText = header + orderInfo + line + itemsStr + line + footer;
    
    await this.print(fullText);
  }

  disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
  }
}

export const printer = new BluetoothPrinter();
