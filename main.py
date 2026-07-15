#!/usr/bin/env python3
"""
텔레그램 채팅 요약 MCP 서버

사용법:
1. .env 파일에 설정 추가:
   TELEGRAM_API_ID=<YOUR_API_ID>
   TELEGRAM_API_HASH=<YOUR_API_HASH>
   TELEGRAM_PHONE=+1234567890

2. 서버 실행:
   python main.py
"""

import json
import sys
import asyncio
from typing import Any, Dict
from telegram_client import TelegramChatClient
from summarizer import ChatSummarizer
from config import get_settings

# 전역 클라이언트 인스턴스
telegram_client = None
summarizer = ChatSummarizer()


class MCPServer:
    """MCP 서버 구현"""

    def __init__(self):
        self.tools = {
            "get_chat_messages": {
                "description": "텔레그램 채팅방에서 메시지를 조회합니다",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "chat_id": {"type": "integer", "description": "채팅방 ID"},
                        "limit": {
                            "type": "integer",
                            "description": "조회할 메시지 수 (기본값: 100)",
                            "default": 100,
                        },
                    },
                    "required": ["chat_id"],
                },
            },
            "summarize_chat": {
                "description": "텔레그램 채팅방 내용을 요약합니다",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "chat_id": {"type": "integer", "description": "채팅방 ID"},
                        "limit": {
                            "type": "integer",
                            "description": "조회할 메시지 수 (기본값: 100)",
                            "default": 100,
                        },
                    },
                    "required": ["chat_id"],
                },
            },
            "get_chat_info": {
                "description": "텔레그램 채팅방 정보를 조회합니다",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "chat_id": {"type": "integer", "description": "채팅방 ID"}
                    },
                    "required": ["chat_id"],
                },
            },
        }

    async def handle_tool_call(self, tool_name: str, arguments: Dict) -> str:
        """도구 호출 처리"""
        global telegram_client

        try:
            if tool_name == "get_chat_messages":
                chat_id = arguments.get("chat_id")
                limit = arguments.get("limit", 100)

                if not telegram_client:
                    return json.dumps({"error": "텔레그램 클라이언트가 초기화되지 않았습니다"})

                messages = await telegram_client.get_chat_messages(chat_id, limit)
                return json.dumps({"success": True, "messages": messages})

            elif tool_name == "summarize_chat":
                chat_id = arguments.get("chat_id")
                limit = arguments.get("limit", 100)

                if not telegram_client:
                    return json.dumps({"error": "텔레그램 클라이언트가 초기화되지 않았습니다"})

                messages = await telegram_client.get_chat_messages(chat_id, limit)
                summary = summarizer.summarize(messages)
                keywords = summarizer.extract_keywords(messages)

                return json.dumps(
                    {
                        "success": True,
                        "summary": summary,
                        "keywords": keywords,
                        "message_count": len(messages),
                    }
                )

            elif tool_name == "get_chat_info":
                chat_id = arguments.get("chat_id")

                if not telegram_client:
                    return json.dumps({"error": "텔레그램 클라이언트가 초기화되지 않았습니다"})

                info = await telegram_client.get_chat_info(chat_id)
                return json.dumps({"success": True, "info": info})

            else:
                return json.dumps({"error": f"알 수 없는 도구: {tool_name}"})

        except Exception as e:
            return json.dumps({"error": str(e)})


async def initialize_telegram():
    """텔레그램 클라이언트 초기화"""
    global telegram_client

    try:
        settings = get_settings()
        telegram_client = TelegramChatClient(
            api_id=settings.TELEGRAM_API_ID,
            api_hash=settings.TELEGRAM_API_HASH,
            phone=settings.TELEGRAM_PHONE,
        )
        await telegram_client.connect()
        print("텔레그램이 정상적으로 연결되었습니다", file=sys.stderr)
    except Exception as e:
        print(f"텔레그램 연결 실패: {e}", file=sys.stderr)
        sys.exit(1)


def process_message(server: MCPServer, message: Dict) -> Dict:
    """메시지 처리"""
    method = message.get("method")
    params = message.get("params", {})

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "serverInfo": {
                    "name": "telegram-chat-summary-mcp",
                    "version": "0.1.0",
                },
            },
        }

    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": {
                "tools": [
                    {"name": tool_name, **tool_info}
                    for tool_name, tool_info in server.tools.items()
                ]
            },
        }

    elif method == "tools/call":
        # 비동기 작업을 동기로 처리하기 위해 asyncio 루프 사용
        tool_name = params.get("name")
        arguments = params.get("arguments", {})

        # 기존 루프가 있으면 사용, 없으면 새로 생성
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        result = loop.run_until_complete(
            server.handle_tool_call(tool_name, arguments)
        )

        return {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": {"content": [{"type": "text", "text": result}]},
        }

    else:
        return {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "error": {"code": -32601, "message": f"Method not found: {method}"},
        }


async def main():
    """메인 함수"""
    # 텔레그램 초기화
    await initialize_telegram()

    # MCP 서버 생성
    server = MCPServer()

    # 표준 입출력을 통해 메시지 처리
    try:
        while True:
            line = sys.stdin.readline()
            if not line:
                break

            try:
                message = json.loads(line)
                response = process_message(server, message)
                print(json.dumps(response))
                sys.stdout.flush()
            except json.JSONDecodeError as e:
                print(
                    json.dumps(
                        {
                            "jsonrpc": "2.0",
                            "error": {"code": -32700, "message": f"Parse error: {e}"},
                        }
                    )
                )
                sys.stdout.flush()
    except KeyboardInterrupt:
        pass
    finally:
        if telegram_client:
            await telegram_client.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
