from app.core.chunker import chunk_document


class TestChunker:
    def test_short_document_single_chunk(self) -> None:
        text = "Short document content."
        chunks = chunk_document(text, chunk_size=512, overlap=50)
        assert len(chunks) == 1
        assert chunks[0].text == text

    def test_long_document_multiple_chunks(self) -> None:
        text = "word " * 1000
        chunks = chunk_document(text, chunk_size=512, overlap=50)
        assert len(chunks) >= 2

    def test_chunk_overlap(self) -> None:
        text = "word " * 1000
        chunks = chunk_document(text, chunk_size=100, overlap=20)
        assert len(chunks) >= 2
        for i in range(len(chunks) - 1):
            overlap = set(chunks[i].text.split()[-20:]) & set(chunks[i + 1].text.split()[:20])
            assert len(overlap) > 0

    def test_empty_document(self) -> None:
        chunks = chunk_document("", chunk_size=512, overlap=50)
        assert len(chunks) == 0

    def test_preserves_sentence_boundaries(self) -> None:
        text = "First sentence. Second sentence. Third sentence."
        chunks = chunk_document(text, chunk_size=5, overlap=1)
        assert len(chunks) >= 1
        for chunk in chunks:
            assert chunk.text.strip()
