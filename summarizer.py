from typing import List, Dict


class ChatSummarizer:
    """채팅 내용 요약 클래스"""

    @staticmethod
    def summarize(messages: List[Dict], max_sentences: int = 5) -> str:
        """
        메시지 목록을 요약합니다.

        Args:
            messages: 메시지 리스트
            max_sentences: 요약 문장 수

        Returns:
            요약된 텍스트
        """
        if not messages:
            return "메시지가 없습니다."

        # 메시지를 시간순으로 정렬
        sorted_messages = sorted(messages, key=lambda x: x.get("date", ""))

        # 전체 텍스트 합치기
        full_text = "\n".join([msg.get("text", "") for msg in sorted_messages])

        # 간단한 요약: 주요 주제 추출
        words = full_text.split()
        unique_words = list(dict.fromkeys(words))

        # 메시지 개수와 시간 범위 포함한 기본 요약
        summary = f"""
채팅 요약:
- 총 {len(messages)}개의 메시지
- 시간: {sorted_messages[0].get("date", "알 수 없음")} ~ {sorted_messages[-1].get("date", "알 수 없음")}
- 주요 내용: {", ".join(unique_words[:10])}

전체 내용:
{full_text[:500]}{'...' if len(full_text) > 500 else ''}
        """
        return summary.strip()

    @staticmethod
    def extract_keywords(messages: List[Dict], top_n: int = 10) -> List[str]:
        """메시지에서 주요 키워드 추출"""
        if not messages:
            return []

        full_text = " ".join([msg.get("text", "") for msg in messages])
        words = full_text.split()

        # 단순 단어 빈도 계산
        word_count = {}
        for word in words:
            if len(word) > 3:  # 3글자 이상만
                word_count[word] = word_count.get(word, 0) + 1

        sorted_words = sorted(word_count.items(), key=lambda x: x[1], reverse=True)
        return [word for word, count in sorted_words[:top_n]]
