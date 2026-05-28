import json
from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from typing import Any

from seatflow.config import settings
from seatflow.core.logging.service_logger import ServiceLogger


class LLMResponseChunk:
    def __init__(
        self,
        content: str | None = None,
        done: bool = False,
        action: dict[str, Any] | None = None,
        usage: dict[str, int] | None = None,
    ) -> None:
        self.content = content
        self.done = done
        self.action = action
        self.usage = usage

    def to_sse(self) -> str:
        data = {"content": self.content, "done": self.done}
        if self.action:
            data["action"] = self.action
        if self.usage:
            data["usage"] = self.usage
        return f"data: {json.dumps(data)}\n\n"


class BaseLLMProvider(ABC):
    @abstractmethod
    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 500,
        temperature: float = 0.3,
    ) -> AsyncGenerator[LLMResponseChunk, None]:
        pass


class OpenAIProvider(BaseLLMProvider):
    def __init__(self) -> None:
        from openai import AsyncOpenAI

        self.client = AsyncOpenAI(
            api_key=settings.chat_llm_api_key or "ollama",
            base_url=settings.chat_llm_base_url,
        )
        self.model = settings.chat_llm_model

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 500,
        temperature: float = 0.3,
    ) -> AsyncGenerator[LLMResponseChunk, None]:
        ServiceLogger.log_external(
            service="OpenAI",
            operation="stream_chat",
            model=self.model,
            message_count=len(messages),
        )

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )

        total_tokens = 0
        async for chunk in stream:
            if chunk.usage:
                total_tokens = chunk.usage.total_tokens or 0

            delta = chunk.choices[0].delta if chunk.choices else None

            if delta and delta.content:
                yield LLMResponseChunk(content=delta.content)

            if chunk.choices and chunk.choices[0].finish_reason == "stop":
                yield LLMResponseChunk(done=True, usage={"total_tokens": total_tokens})


class AnthropicProvider(BaseLLMProvider):
    def __init__(self) -> None:
        import anthropic

        self.client = anthropic.AsyncAnthropic(api_key=settings.chat_llm_api_key)
        self.model = settings.chat_llm_model

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 500,
        temperature: float = 0.3,
    ) -> AsyncGenerator[LLMResponseChunk, None]:
        system_msg = ""
        chat_messages = []
        for m in messages:
            if m["role"] == "system":
                system_msg = m["content"]
            else:
                chat_messages.append(m)

        async with self.client.messages.stream(
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_msg,
            messages=chat_messages,
        ) as stream:
            async for text in stream.text_stream:
                yield LLMResponseChunk(content=text)

            message = await stream.get_final_message()
            yield LLMResponseChunk(
                done=True,
                usage={
                    "total_tokens": (message.usage.input_tokens or 0)
                    + (message.usage.output_tokens or 0)
                },
            )


class MockLLMProvider(BaseLLMProvider):
    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 500,
        temperature: float = 0.3,
    ) -> AsyncGenerator[LLMResponseChunk, None]:
        import asyncio

        user_message = messages[-1]["content"] if messages else ""

        mock_response = (
            f"I'm the SeatFlow assistant. You asked: '{user_message}'. "
            "In development mode, I can't provide real AI responses. "
            "Configure SEATFLOW_CHAT_LLM_API_KEY to enable real responses."
        )

        words = mock_response.split(" ")
        for i, word in enumerate(words):
            await asyncio.sleep(0.03)
            yield LLMResponseChunk(content=word + (" " if i < len(words) - 1 else ""))

        yield LLMResponseChunk(done=True, usage={"total_tokens": len(mock_response.split())})


def get_llm_provider() -> BaseLLMProvider:
    if not settings.chat_enabled:
        raise RuntimeError("Chat is disabled in configuration")

    if not settings.chat_llm_api_key and settings.chat_llm_provider != "ollama":
        ServiceLogger.log(
            service="ChatService",
            operation="get_llm_provider",
            level="warning",
            message="No API key configured, using mock provider",
        )
        return MockLLMProvider()

    providers = {
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
        "ollama": OpenAIProvider,
    }

    provider_class = providers.get(settings.chat_llm_provider)
    if not provider_class:
        raise ValueError(f"Unknown LLM provider: {settings.chat_llm_provider}")

    return provider_class()