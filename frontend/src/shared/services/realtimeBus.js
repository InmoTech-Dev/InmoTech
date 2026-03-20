const subscribers = new Map();

const toSet = (eventName) => {
  if (!subscribers.has(eventName)) {
    subscribers.set(eventName, new Set());
  }
  return subscribers.get(eventName);
};

export const realtimeBus = {
  on(eventName, handler) {
    if (typeof handler !== 'function') return () => {};
    const handlers = toSet(eventName);
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        subscribers.delete(eventName);
      }
    };
  },

  emit(eventName, payload) {
    const handlers = subscribers.get(eventName);
    if (!handlers || handlers.size === 0) return;
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error('[REALTIME][BUS] Handler error:', eventName, error);
      }
    });
  },
};

export default realtimeBus;
