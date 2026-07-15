from telethon import TelegramClient
from telethon.types import PeerChannel, PeerChat, PeerUser
from typing import List, Optional, Dict
import os


class TelegramChatClient:
    def __init__(self, api_id: int, api_hash: str, phone: str):
        self.api_id = api_id
        self.api_hash = api_hash
        self.phone = phone
        self.client = None
        self.session_file = f"session_{phone.replace('+', '')}"

    async def connect(self) -> bool:
        """텔레그램에 연결"""
        try:
            self.client = TelegramClient(self.session_file, self.api_id, self.api_hash)
            await self.client.start(phone=self.phone)
            return True
        except Exception as e:
            raise Exception(f"텔레그램 연결 실패: {e}")

    async def disconnect(self):
        """텔레그램 연결 해제"""
        if self.client:
            await self.client.disconnect()

    async def get_chat_messages(
        self, chat_id: int, limit: int = 100
    ) -> List[Dict]:
        """채팅방 메시지 조회"""
        if not self.client:
            raise Exception("텔레그램이 연결되지 않음")

        try:
            messages = []
            async for message in self.client.iter_messages(chat_id, limit=limit):
                if message.text:
                    messages.append(
                        {
                            "sender": message.sender_id,
                            "text": message.text,
                            "date": message.date.isoformat() if message.date else None,
                        }
                    )
            return list(reversed(messages))  # 오래된 순서로 정렬
        except Exception as e:
            raise Exception(f"메시지 조회 실패: {e}")

    async def get_chat_info(self, chat_id: int) -> Dict:
        """채팅방 정보 조회"""
        if not self.client:
            raise Exception("텔레그램이 연결되지 않음")

        try:
            entity = await self.client.get_entity(chat_id)
            return {
                "name": entity.title if hasattr(entity, "title") else str(entity),
                "type": type(entity).__name__,
            }
        except Exception as e:
            raise Exception(f"채팅방 정보 조회 실패: {e}")
