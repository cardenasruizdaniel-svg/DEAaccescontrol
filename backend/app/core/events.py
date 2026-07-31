from collections.abc import Callable
from typing import Any

from asyncio import Queue


class EventBus:
    def __init__(self) -> None:
        self._handlers: dict[str, list[Callable]] = {}
        self._queue: Queue = Queue()

    def subscribe(self, event_name: str, handler: Callable) -> None:
        if event_name not in self._handlers:
            self._handlers[event_name] = []
        self._handlers[event_name].append(handler)

    async def publish(self, event_name: str, data: Any = None) -> None:
        handlers = self._handlers.get(event_name, [])
        for handler in handlers:
            if data is not None:
                await handler(data)
            else:
                await handler()

    def unsubscribe(self, event_name: str, handler: Callable) -> None:
        if event_name in self._handlers:
            self._handlers[event_name].remove(handler)


event_bus = EventBus()
